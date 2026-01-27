package issues

import (
	"errors"
	"time"

	"github.com/dannyswat/pjeasy/internal/projects"
	"github.com/dannyswat/pjeasy/internal/repositories"
	"github.com/dannyswat/pjeasy/internal/sequences"
)

type IssueService struct {
	issueRepo    *IssueRepository
	memberRepo   *projects.ProjectMemberRepository
	projectRepo  *projects.ProjectRepository
	sequenceRepo *sequences.SequenceRepository
	uowFactory   *repositories.UnitOfWorkFactory
}

func NewIssueService(issueRepo *IssueRepository, memberRepo *projects.ProjectMemberRepository, projectRepo *projects.ProjectRepository, sequenceRepo *sequences.SequenceRepository, uowFactory *repositories.UnitOfWorkFactory) *IssueService {
	return &IssueService{
		issueRepo:    issueRepo,
		memberRepo:   memberRepo,
		projectRepo:  projectRepo,
		sequenceRepo: sequenceRepo,
		uowFactory:   uowFactory,
	}
}

// CreateIssue creates a new issue
func (s *IssueService) CreateIssue(projectID int, title, description string, priority string, assignedTo int, sprintID int, points int, itemType string, itemID *int, tags string, createdBy int) (*Issue, error) {
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

	// Validate priority
	if priority != "" && !IsValidPriority(priority) {
		return nil, errors.New("invalid priority")
	}
	if priority == "" {
		priority = IssuePriorityNormal
	}

	// Validate assignee is a member if provided
	if assignedTo > 0 {
		isAssigneeMember, err := s.memberRepo.IsUserMember(projectID, assignedTo)
		if err != nil {
			return nil, err
		}
		if !isAssigneeMember {
			return nil, errors.New("assignee is not a member of this project")
		}
	}

	uow := s.uowFactory.NewUnitOfWork()
	// Begin transaction to generate RefNum and create issue
	if err := uow.BeginTransaction(); err != nil {
		return nil, err
	}
	defer uow.RollbackTransactionIfError()

	// Generate reference number
	refNum, err := s.sequenceRepo.GetNextNumber(uow, projectID, "issues")
	if err != nil {
		uow.RollbackTransaction()
		return nil, err
	}

	now := time.Now()
	issue := &Issue{
		RefNum:      refNum,
		ProjectID:   projectID,
		Title:       title,
		Description: description,
		Status:      IssueStatusOpen,
		Priority:    priority,
		AssignedTo:  assignedTo,
		SprintID:    sprintID,
		Points:      points,
		ItemType:    itemType,
		ItemID:      itemID,
		Tags:        tags,
		CreatedBy:   createdBy,
		CreatedAt:   now,
		UpdatedAt:   now,
	}

	// Create a new repository instance with the transaction UOW
	txIssueRepo := NewIssueRepository(uow)
	if err := txIssueRepo.Create(issue); err != nil {
		uow.RollbackTransaction()
		return nil, err
	}

	if err := uow.CommitTransaction(); err != nil {
		return nil, err
	}

	return issue, nil
}

// UpdateIssue updates an issue's details
func (s *IssueService) UpdateIssue(issueID int, title, description string, priority string, assignedTo int, sprintID int, points int, tags string, updatedBy int) (*Issue, error) {
	issue, err := s.issueRepo.GetByID(issueID)
	if err != nil {
		return nil, err
	}
	if issue == nil {
		return nil, errors.New("issue not found")
	}

	// Check if user is a member or admin of the project
	isMember, err := s.memberRepo.IsUserMember(issue.ProjectID, updatedBy)
	if err != nil {
		return nil, err
	}
	if !isMember {
		return nil, errors.New("user is not a member of this project")
	}

	// Validate priority
	if priority != "" && !IsValidPriority(priority) {
		return nil, errors.New("invalid priority")
	}

	// Validate assignee is a member if provided
	if assignedTo > 0 {
		isAssigneeMember, err := s.memberRepo.IsUserMember(issue.ProjectID, assignedTo)
		if err != nil {
			return nil, err
		}
		if !isAssigneeMember {
			return nil, errors.New("assignee is not a member of this project")
		}
	}

	issue.Title = title
	issue.Description = description
	issue.Priority = priority
	issue.AssignedTo = assignedTo
	issue.SprintID = sprintID
	issue.Points = points
	issue.Tags = tags
	issue.UpdatedAt = time.Now()

	if err := s.issueRepo.Update(issue); err != nil {
		return nil, err
	}

	return issue, nil
}

