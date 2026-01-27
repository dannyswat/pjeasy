package features

import (
	"github.com/dannyswat/pjeasy/internal/repositories"
	"gorm.io/gorm"
)

type FeatureRepository struct {
	uow *repositories.UnitOfWork
}

func NewFeatureRepository(uow *repositories.UnitOfWork) *FeatureRepository {
	return &FeatureRepository{uow: uow}
}

// Create creates a new feature
func (r *FeatureRepository) Create(feature *Feature) error {
	return r.uow.GetDB().Create(feature).Error
}

// GetByID finds a feature by ID
func (r *FeatureRepository) GetByID(id int) (*Feature, error) {
	var feature Feature
	err := r.uow.GetDB().First(&feature, id).Error
	if err == gorm.ErrRecordNotFound {
		return nil, nil
	}
	return &feature, err
}

// Update updates a feature
func (r *FeatureRepository) Update(feature *Feature) error {
	return r.uow.GetDB().Save(feature).Error
}

// Delete deletes a feature
func (r *FeatureRepository) Delete(id int) error {
	return r.uow.GetDB().Delete(&Feature{}, id).Error
}

// GetByProjectID returns all features for a project with pagination
func (r *FeatureRepository) GetByProjectID(projectID int, offset, limit int) ([]Feature, int64, error) {
	var features []Feature
	var total int64

	query := r.uow.GetDB().Model(&Feature{}).Where("project_id = ?", projectID)

	// Get total count
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	// Get paginated results
	err := query.Order("created_at DESC").
		Offset(offset).
		Limit(limit).
		Find(&features).Error

	return features, total, err
}

// GetByProjectIDAndStatus returns features filtered by status with pagination
func (r *FeatureRepository) GetByProjectIDAndStatus(projectID int, status string, offset, limit int) ([]Feature, int64, error) {
	var features []Feature
	var total int64

	query := r.uow.GetDB().Model(&Feature{}).
		Where("project_id = ? AND status = ?", projectID, status)

	// Get total count
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	// Get paginated results
	err := query.Order("created_at DESC").
		Offset(offset).
		Limit(limit).
		Find(&features).Error

	return features, total, err
}

// GetByProjectIDAndPriority returns features filtered by priority with pagination
func (r *FeatureRepository) GetByProjectIDAndPriority(projectID int, priority string, offset, limit int) ([]Feature, int64, error) {
	var features []Feature
	var total int64

	query := r.uow.GetDB().Model(&Feature{}).
		Where("project_id = ? AND priority = ?", projectID, priority)

	// Get total count
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	// Get paginated results
	err := query.Order("created_at DESC").
		Offset(offset).
		Limit(limit).
		Find(&features).Error

	return features, total, err
}

// GetByProjectIDAndAssignee returns features filtered by assignee with pagination
func (r *FeatureRepository) GetByProjectIDAndAssignee(projectID int, assigneeId int, offset, limit int) ([]Feature, int64, error) {
	var features []Feature
	var total int64

	query := r.uow.GetDB().Model(&Feature{}).
		Where("project_id = ? AND assigned_to = ?", projectID, assigneeId)

	// Get total count
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	// Get paginated results
	err := query.Order("created_at DESC").
		Offset(offset).
		Limit(limit).
		Find(&features).Error

	return features, total, err
}

// UpdateStatus updates only the status of a feature
func (r *FeatureRepository) UpdateStatus(id int, status string) error {
	return r.uow.GetDB().Model(&Feature{}).
		Where("id = ?", id).
		Update("status", status).Error
}

// UpdateAssignee updates only the assignee of a feature
func (r *FeatureRepository) UpdateAssignee(id int, assigneeId int) error {
	return r.uow.GetDB().Model(&Feature{}).
		Where("id = ?", id).
		Update("assigned_to", assigneeId).Error
}

// GetMaxRefNumByProject returns the maximum ref_num for a project (for sequence generation)
func (r *FeatureRepository) GetMaxRefNumByProject(projectID int) (string, error) {
	var result struct {
		RefNum string
	}

	err := r.uow.GetDB().Model(&Feature{}).
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

// GetByItemReference returns features for a specific item (e.g., ideas) with pagination
func (r *FeatureRepository) GetByItemReference(projectID int, itemType string, itemID int, offset, limit int) ([]Feature, int64, error) {
	var features []Feature
	var total int64

	query := r.uow.GetDB().Model(&Feature{}).
		Where("project_id = ? AND item_type = ? AND item_id = ?", projectID, itemType, itemID)

	// Get total count
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	// Get paginated results
	err := query.Order("created_at DESC").
		Offset(offset).
		Limit(limit).
		Find(&features).Error

	return features, total, err
}

// GetByProjectAndAssigneeLimited returns features assigned to a user in a project (limited)
func (r *FeatureRepository) GetByProjectAndAssigneeLimited(projectID int, assigneeID int, limit int) ([]Feature, error) {
	var features []Feature

	err := r.uow.GetDB().Model(&Feature{}).
		Where("project_id = ? AND assigned_to = ? AND status NOT IN ?", projectID, assigneeID, []string{"Completed", "Closed"}).
		Order("CASE WHEN deadline IS NULL THEN 1 ELSE 0 END, deadline ASC, created_at DESC").
		Limit(limit).
		Find(&features).Error

	return features, err
}
