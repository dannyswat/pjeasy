package projects

import (
	"gorm.io/gorm"
)

type ProjectRepository struct {
	db *gorm.DB
}

func NewProjectRepository(db *gorm.DB) *ProjectRepository {
	return &ProjectRepository{db: db}
}

// Create creates a new project
func (r *ProjectRepository) Create(project *Project) error {
	return r.db.Create(project).Error
}

// GetByID finds a project by ID
func (r *ProjectRepository) GetByID(id int) (*Project, error) {
	var project Project
	err := r.db.First(&project, id).Error
	if err == gorm.ErrRecordNotFound {
		return nil, nil
	}
	return &project, err
}

// Update updates a project
func (r *ProjectRepository) Update(project *Project) error {
	return r.db.Save(project).Error
}

// Delete deletes a project
func (r *ProjectRepository) Delete(id int) error {
	return r.db.Delete(&Project{}, id).Error
}

// GetAll returns all projects with optional filters
func (r *ProjectRepository) GetAll(includeArchived bool, offset, limit int) ([]Project, int64, error) {
	var projects []Project
	var total int64

	query := r.db.Model(&Project{})

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

	query := r.db.Model(&Project{}).
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
	return r.db.Model(&Project{}).
		Where("id = ?", id).
		Updates(map[string]interface{}{
			"is_archived": true,
			"archived_at": gorm.Expr("NOW()"),
		}).Error
}

// Unarchive unarchives a project
func (r *ProjectRepository) Unarchive(id int) error {
	return r.db.Model(&Project{}).
		Where("id = ?", id).
		Updates(map[string]interface{}{
			"is_archived": false,
			"archived_at": nil,
		}).Error
}
