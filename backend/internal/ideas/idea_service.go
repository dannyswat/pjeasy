package ideas

import (
	"errors"
	"time"

	"github.com/dannyswat/pjeasy/internal/projects"
	"github.com/dannyswat/pjeasy/internal/repositories"
	"github.com/dannyswat/pjeasy/internal/sequences"
)

type IdeaService struct {
	ideaRepo     *IdeaRepository
	memberRepo   *projects.ProjectMemberRepository
	projectRepo  *projects.ProjectRepository
	sequenceRepo *sequences.SequenceRepository
	uowFactory   *repositories.UnitOfWorkFactory
}

func NewIdeaService(ideaRepo *IdeaRepository, memberRepo *projects.ProjectMemberRepository, projectRepo *projects.ProjectRepository, sequenceRepo *sequences.SequenceRepository, uowFactory *repositories.UnitOfWorkFactory) *IdeaService {
	return &IdeaService{
		ideaRepo:     ideaRepo,
		memberRepo:   memberRepo,
		projectRepo:  projectRepo,
		sequenceRepo: sequenceRepo,
		uowFactory:   uowFactory,
	}
}

// CreateIdea creates a new idea
func (s *IdeaService) CreateIdea(projectID int, title, description, itemType string, itemID *int, tags string, createdBy int) (*Idea, error) {
	// Validate project exists
	project, err := s.projectRepo.GetByID(projectID)
	if err != nil {
		return nil, err
	}
	if project == nil {
		return nil, errors.New("project not found")
	}

	// Check if user is a member or admin of the project
	isMember, err := s.memberRepo.IsUserMember(projectID, createdBy)
	if err != nil {
		return nil, err
	}
	if !isMember {
		return nil, errors.New("user is not a member of this project")
	}

	uow := s.uowFactory.NewUnitOfWork()
	// Begin transaction to generate RefNum and create idea
	if err := uow.BeginTransaction(); err != nil {
		return nil, err
	}
	defer uow.RollbackTransactionIfError()

	// Generate reference number
	refNum, err := s.sequenceRepo.GetNextNumber(uow, projectID, "ideas")
	if err != nil {
		uow.RollbackTransaction()
		return nil, err
	}

	now := time.Now()
	idea := &Idea{
		RefNum:      refNum,
		ProjectID:   projectID,
		Title:       title,
		Description: description,
		Status:      IdeaStatusOpen,
		ItemType:    itemType,
		ItemID:      itemID,
		Tags:        tags,
		CreatedBy:   createdBy,
		CreatedAt:   now,
		UpdatedAt:   now,
	}

	// Create a new repository instance with the transaction UOW
	txIdeaRepo := NewIdeaRepository(uow)
	if err := txIdeaRepo.Create(idea); err != nil {
		uow.RollbackTransaction()
		return nil, err
	}

	if err := uow.CommitTransaction(); err != nil {
		return nil, err
	}

	return idea, nil
}

// UpdateIdea updates an idea's details
func (s *IdeaService) UpdateIdea(ideaID int, title, description, tags string, updatedBy int) (*Idea, error) {
	idea, err := s.ideaRepo.GetByID(ideaID)
	if err != nil {
		return nil, err
	}
	if idea == nil {
		return nil, errors.New("idea not found")
	}

	// Check if user is a member or admin of the project
	isMember, err := s.memberRepo.IsUserMember(idea.ProjectID, updatedBy)
	if err != nil {
		return nil, err
	}
	if !isMember {
		return nil, errors.New("user is not a member of this project")
	}

	idea.Title = title
	idea.Description = description
	idea.Tags = tags
	idea.UpdatedAt = time.Now()

	if err := s.ideaRepo.Update(idea); err != nil {
		return nil, err
	}

	return idea, nil
}

