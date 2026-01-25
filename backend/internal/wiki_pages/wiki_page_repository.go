package wiki_pages

import (
	"github.com/dannyswat/pjeasy/internal/repositories"
	"gorm.io/gorm"
)

type WikiPageRepository struct {
	uow *repositories.UnitOfWork
}

func NewWikiPageRepository(uow *repositories.UnitOfWork) *WikiPageRepository {
	return &WikiPageRepository{uow: uow}
}

// Create creates a new wiki page
func (r *WikiPageRepository) Create(page *WikiPage) error {
	return r.uow.GetDB().Create(page).Error
}

// GetByID finds a wiki page by ID
func (r *WikiPageRepository) GetByID(id int) (*WikiPage, error) {
	var page WikiPage
	err := r.uow.GetDB().First(&page, id).Error
	if err == gorm.ErrRecordNotFound {
		return nil, nil
	}
	return &page, err
}

// GetBySlug finds a wiki page by project ID and slug
func (r *WikiPageRepository) GetBySlug(projectID int, slug string) (*WikiPage, error) {
	var page WikiPage
	err := r.uow.GetDB().Where("project_id = ? AND slug = ?", projectID, slug).First(&page).Error
	if err == gorm.ErrRecordNotFound {
		return nil, nil
	}
	return &page, err
}

// Update updates a wiki page
func (r *WikiPageRepository) Update(page *WikiPage) error {
	return r.uow.GetDB().Save(page).Error
}

// Delete deletes a wiki page
func (r *WikiPageRepository) Delete(id int) error {
	return r.uow.GetDB().Delete(&WikiPage{}, id).Error
}

// GetByProjectID returns all wiki pages for a project with pagination
func (r *WikiPageRepository) GetByProjectID(projectID int, offset, limit int) ([]WikiPage, int64, error) {
	var pages []WikiPage
	var total int64

	query := r.uow.GetDB().Model(&WikiPage{}).Where("project_id = ?", projectID)

	// Get total count
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	// Get paginated results
	err := query.Order("sort_order ASC, created_at DESC").
		Offset(offset).
		Limit(limit).
		Find(&pages).Error

	return pages, total, err
}

// GetByProjectIDAndStatus returns wiki pages filtered by status with pagination
func (r *WikiPageRepository) GetByProjectIDAndStatus(projectID int, status string, offset, limit int) ([]WikiPage, int64, error) {
	var pages []WikiPage
	var total int64

	query := r.uow.GetDB().Model(&WikiPage{}).
		Where("project_id = ? AND status = ?", projectID, status)

	// Get total count
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	// Get paginated results
	err := query.Order("sort_order ASC, created_at DESC").
		Offset(offset).
		Limit(limit).
		Find(&pages).Error

	return pages, total, err
}

// GetByParentID returns wiki pages by parent ID (for hierarchical structure)
func (r *WikiPageRepository) GetByParentID(projectID int, parentID *int) ([]WikiPage, error) {
	var pages []WikiPage

	query := r.uow.GetDB().Model(&WikiPage{}).Where("project_id = ?", projectID)

	if parentID == nil {
		query = query.Where("parent_id IS NULL")
	} else {
		query = query.Where("parent_id = ?", *parentID)
	}

	err := query.Order("sort_order ASC, created_at DESC").Find(&pages).Error
	return pages, err
}

// GetChildren returns all child pages of a wiki page
func (r *WikiPageRepository) GetChildren(pageID int) ([]WikiPage, error) {
	var pages []WikiPage
	err := r.uow.GetDB().Where("parent_id = ?", pageID).
		Order("sort_order ASC, created_at DESC").
		Find(&pages).Error
	return pages, err
}

// UpdateStatus updates only the status of a wiki page
func (r *WikiPageRepository) UpdateStatus(id int, status string) error {
	return r.uow.GetDB().Model(&WikiPage{}).
		Where("id = ?", id).
		Update("status", status).Error
}

// UpdateContent updates the content and version of a wiki page
func (r *WikiPageRepository) UpdateContent(id int, content, contentHash string, version int) error {
	return r.uow.GetDB().Model(&WikiPage{}).
		Where("id = ?", id).
		Updates(map[string]interface{}{
			"content":      content,
			"content_hash": contentHash,
			"version":      version,
		}).Error
}

// GetAllByProjectID returns all wiki pages for a project (for tree structure)
func (r *WikiPageRepository) GetAllByProjectID(projectID int) ([]WikiPage, error) {
	var pages []WikiPage
	err := r.uow.GetDB().Where("project_id = ?", projectID).
		Order("sort_order ASC, created_at DESC").
		Find(&pages).Error
	return pages, err
}

// CheckSlugExists checks if a slug already exists in the project (excluding given ID)
func (r *WikiPageRepository) CheckSlugExists(projectID int, slug string, excludeID int) (bool, error) {
	var count int64
	query := r.uow.GetDB().Model(&WikiPage{}).Where("project_id = ? AND slug = ?", projectID, slug)
	if excludeID > 0 {
		query = query.Where("id != ?", excludeID)
	}
	err := query.Count(&count).Error
	return count > 0, err
}