// UpdateIssueStatus updates an issue's status
func (s *IssueService) UpdateIssueStatus(issueID int, status string, updatedBy int) (*Issue, error) {
	if !IsValidStatus(status) {
		return nil, errors.New("invalid status")
	}

	issue, err := s.issueRepo.GetByID(issueID)
	if err != nil {
		return nil, err
	}
	if issue == nil {
		return nil, errors.New("issue not found")
	}

	// Check if user is a member or admin of the project
	isMember, err := s.memberRepo.IsUserMember(issue.ProjectID, updatedBy)
	if err != nil {
		return nil, err
	}
	if !isMember {
		return nil, errors.New("user is not a member of this project")
	}

	if err := s.issueRepo.UpdateStatus(issueID, status); err != nil {
		return nil, err
	}

	// Reload issue to get updated status
	return s.issueRepo.GetByID(issueID)
}

// UpdateIssueAssignee updates an issue's assignee
func (s *IssueService) UpdateIssueAssignee(issueID int, assignedTo int, updatedBy int) (*Issue, error) {
	issue, err := s.issueRepo.GetByID(issueID)
	if err != nil {
		return nil, err
	}
	if issue == nil {
		return nil, errors.New("issue not found")
	}

	// Check if user is a member or admin of the project
	isMember, err := s.memberRepo.IsUserMember(issue.ProjectID, updatedBy)
	if err != nil {
		return nil, err
	}
	if !isMember {
		return nil, errors.New("user is not a member of this project")
	}

	// Validate assignee is a member if provided
	if assignedTo > 0 {
		isAssigneeMember, err := s.memberRepo.IsUserMember(issue.ProjectID, assignedTo)
		if err != nil {
			return nil, err
		}
		if !isAssigneeMember {
			return nil, errors.New("assignee is not a member of this project")
		}
	}

	if err := s.issueRepo.UpdateAssignee(issueID, assignedTo); err != nil {
		return nil, err
	}

	// Reload issue to get updated assignee
	return s.issueRepo.GetByID(issueID)
}

// DeleteIssue deletes an issue
func (s *IssueService) DeleteIssue(issueID int, deletedBy int) error {
	issue, err := s.issueRepo.GetByID(issueID)
	if err != nil {
		return err
	}
	if issue == nil {
		return errors.New("issue not found")
	}

	// Check if user is a member or admin of the project
	isMember, err := s.memberRepo.IsUserMember(issue.ProjectID, deletedBy)
	if err != nil {
		return err
	}
	if !isMember {
		return errors.New("user is not a member of this project")
	}

	return s.issueRepo.Delete(issueID)
}

// GetIssue retrieves a single issue
func (s *IssueService) GetIssue(issueID int, userID int) (*Issue, error) {
	issue, err := s.issueRepo.GetByID(issueID)
	if err != nil {
		return nil, err
	}
	if issue == nil {
		return nil, errors.New("issue not found")
	}

	// Check if user is a member of the project
	isMember, err := s.memberRepo.IsUserMember(issue.ProjectID, userID)
	if err != nil {
		return nil, err
	}
	if !isMember {
		return nil, errors.New("user is not a member of this project")
	}

	return issue, nil
}

// GetProjectIssues retrieves all issues for a project with pagination and optional filters
func (s *IssueService) GetProjectIssues(projectID int, status string, priority string, page, pageSize int, userID int) ([]Issue, int64, error) {
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

	var issues []Issue
	var total int64

	if status != "" {
		if !IsValidStatus(status) {
			return nil, 0, errors.New("invalid status")
		}
		issues, total, err = s.issueRepo.GetByProjectIDAndStatus(projectID, status, offset, pageSize)
	} else if priority != "" {
		if !IsValidPriority(priority) {
			return nil, 0, errors.New("invalid priority")
		}
		issues, total, err = s.issueRepo.GetByProjectIDAndPriority(projectID, priority, offset, pageSize)
	} else {
		issues, total, err = s.issueRepo.GetByProjectID(projectID, offset, pageSize)
	}

	if err != nil {
		return nil, 0, err
	}

	return issues, total, nil
}

// GetMyIssues retrieves all issues assigned to a user in a project with pagination
func (s *IssueService) GetMyIssues(projectID int, userID int, page, pageSize int) ([]Issue, int64, error) {
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
	return s.issueRepo.GetByProjectIDAndAssignee(projectID, userID, offset, pageSize)
}

// GetIssuesByAssignee retrieves issues assigned to a user in a project (limited)
func (s *IssueService) GetIssuesByAssignee(projectID int, userID int, limit int) ([]Issue, error) {
	return s.issueRepo.GetByProjectAndAssigneeLimited(projectID, userID, limit)
}

// GetIssuesByItemReference retrieves issues linked to a specific item (e.g., service-ticket) with pagination
func (s *IssueService) GetIssuesByItemReference(projectID int, itemType string, itemID int, page, pageSize int, userID int) ([]Issue, int64, error) {
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

	issues, total, err := s.issueRepo.GetByItemReference(projectID, itemType, itemID, offset, pageSize)
	if err != nil {
		return nil, 0, err
	}

	return issues, total, nil
}
