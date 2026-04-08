package releases

import (
	"github.com/dannyswat/pjeasy/internal/repositories"
	"gorm.io/gorm"
)

type ReleaseRepository struct {
	uow *repositories.UnitOfWork
}

func NewReleaseRepository(uow *repositories.UnitOfWork) *ReleaseRepository {
	return &ReleaseRepository{uow: uow}
}

// Create creates a new release
func (r *ReleaseRepository) Create(release *Release) error {
	return r.uow.GetDB().Create(release).Error
}

// GetByID finds a release by ID
func (r *ReleaseRepository) GetByID(id int) (*Release, error) {
	var release Release
	err := r.uow.GetDB().First(&release, id).Error
	if err == gorm.ErrRecordNotFound {
		return nil, nil
	}
	return &release, err
}

// Update updates a release
func (r *ReleaseRepository) Update(release *Release) error {
	return r.uow.GetDB().Save(release).Error
}

// Delete deletes a release
func (r *ReleaseRepository) Delete(id int) error {
	return r.uow.GetDB().Delete(&Release{}, id).Error
}

// GetByProjectID returns all releases for a project with pagination
func (r *ReleaseRepository) GetByProjectID(projectID int, offset, limit int) ([]Release, int64, error) {
	var releases []Release
	var total int64

	query := r.uow.GetDB().Model(&Release{}).Where("project_id = ?", projectID)

	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	err := query.Order("created_at DESC").
		Offset(offset).
		Limit(limit).
		Find(&releases).Error

	return releases, total, err
}

// GetByProjectIDAndStatus returns releases filtered by status with pagination
func (r *ReleaseRepository) GetByProjectIDAndStatus(projectID int, status string, offset, limit int) ([]Release, int64, error) {
	var releases []Release
	var total int64

	query := r.uow.GetDB().Model(&Release{}).
		Where("project_id = ? AND status = ?", projectID, status)

	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	err := query.Order("created_at DESC").
		Offset(offset).
		Limit(limit).
		Find(&releases).Error

	return releases, total, err
}

// GetByProjectIDAndStatuses returns releases filtered by multiple statuses with pagination
func (r *ReleaseRepository) GetByProjectIDAndStatuses(projectID int, statuses []string, offset, limit int) ([]Release, int64, error) {
	var releases []Release
	var total int64

	query := r.uow.GetDB().Model(&Release{}).
		Where("project_id = ? AND status IN ?", projectID, statuses)

	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	err := query.Order("created_at DESC").
		Offset(offset).
		Limit(limit).
		Find(&releases).Error

	return releases, total, err
}

// UpdateStatus updates only the status of a release
func (r *ReleaseRepository) UpdateStatus(id int, status string) error {
	return r.uow.GetDB().Model(&Release{}).
		Where("id = ?", id).
		Update("status", status).Error
}
