package wiki_pages

import (
	"github.com/dannyswat/pjeasy/internal/repositories"
	"gorm.io/gorm"
)

type WikiPageChangeRepository struct {
	uow *repositories.UnitOfWork
}

func NewWikiPageChangeRepository(uow *repositories.UnitOfWork) *WikiPageChangeRepository {
	return &WikiPageChangeRepository{uow: uow}
}

// Create creates a new wiki page change
func (r *WikiPageChangeRepository) Create(change *WikiPageChange) error {
	return r.uow.GetDB().Create(change).Error
}

// GetByID finds a wiki page change by ID
func (r *WikiPageChangeRepository) GetByID(id int) (*WikiPageChange, error) {
	var change WikiPageChange
	err := r.uow.GetDB().First(&change, id).Error
	if err == gorm.ErrRecordNotFound {
		return nil, nil
	}
	return &change, err
}

// Update updates a wiki page change
func (r *WikiPageChangeRepository) Update(change *WikiPageChange) error {
	return r.uow.GetDB().Save(change).Error
}

// Delete deletes a wiki page change
func (r *WikiPageChangeRepository) Delete(id int) error {
	return r.uow.GetDB().Delete(&WikiPageChange{}, id).Error
}

// GetByWikiPageID returns all changes for a wiki page with pagination
func (r *WikiPageChangeRepository) GetByWikiPageID(wikiPageID int, offset, limit int) ([]WikiPageChange, int64, error) {
	var changes []WikiPageChange
	var total int64

	query := r.uow.GetDB().Model(&WikiPageChange{}).Where("wiki_page_id = ?", wikiPageID)

	// Get total count
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	// Get paginated results
	err := query.Order("created_at DESC").
		Offset(offset).
		Limit(limit).
		Find(&changes).Error

	return changes, total, err
}

// GetByItem returns all changes for a specific feature or issue
func (r *WikiPageChangeRepository) GetByItem(itemType string, itemID int) ([]WikiPageChange, error) {
	var changes []WikiPageChange
	err := r.uow.GetDB().Where("item_type = ? AND item_id = ?", itemType, itemID).
		Order("created_at DESC").
		Find(&changes).Error
	return changes, err
}

// GetByItemAndWikiPage returns changes for a specific feature/issue on a specific wiki page
func (r *WikiPageChangeRepository) GetByItemAndWikiPage(itemType string, itemID, wikiPageID int) ([]WikiPageChange, error) {
	var changes []WikiPageChange
	err := r.uow.GetDB().Where("item_type = ? AND item_id = ? AND wiki_page_id = ?", itemType, itemID, wikiPageID).
		Order("created_at DESC").
		Find(&changes).Error
	return changes, err
}

// GetPendingChangesByWikiPageID returns all pending changes for a wiki page
func (r *WikiPageChangeRepository) GetPendingChangesByWikiPageID(wikiPageID int) ([]WikiPageChange, error) {
	var changes []WikiPageChange
	err := r.uow.GetDB().Where("wiki_page_id = ? AND status = ?", wikiPageID, WikiPageChangeStatusPending).
		Order("created_at ASC").
		Find(&changes).Error
	return changes, err
}

// GetPendingChangesByItem returns pending changes for a specific feature/issue
func (r *WikiPageChangeRepository) GetPendingChangesByItem(itemType string, itemID int) ([]WikiPageChange, error) {
	var changes []WikiPageChange
	err := r.uow.GetDB().Where("item_type = ? AND item_id = ? AND status = ?", itemType, itemID, WikiPageChangeStatusPending).
		Order("created_at ASC").
		Find(&changes).Error
	return changes, err
}

// GetLatestChangeByItem returns the most recent change for a specific feature/issue on a wiki page
func (r *WikiPageChangeRepository) GetLatestChangeByItem(itemType string, itemID, wikiPageID int) (*WikiPageChange, error) {
	var change WikiPageChange
	err := r.uow.GetDB().Where("item_type = ? AND item_id = ? AND wiki_page_id = ?", itemType, itemID, wikiPageID).
		Order("created_at DESC").
		First(&change).Error
	if err == gorm.ErrRecordNotFound {
		return nil, nil
	}
	return &change, err
}

// UpdateStatus updates the status of a wiki page change
func (r *WikiPageChangeRepository) UpdateStatus(id int, status string) error {
	return r.uow.GetDB().Model(&WikiPageChange{}).
		Where("id = ?", id).
		Update("status", status).Error
}

// GetByProjectID returns all changes for a project with pagination
func (r *WikiPageChangeRepository) GetByProjectID(projectID int, offset, limit int) ([]WikiPageChange, int64, error) {
	var changes []WikiPageChange
	var total int64

	query := r.uow.GetDB().Model(&WikiPageChange{}).Where("project_id = ?", projectID)

	// Get total count
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	// Get paginated results
	err := query.Order("created_at DESC").
		Offset(offset).
		Limit(limit).
		Find(&changes).Error

	return changes, total, err
}

// GetConflictingChanges returns changes that have conflicts for a wiki page
func (r *WikiPageChangeRepository) GetConflictingChanges(wikiPageID int) ([]WikiPageChange, error) {
	var changes []WikiPageChange
	err := r.uow.GetDB().Where("wiki_page_id = ? AND status = ?", wikiPageID, WikiPageChangeStatusConflict).
		Order("created_at ASC").
		Find(&changes).Error
	return changes, err
}

// GetMergedChangesByWikiPageID returns all merged changes for a wiki page ordered by merge time
func (r *WikiPageChangeRepository) GetMergedChangesByWikiPageID(wikiPageID int) ([]WikiPageChange, error) {
	var changes []WikiPageChange
	err := r.uow.GetDB().Where("wiki_page_id = ? AND status = ?", wikiPageID, WikiPageChangeStatusMerged).
		Order("merged_at ASC").
		Find(&changes).Error
	return changes, err
}
