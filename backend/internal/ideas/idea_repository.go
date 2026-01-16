package ideas

import (
	"github.com/dannyswat/pjeasy/internal/repositories"
	"gorm.io/gorm"
)

type IdeaRepository struct {
	uow *repositories.UnitOfWork
}

func NewIdeaRepository(uow *repositories.UnitOfWork) *IdeaRepository {
	return &IdeaRepository{uow: uow}
}

// Create creates a new idea
func (r *IdeaRepository) Create(idea *Idea) error {
	return r.uow.GetDB().Create(idea).Error
}

// GetByID finds an idea by ID
func (r *IdeaRepository) GetByID(id int) (*Idea, error) {
	var idea Idea
	err := r.uow.GetDB().First(&idea, id).Error
	if err == gorm.ErrRecordNotFound {
		return nil, nil
	}
	return &idea, err
}

// Update updates an idea
func (r *IdeaRepository) Update(idea *Idea) error {
	return r.uow.GetDB().Save(idea).Error
}

// Delete deletes an idea
func (r *IdeaRepository) Delete(id int) error {
	return r.uow.GetDB().Delete(&Idea{}, id).Error
}

// GetByProjectID returns all ideas for a project with pagination
func (r *IdeaRepository) GetByProjectID(projectID int, offset, limit int) ([]Idea, int64, error) {
	var ideas []Idea
	var total int64

	query := r.uow.GetDB().Model(&Idea{}).Where("project_id = ?", projectID)

	// Get total count
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	// Get paginated results
	err := query.Order("created_at DESC").
		Offset(offset).
		Limit(limit).
		Find(&ideas).Error

	return ideas, total, err
}

// GetByProjectIDAndStatus returns ideas filtered by status with pagination
func (r *IdeaRepository) GetByProjectIDAndStatus(projectID int, status string, offset, limit int) ([]Idea, int64, error) {
	var ideas []Idea
	var total int64

	query := r.uow.GetDB().Model(&Idea{}).
		Where("project_id = ? AND status = ?", projectID, status)

	// Get total count
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	// Get paginated results
	err := query.Order("created_at DESC").
		Offset(offset).
		Limit(limit).
		Find(&ideas).Error

	return ideas, total, err
}

// UpdateStatus updates only the status of an idea
func (r *IdeaRepository) UpdateStatus(id int, status string) error {
	return r.uow.GetDB().Model(&Idea{}).
		Where("id = ?", id).
		Update("status", status).Error
}
