package features

import (
	"strings"

	"github.com/dannyswat/pjeasy/internal/repositories"
	"gorm.io/gorm"
)

func applyFeatureSearch(query *gorm.DB, search string) *gorm.DB {
	trimmedSearch := strings.TrimSpace(search)
	if trimmedSearch == "" {
		return query
	}

	pattern := "%" + trimmedSearch + "%"
	return query.Where("features.title ILIKE ? OR features.ref_num ILIKE ?", pattern, pattern)
}

func applyFeatureDependencySelection(query *gorm.DB, dependencySelectable bool, selectedFeatureID *int, excludeFeatureID *int) *gorm.DB {
	if excludeFeatureID != nil {
		query = query.Where("id != ?", *excludeFeatureID)
	}

	if !dependencySelectable {
		return query
	}

	terminalStatuses := []string{FeatureStatusCompleted, FeatureStatusClosed}
	if selectedFeatureID != nil {
		return query.Where("status NOT IN ? OR id = ?", terminalStatuses, *selectedFeatureID)
	}

	return query.Where("status NOT IN ?", terminalStatuses)
}

type FeatureRepository struct {
	uow *repositories.UnitOfWork
}

func NewFeatureRepository(uow *repositories.UnitOfWork) *FeatureRepository {
	return &FeatureRepository{uow: uow}
}

