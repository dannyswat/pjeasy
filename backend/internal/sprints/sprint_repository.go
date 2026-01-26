package sprints

import (
	"github.com/dannyswat/pjeasy/internal/repositories"
	"gorm.io/gorm"
)

type SprintRepository struct {
	uow *repositories.UnitOfWork
}

func NewSprintRepository(uow *repositories.UnitOfWork) *SprintRepository {
	return &SprintRepository{uow: uow}
}

// Create creates a new sprint
func (r *SprintRepository) Create(sprint *Sprint) error {
	return r.uow.GetDB().Create(sprint).Error
}

// GetByID finds a sprint by ID
func (r *SprintRepository) GetByID(id int) (*Sprint, error) {
	var sprint Sprint
	err := r.uow.GetDB().First(&sprint, id).Error
	if err == gorm.ErrRecordNotFound {
		return nil, nil
	}
	return &sprint, err
}

// Update updates a sprint
func (r *SprintRepository) Update(sprint *Sprint) error {
	return r.uow.GetDB().Save(sprint).Error
}

// Delete deletes a sprint
func (r *SprintRepository) Delete(id int) error {
	return r.uow.GetDB().Delete(&Sprint{}, id).Error
}

// GetByProjectID returns all sprints for a project with pagination
func (r *SprintRepository) GetByProjectID(projectID int, offset, limit int) ([]Sprint, int64, error) {
	var sprints []Sprint
	var total int64

	query := r.uow.GetDB().Model(&Sprint{}).Where("project_id = ?", projectID)

	// Get total count
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	// Get paginated results
	err := query.Order("created_at DESC").
		Offset(offset).
		Limit(limit).
		Find(&sprints).Error

	return sprints, total, err
}

// GetByProjectIDAndStatus returns sprints filtered by status
func (r *SprintRepository) GetByProjectIDAndStatus(projectID int, status string) ([]Sprint, error) {
	var sprints []Sprint

	err := r.uow.GetDB().Model(&Sprint{}).
		Where("project_id = ? AND status = ?", projectID, status).
		Order("created_at DESC").
		Find(&sprints).Error

	return sprints, err
}

// GetActiveSprintByProjectID returns the active sprint for a project (there should be only one)
func (r *SprintRepository) GetActiveSprintByProjectID(projectID int) (*Sprint, error) {
	var sprint Sprint
	err := r.uow.GetDB().
		Where("project_id = ? AND status = ?", projectID, SprintStatusActive).
		First(&sprint).Error
	if err == gorm.ErrRecordNotFound {
		return nil, nil
	}
	return &sprint, err
}

// HasActiveSprintForProject checks if a project already has an active sprint
func (r *SprintRepository) HasActiveSprintForProject(projectID int) (bool, error) {
	var count int64
	err := r.uow.GetDB().Model(&Sprint{}).
		Where("project_id = ? AND status = ?", projectID, SprintStatusActive).
		Count(&count).Error
	return count > 0, err
}

// UpdateStatus updates only the status of a sprint
func (r *SprintRepository) UpdateStatus(id int, status string) error {
	return r.uow.GetDB().Model(&Sprint{}).
		Where("id = ?", id).
		Update("status", status).Error
}
