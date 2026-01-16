package comments

import (
	"github.com/dannyswat/pjeasy/internal/repositories"
	"gorm.io/gorm"
)

type CommentRepository struct {
	uow *repositories.UnitOfWork
}

func NewCommentRepository(uow *repositories.UnitOfWork) *CommentRepository {
	return &CommentRepository{uow: uow}
}

// Create creates a new comment
func (r *CommentRepository) Create(comment *Comment) error {
	return r.uow.GetDB().Create(comment).Error
}

// GetByID finds a comment by ID
func (r *CommentRepository) GetByID(id int) (*Comment, error) {
	var comment Comment
	err := r.uow.GetDB().First(&comment, id).Error
	if err == gorm.ErrRecordNotFound {
		return nil, nil
	}
	return &comment, err
}

// Update updates a comment
func (r *CommentRepository) Update(comment *Comment) error {
	return r.uow.GetDB().Save(comment).Error
}

// Delete deletes a comment
func (r *CommentRepository) Delete(id int) error {
	return r.uow.GetDB().Delete(&Comment{}, id).Error
}

// GetByItem returns all comments for an item ordered by creation time
func (r *CommentRepository) GetByItem(itemID int, itemType string) ([]Comment, error) {
	var comments []Comment
	err := r.uow.GetDB().Where("item_id = ? AND item_type = ?", itemID, itemType).
		Order("created_at ASC").
		Find(&comments).Error
	return comments, err
}

// GetByItemWithPagination returns comments for an item with pagination
func (r *CommentRepository) GetByItemWithPagination(itemID int, itemType string, offset, limit int) ([]Comment, int64, error) {
	var comments []Comment
	var total int64

	query := r.uow.GetDB().Model(&Comment{}).Where("item_id = ? AND item_type = ?", itemID, itemType)

	// Get total count
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	// Get paginated results
	err := query.Order("created_at ASC").
		Offset(offset).
		Limit(limit).
		Find(&comments).Error

	return comments, total, err
}

// CountByItem returns the number of comments for an item
func (r *CommentRepository) CountByItem(itemID int, itemType string) (int64, error) {
	var count int64
	err := r.uow.GetDB().Model(&Comment{}).Where("item_id = ? AND item_type = ?", itemID, itemType).Count(&count).Error
	return count, err
}