func withFeatureLinkedIdeaLabel(query *gorm.DB) *gorm.DB {
	return query.
		Joins("LEFT JOIN ideas linked_ideas ON features.item_type = ? AND features.item_id = linked_ideas.id", "ideas").
		Select("features.*, linked_ideas.label AS linked_idea_label")
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

// HasDependents checks whether other features depend on the given feature.
func (r *FeatureRepository) HasDependents(featureID int) (bool, error) {
	var count int64
	err := r.uow.GetDB().Model(&Feature{}).
		Where("depends_on_feature_id = ?", featureID).
		Count(&count).Error
	return count > 0, err
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
func (r *FeatureRepository) GetByProjectID(projectID int, search string, offset, limit int) ([]Feature, int64, error) {
	var features []Feature
	var total int64

	query := applyFeatureSearch(r.uow.GetDB().Model(&Feature{}).Where("features.project_id = ?", projectID), search)

	// Get total count
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	// Get paginated results
	err := withFeatureLinkedIdeaLabel(applyFeatureSearch(r.uow.GetDB().Model(&Feature{}).Where("features.project_id = ?", projectID), search)).Order("features.created_at DESC").
		Offset(offset).
		Limit(limit).
		Find(&features).Error

	return features, total, err
}

// GetByProjectIDAndStatus returns features filtered by status with pagination
func (r *FeatureRepository) GetByProjectIDAndStatus(projectID int, status string, search string, offset, limit int) ([]Feature, int64, error) {
	var features []Feature
	var total int64

	query := applyFeatureSearch(
		r.uow.GetDB().Model(&Feature{}).
			Where("features.project_id = ? AND features.status = ?", projectID, status),
		search,
	)

	// Get total count
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	// Get paginated results
	err := withFeatureLinkedIdeaLabel(applyFeatureSearch(
		r.uow.GetDB().Model(&Feature{}).
			Where("features.project_id = ? AND features.status = ?", projectID, status),
		search,
	)).Order("features.created_at DESC").
		Offset(offset).
		Limit(limit).
		Find(&features).Error

	return features, total, err
}

// GetByProjectIDAndStatuses returns features filtered by multiple statuses with pagination
func (r *FeatureRepository) GetByProjectIDAndStatuses(projectID int, statuses []string, search string, offset, limit int) ([]Feature, int64, error) {
	var features []Feature
	var total int64

	query := applyFeatureSearch(
		r.uow.GetDB().Model(&Feature{}).
			Where("features.project_id = ? AND features.status IN ?", projectID, statuses),
		search,
	)

	// Get total count
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	// Get paginated results
	err := withFeatureLinkedIdeaLabel(applyFeatureSearch(
		r.uow.GetDB().Model(&Feature{}).
			Where("features.project_id = ? AND features.status IN ?", projectID, statuses),
		search,
	)).Order("features.created_at DESC").
		Offset(offset).
		Limit(limit).
		Find(&features).Error

	return features, total, err
}

// GetByProjectIDAndPriority returns features filtered by priority with pagination
func (r *FeatureRepository) GetByProjectIDAndPriority(projectID int, priority string, search string, offset, limit int) ([]Feature, int64, error) {
	var features []Feature
	var total int64

	query := applyFeatureSearch(
		r.uow.GetDB().Model(&Feature{}).
			Where("features.project_id = ? AND features.priority = ?", projectID, priority),
		search,
	)

	// Get total count
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	// Get paginated results
	err := withFeatureLinkedIdeaLabel(applyFeatureSearch(
		r.uow.GetDB().Model(&Feature{}).
			Where("features.project_id = ? AND features.priority = ?", projectID, priority),
		search,
	)).Order("features.created_at DESC").
		Offset(offset).
		Limit(limit).
		Find(&features).Error

	return features, total, err
}

// GetByProjectIDAndAssignee returns features filtered by assignee with pagination
func (r *FeatureRepository) GetByProjectIDAndAssignee(projectID int, assigneeId int, search string, offset, limit int) ([]Feature, int64, error) {
	var features []Feature
	var total int64

	query := applyFeatureSearch(
		r.uow.GetDB().Model(&Feature{}).
			Where("features.project_id = ? AND features.assigned_to = ?", projectID, assigneeId),
		search,
	)

	// Get total count
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	// Get paginated results
	err := withFeatureLinkedIdeaLabel(applyFeatureSearch(
		r.uow.GetDB().Model(&Feature{}).
			Where("features.project_id = ? AND features.assigned_to = ?", projectID, assigneeId),
		search,
	)).Order("features.created_at DESC").
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
		Where("features.project_id = ? AND features.item_type = ? AND features.item_id = ?", projectID, itemType, itemID)

	// Get total count
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	// Get paginated results
	err := withFeatureLinkedIdeaLabel(r.uow.GetDB().Model(&Feature{}).
		Where("features.project_id = ? AND features.item_type = ? AND features.item_id = ?", projectID, itemType, itemID)).Order("features.created_at DESC").
		Offset(offset).
		Limit(limit).
		Find(&features).Error

	return features, total, err
}

// GetByProjectIDAndSprintID returns features for a specific sprint in a project
func (r *FeatureRepository) GetByProjectIDAndSprintID(projectID int, sprintID int) ([]Feature, error) {
	var features []Feature

	err := r.uow.GetDB().Model(&Feature{}).
		Where("project_id = ? AND sprint_id = ?", projectID, sprintID).
		Order("created_at DESC").
		Find(&features).Error

	return features, err
}

// GetByProjectAndAssigneeLimited returns features assigned to a user in a project (limited)
func (r *FeatureRepository) GetByProjectAndAssigneeLimited(projectID int, assigneeID int, limit int, excludeStatuses []string) ([]Feature, error) {
	var features []Feature

	query := r.uow.GetDB().Model(&Feature{}).
		Where("project_id = ? AND assigned_to = ?", projectID, assigneeID)
	if len(excludeStatuses) > 0 {
		query = query.Where("status NOT IN ?", excludeStatuses)
	}
	err := query.
		Order("CASE WHEN deadline IS NULL THEN 1 ELSE 0 END, deadline ASC, created_at DESC").
		Limit(limit).
		Find(&features).Error

	return features, err
}

func (r *FeatureRepository) GetByProjectIDWithSelectorFilters(projectID int, statuses []string, priority string, search string, excludeFeatureID *int, dependencySelectable bool, selectedFeatureID *int, offset, limit int) ([]Feature, int64, error) {
	var features []Feature
	var total int64

	query := r.uow.GetDB().Model(&Feature{}).Where("project_id = ?", projectID)
	query = applyFeatureSearch(query, search)
	query = applyFeatureDependencySelection(query, dependencySelectable, selectedFeatureID, excludeFeatureID)

	if len(statuses) == 1 {
		query = query.Where("status = ?", statuses[0])
	} else if len(statuses) > 1 {
		query = query.Where("status IN ?", statuses)
	}

	if priority != "" {
		query = query.Where("priority = ?", priority)
	}

	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	err := query.Order("created_at DESC").
		Offset(offset).
		Limit(limit).
		Find(&features).Error

	return features, total, err
}
