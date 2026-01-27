package features

import (
	"errors"
	"time"

	"github.com/dannyswat/pjeasy/internal/projects"
	"github.com/dannyswat/pjeasy/internal/repositories"
	"github.com/dannyswat/pjeasy/internal/sequences"
)

type FeatureService struct {
	featureRepo  *FeatureRepository
	memberRepo   *projects.ProjectMemberRepository
	projectRepo  *projects.ProjectRepository
	sequenceRepo *sequences.SequenceRepository
	uowFactory   *repositories.UnitOfWorkFactory
}

func NewFeatureService(featureRepo *FeatureRepository, memberRepo *projects.ProjectMemberRepository, projectRepo *projects.ProjectRepository, sequenceRepo *sequences.SequenceRepository, uowFactory *repositories.UnitOfWorkFactory) *FeatureService {
	return &FeatureService{
		featureRepo:  featureRepo,
		memberRepo:   memberRepo,
		projectRepo:  projectRepo,
		sequenceRepo: sequenceRepo,
		uowFactory:   uowFactory,
	}
}

// CreateFeature creates a new feature
func (s *FeatureService) CreateFeature(projectID int, title, description string, priority string, assignedTo int, sprintID int, points int, deadline *time.Time, itemType string, itemID *int, tags string, createdBy int) (*Feature, error) {
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
		priority = FeaturePriorityNormal
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
	// Begin transaction to generate RefNum and create feature
	if err := uow.BeginTransaction(); err != nil {
		return nil, err
	}
	defer uow.RollbackTransactionIfError()

	// Generate reference number
	refNum, err := s.sequenceRepo.GetNextNumber(uow, projectID, "features")
	if err != nil {
		uow.RollbackTransaction()
		return nil, err
	}

	now := time.Now()
	feature := &Feature{
		RefNum:      refNum,
		ProjectID:   projectID,
		Title:       title,
		Description: description,
		Status:      FeatureStatusOpen,
		Priority:    priority,
		AssignedTo:  assignedTo,
		SprintID:    sprintID,
		Points:      points,
		Deadline:    deadline,
		ItemType:    itemType,
		ItemID:      itemID,
		Tags:        tags,
		CreatedBy:   createdBy,
		CreatedAt:   now,
		UpdatedAt:   now,
	}

	// Create a new repository instance with the transaction UOW
	txFeatureRepo := NewFeatureRepository(uow)
	if err := txFeatureRepo.Create(feature); err != nil {
		uow.RollbackTransaction()
		return nil, err
	}

	if err := uow.CommitTransaction(); err != nil {
		return nil, err
	}

	return feature, nil
}

// UpdateFeature updates a feature's details
func (s *FeatureService) UpdateFeature(featureID int, title, description string, priority string, assignedTo int, sprintID int, points int, deadline *time.Time, tags string, updatedBy int) (*Feature, error) {
	feature, err := s.featureRepo.GetByID(featureID)
	if err != nil {
		return nil, err
	}
	if feature == nil {
		return nil, errors.New("feature not found")
	}

	// Check if user is a member or admin of the project
	isMember, err := s.memberRepo.IsUserMember(feature.ProjectID, updatedBy)
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
		isAssigneeMember, err := s.memberRepo.IsUserMember(feature.ProjectID, assignedTo)
		if err != nil {
			return nil, err
		}
		if !isAssigneeMember {
			return nil, errors.New("assignee is not a member of this project")
		}
	}

	feature.Title = title
	feature.Description = description
	feature.Priority = priority
	feature.AssignedTo = assignedTo
	feature.SprintID = sprintID
	feature.Points = points
	feature.Deadline = deadline
	feature.Tags = tags
	feature.UpdatedAt = time.Now()

	if err := s.featureRepo.Update(feature); err != nil {
		return nil, err
	}

	return feature, nil
}

// UpdateFeatureStatus updates a feature's status
func (s *FeatureService) UpdateFeatureStatus(featureID int, status string, updatedBy int) (*Feature, error) {
	if !IsValidStatus(status) {
		return nil, errors.New("invalid status")
	}

	feature, err := s.featureRepo.GetByID(featureID)
	if err != nil {
		return nil, err
	}
	if feature == nil {
		return nil, errors.New("feature not found")
	}

	// Check if user is a member or admin of the project
	isMember, err := s.memberRepo.IsUserMember(feature.ProjectID, updatedBy)
	if err != nil {
		return nil, err
	}
	if !isMember {
		return nil, errors.New("user is not a member of this project")
	}

	if err := s.featureRepo.UpdateStatus(featureID, status); err != nil {
		return nil, err
	}

	// Reload feature to get updated status
	return s.featureRepo.GetByID(featureID)
}