// UpdateIdeaStatus updates an idea's status
func (s *IdeaService) UpdateIdeaStatus(ideaID int, status string, updatedBy int) (*Idea, error) {
	if !IsValidStatus(status) {
		return nil, errors.New("invalid status")
	}

	idea, err := s.ideaRepo.GetByID(ideaID)
	if err != nil {
		return nil, err
	}
	if idea == nil {
		return nil, errors.New("idea not found")
	}

	// Check if user is a member or admin of the project
	isMember, err := s.memberRepo.IsUserMember(idea.ProjectID, updatedBy)
	if err != nil {
		return nil, err
	}
	if !isMember {
		return nil, errors.New("user is not a member of this project")
	}

	if err := s.ideaRepo.UpdateStatus(ideaID, status); err != nil {
		return nil, err
	}

	// Reload idea to get updated status
	return s.ideaRepo.GetByID(ideaID)
}

// DeleteIdea deletes an idea
func (s *IdeaService) DeleteIdea(ideaID int, deletedBy int) error {
	idea, err := s.ideaRepo.GetByID(ideaID)
	if err != nil {
		return err
	}
	if idea == nil {
		return errors.New("idea not found")
	}

	// Check if user is a member or admin of the project
	isMember, err := s.memberRepo.IsUserMember(idea.ProjectID, deletedBy)
	if err != nil {
		return err
	}
	if !isMember {
		return errors.New("user is not a member of this project")
	}

	return s.ideaRepo.Delete(ideaID)
}

// GetIdea retrieves a single idea
func (s *IdeaService) GetIdea(ideaID int, userID int) (*Idea, error) {
	idea, err := s.ideaRepo.GetByID(ideaID)
	if err != nil {
		return nil, err
	}
	if idea == nil {
		return nil, errors.New("idea not found")
	}

	// Check if user is a member of the project
	isMember, err := s.memberRepo.IsUserMember(idea.ProjectID, userID)
	if err != nil {
		return nil, err
	}
	if !isMember {
		return nil, errors.New("user is not a member of this project")
	}

	return idea, nil
}

// GetProjectIdeas retrieves all ideas for a project with pagination and optional status filter
func (s *IdeaService) GetProjectIdeas(projectID int, statuses []string, page, pageSize int, userID int) ([]Idea, int64, error) {
	// Validate project exists
	project, err := s.projectRepo.GetByID(projectID)
	if err != nil {
		return nil, 0, err
	}
	if project == nil {
		return nil, 0, errors.New("project not found")
	}

	// Check if user is a member of the project
	isMember, err := s.memberRepo.IsUserMember(projectID, userID)
	if err != nil {
		return nil, 0, err
	}
	if !isMember {
		return nil, 0, errors.New("user is not a member of this project")
	}

	offset := (page - 1) * pageSize

	var ideas []Idea
	var total int64

	if len(statuses) == 1 {
		// Single status
		if !IsValidStatus(statuses[0]) {
			return nil, 0, errors.New("invalid status")
		}
		ideas, total, err = s.ideaRepo.GetByProjectIDAndStatus(projectID, statuses[0], offset, pageSize)
	} else if len(statuses) > 1 {
		// Multiple statuses - validate each
		for _, status := range statuses {
			if !IsValidStatus(status) {
				return nil, 0, errors.New("invalid status: " + status)
			}
		}
		ideas, total, err = s.ideaRepo.GetByProjectIDAndStatuses(projectID, statuses, offset, pageSize)
	} else {
		ideas, total, err = s.ideaRepo.GetByProjectID(projectID, offset, pageSize)
	}

	if err != nil {
		return nil, 0, err
	}

	return ideas, total, nil
}

// GetIdeasByItemReference retrieves ideas linked to a specific item (e.g., service-ticket) with pagination
func (s *IdeaService) GetIdeasByItemReference(projectID int, itemType string, itemID int, page, pageSize int, userID int) ([]Idea, int64, error) {
	// Validate project exists
	project, err := s.projectRepo.GetByID(projectID)
	if err != nil {
		return nil, 0, err
	}
	if project == nil {
		return nil, 0, errors.New("project not found")
	}

	// Check if user is a member of the project
	isMember, err := s.memberRepo.IsUserMember(projectID, userID)
	if err != nil {
		return nil, 0, err
	}
	if !isMember {
		return nil, 0, errors.New("user is not a member of this project")
	}

	offset := (page - 1) * pageSize

	ideas, total, err := s.ideaRepo.GetByItemReference(projectID, itemType, itemID, offset, pageSize)
	if err != nil {
		return nil, 0, err
	}

	return ideas, total, nil
}
