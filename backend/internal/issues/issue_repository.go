package issues

import (
	"github.com/dannyswat/pjeasy/internal/repositories"
	"gorm.io/gorm"
)

type IssueRepository struct {
	uow *repositories.UnitOfWork
}

func NewIssueRepository(uow *repositories.UnitOfWork) *IssueRepository {
	return &IssueRepository{uow: uow}
}

// Create creates a new issue
func (r *IssueRepository) Create(issue *Issue) error {
	return r.uow.GetDB().Create(issue).Error
}

// GetByID finds an issue by ID
func (r *IssueRepository) GetByID(id int) (*Issue, error) {
	var issue Issue
	err := r.uow.GetDB().First(&issue, id).Error
	if err == gorm.ErrRecordNotFound {
		return nil, nil
	}
	return &issue, err
}

// Update updates an issue
func (r *IssueRepository) Update(issue *Issue) error {
	return r.uow.GetDB().Save(issue).Error
}

// Delete deletes an issue
func (r *IssueRepository) Delete(id int) error {
	return r.uow.GetDB().Delete(&Issue{}, id).Error
}

// GetByProjectID returns all issues for a project with pagination
func (r *IssueRepository) GetByProjectID(projectID int, offset, limit int) ([]Issue, int64, error) {
	var issues []Issue
	var total int64

	query := r.uow.GetDB().Model(&Issue{}).Where("project_id = ?", projectID)

	// Get total count
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	// Get paginated results
	err := query.Order("created_at DESC").
		Offset(offset).
		Limit(limit).
		Find(&issues).Error

	return issues, total, err
}

// GetByProjectIDAndStatus returns issues filtered by status with pagination
func (r *IssueRepository) GetByProjectIDAndStatus(projectID int, status string, offset, limit int) ([]Issue, int64, error) {
	var issues []Issue
	var total int64

	query := r.uow.GetDB().Model(&Issue{}).
		Where("project_id = ? AND status = ?", projectID, status)

	// Get total count
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	// Get paginated results
	err := query.Order("created_at DESC").
		Offset(offset).
		Limit(limit).
		Find(&issues).Error

	return issues, total, err
}

// GetByProjectIDAndPriority returns issues filtered by priority with pagination
func (r *IssueRepository) GetByProjectIDAndPriority(projectID int, priority string, offset, limit int) ([]Issue, int64, error) {
	var issues []Issue
	var total int64

	query := r.uow.GetDB().Model(&Issue{}).
		Where("project_id = ? AND priority = ?", projectID, priority)

	// Get total count
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	// Get paginated results
	err := query.Order("created_at DESC").
		Offset(offset).
		Limit(limit).
		Find(&issues).Error

	return issues, total, err
}

// GetByProjectIDAndAssignee returns issues filtered by assignee with pagination
func (r *IssueRepository) GetByProjectIDAndAssignee(projectID int, assigneeId int, offset, limit int) ([]Issue, int64, error) {
	var issues []Issue
	var total int64

	query := r.uow.GetDB().Model(&Issue{}).
		Where("project_id = ? AND assigned_to = ?", projectID, assigneeId)

	// Get total count
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	// Get paginated results
	err := query.Order("created_at DESC").
		Offset(offset).
		Limit(limit).
		Find(&issues).Error

	return issues, total, err
}

// UpdateStatus updates only the status of an issue
func (r *IssueRepository) UpdateStatus(id int, status string) error {
	return r.uow.GetDB().Model(&Issue{}).
		Where("id = ?", id).
		Update("status", status).Error
}

// UpdateAssignee updates only the assignee of an issue
func (r *IssueRepository) UpdateAssignee(id int, assigneeId int) error {
	return r.uow.GetDB().Model(&Issue{}).
		Where("id = ?", id).
		Update("assigned_to", assigneeId).Error
}

// GetMaxRefNumByProject returns the maximum ref_num for a project (for sequence generation)
func (r *IssueRepository) GetMaxRefNumByProject(projectID int) (string, error) {
	var result struct {
		RefNum string
	}

	err := r.uow.GetDB().Model(&Issue{}).
		Select("ref_num").
		Where("project_id = ?", projectID).
		Order("ref_num DESC").
		Limit(1).
		Scan(&result).Error

	if err == gorm.ErrRecordNotFound {
		return "", nil
	}

	return result.RefNum, err
}

// GetByItemReference returns issues for a specific item (e.g., service-ticket) with pagination
func (r *IssueRepository) GetByItemReference(projectID int, itemType string, itemID int, offset, limit int) ([]Issue, int64, error) {
	var issues []Issue
	var total int64

	query := r.uow.GetDB().Model(&Issue{}).
		Where("project_id = ? AND item_type = ? AND item_id = ?", projectID, itemType, itemID)

	// Get total count
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	// Get paginated results
	err := query.Order("created_at DESC").
		Offset(offset).
		Limit(limit).
		Find(&issues).Error

	return issues, total, err
}

// GetByProjectAndAssigneeLimited returns issues assigned to a user in a project (limited)
func (r *IssueRepository) GetByProjectAndAssigneeLimited(projectID int, assigneeID int, limit int) ([]Issue, error) {
	var issues []Issue

	err := r.uow.GetDB().Model(&Issue{}).
		Where("project_id = ? AND assigned_to = ? AND status NOT IN ?", projectID, assigneeID, []string{"Resolved", "Closed"}).
		Order("created_at DESC").
		Limit(limit).
		Find(&issues).Error

	return issues, err
}