// UpdateFeatureAssignee updates a feature's assignee
func (s *FeatureService) UpdateFeatureAssignee(featureID int, assignedTo int, updatedBy int) (*Feature, error) {
	feature, err := s.featureRepo.GetByID(featureID)
	if err != nil {
		return nil, err
	}
	if feature == nil {
		return nil, errors.New("feature not found")
	}

	// Check if user is a member or admin of the project
	isMember, err := s.memberRepo.IsUserMember(feature.ProjectID, updatedBy)
	if err != nil {
		return nil, err
	}
	if !isMember {
		return nil, errors.New("user is not a member of this project")
	}

	// Validate assignee is a member if provided
	if assignedTo > 0 {
		isAssigneeMember, err := s.memberRepo.IsUserMember(feature.ProjectID, assignedTo)
		if err != nil {
			return nil, err
		}
		if !isAssigneeMember {
			return nil, errors.New("assignee is not a member of this project")
		}
	}

	if err := s.featureRepo.UpdateAssignee(featureID, assignedTo); err != nil {
		return nil, err
	}

	// Reload feature to get updated assignee
	return s.featureRepo.GetByID(featureID)
}

// DeleteFeature deletes a feature
func (s *FeatureService) DeleteFeature(featureID int, deletedBy int) error {
	feature, err := s.featureRepo.GetByID(featureID)
	if err != nil {
		return err
	}
	if feature == nil {
		return errors.New("feature not found")
	}

	// Check if user is a member or admin of the project
	isMember, err := s.memberRepo.IsUserMember(feature.ProjectID, deletedBy)
	if err != nil {
		return err
	}
	if !isMember {
		return errors.New("user is not a member of this project")
	}

	return s.featureRepo.Delete(featureID)
}

// GetFeature retrieves a feature by ID
func (s *FeatureService) GetFeature(featureID int, requestedBy int) (*Feature, error) {
	feature, err := s.featureRepo.GetByID(featureID)
	if err != nil {
		return nil, err
	}
	if feature == nil {
		return nil, errors.New("feature not found")
	}

	// Check if user is a member or admin of the project
	isMember, err := s.memberRepo.IsUserMember(feature.ProjectID, requestedBy)
	if err != nil {
		return nil, err
	}
	if !isMember {
		return nil, errors.New("user is not a member of this project")
	}

	return feature, nil
}

// GetProjectFeatures retrieves all features for a project with optional filters
func (s *FeatureService) GetProjectFeatures(projectID int, status, priority string, page, pageSize int, requestedBy int) ([]Feature, int64, error) {
	// Check if user is a member or admin of the project
	isMember, err := s.memberRepo.IsUserMember(projectID, requestedBy)
	if err != nil {
		return nil, 0, err
	}
	if !isMember {
		return nil, 0, errors.New("user is not a member of this project")
	}

	offset := (page - 1) * pageSize

	// Apply filters based on parameters
	if status != "" && priority != "" {
		// Both filters - need to combine manually
		return s.getFeaturesByStatusAndPriority(projectID, status, priority, offset, pageSize)
	} else if status != "" {
		return s.featureRepo.GetByProjectIDAndStatus(projectID, status, offset, pageSize)
	} else if priority != "" {
		return s.featureRepo.GetByProjectIDAndPriority(projectID, priority, offset, pageSize)
	}

	return s.featureRepo.GetByProjectID(projectID, offset, pageSize)
}

// getFeaturesByStatusAndPriority is a helper to filter by both status and priority
func (s *FeatureService) getFeaturesByStatusAndPriority(projectID int, status, priority string, offset, limit int) ([]Feature, int64, error) {
	var features []Feature
	var total int64

	query := s.featureRepo.uow.GetDB().Model(&Feature{}).
		Where("project_id = ? AND status = ? AND priority = ?", projectID, status, priority)

	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	err := query.Order("created_at DESC").
		Offset(offset).
		Limit(limit).
		Find(&features).Error

	return features, total, err
}

// GetMyFeatures retrieves features assigned to the user in a project
func (s *FeatureService) GetMyFeatures(projectID int, page, pageSize int, userID int) ([]Feature, int64, error) {
	// Check if user is a member or admin of the project
	isMember, err := s.memberRepo.IsUserMember(projectID, userID)
	if err != nil {
		return nil, 0, err
	}
	if !isMember {
		return nil, 0, errors.New("user is not a member of this project")
	}

	offset := (page - 1) * pageSize
	return s.featureRepo.GetByProjectIDAndAssignee(projectID, userID, offset, pageSize)
}

// GetFeaturesByAssignee retrieves features assigned to a user in a project (limited)
func (s *FeatureService) GetFeaturesByAssignee(projectID int, userID int, limit int) ([]Feature, error) {
	return s.featureRepo.GetByProjectAndAssigneeLimited(projectID, userID, limit)
}

// GetFeaturesByItemReference retrieves features related to a specific item
func (s *FeatureService) GetFeaturesByItemReference(projectID int, itemType string, itemID int, page, pageSize int, requestedBy int) ([]Feature, int64, error) {
	// Check if user is a member or admin of the project
	isMember, err := s.memberRepo.IsUserMember(projectID, requestedBy)
	if err != nil {
		return nil, 0, err
	}
	if !isMember {
		return nil, 0, errors.New("user is not a member of this project")
	}

	offset := (page - 1) * pageSize
	return s.featureRepo.GetByItemReference(projectID, itemType, itemID, offset, pageSize)
}
