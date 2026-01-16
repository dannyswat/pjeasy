package projects

import (
	"github.com/dannyswat/pjeasy/internal/repositories"
	"gorm.io/gorm"
)

type ProjectRepository struct {
	uow *repositories.UnitOfWork
}

func NewProjectRepository(uow *repositories.UnitOfWork) *ProjectRepository {
	return &ProjectRepository{uow: uow}
}

// Create creates a new project
func (r *ProjectRepository) Create(project *Project) error {
	return r.uow.GetDB().Create(project).Error
}

// GetByID finds a project by ID
func (r *ProjectRepository) GetByID(id int) (*Project, error) {
	var project Project
	err := r.uow.GetDB().First(&project, id).Error
	if err == gorm.ErrRecordNotFound {
		return nil, nil
	}
	return &project, err
}

// Update updates a project
func (r *ProjectRepository) Update(project *Project) error {
	return r.uow.GetDB().Save(project).Error
}

// Delete deletes a project
func (r *ProjectRepository) Delete(id int) error {
	return r.uow.GetDB().Delete(&Project{}, id).Error
}

// GetAll returns all projects with optional filters
func (r *ProjectRepository) GetAll(includeArchived bool, offset, limit int) ([]Project, int64, error) {
	var projects []Project
	var total int64

	query := r.uow.GetDB().Model(&Project{})

	if !includeArchived {
		query = query.Where("is_archived = ?", false)
	}

	// Get total count
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	// Get paginated results
	err := query.Order("created_at DESC").
		Offset(offset).
		Limit(limit).
		Find(&projects).Error

	return projects, total, err
}

// GetByUserID returns all projects where user is a member
func (r *ProjectRepository) GetByUserID(userID int, includeArchived bool, offset, limit int) ([]Project, int64, error) {
	var projects []Project
	var total int64

	query := r.uow.GetDB().Model(&Project{}).
		Joins("JOIN project_members ON projects.id = project_members.project_id").
		Where("project_members.user_id = ?", userID)

	if !includeArchived {
		query = query.Where("projects.is_archived = ?", false)
	}

	// Get total count
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	// Get paginated results
	err := query.Order("projects.created_at DESC").
		Offset(offset).
		Limit(limit).
		Find(&projects).Error

	return projects, total, err
}

// Archive archives a project
func (r *ProjectRepository) Archive(id int) error {
	return r.uow.GetDB().Model(&Project{}).
		Where("id = ?", id).
		Updates(map[string]interface{}{
			"is_archived": true,
			"archived_at": gorm.Expr("NOW()"),
		}).Error
}

// Unarchive unarchives a project
func (r *ProjectRepository) Unarchive(id int) error {
	return r.uow.GetDB().Model(&Project{}).
		Where("id = ?", id).
		Updates(map[string]interface{}{
			"is_archived": false,
			"archived_at": nil,
		}).Error
}
