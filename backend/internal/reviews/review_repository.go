package reviews

import (
	"github.com/dannyswat/pjeasy/internal/repositories"
	"gorm.io/gorm"
)

type ReviewRepository struct {
	uow *repositories.UnitOfWork
}

func NewReviewRepository(uow *repositories.UnitOfWork) *ReviewRepository {
	return &ReviewRepository{uow: uow}
}

// Create creates a new review
func (r *ReviewRepository) Create(review *Review) error {
	return r.uow.GetDB().Create(review).Error
}

// GetByID finds a review by ID
func (r *ReviewRepository) GetByID(id int) (*Review, error) {
	var review Review
	err := r.uow.GetDB().First(&review, id).Error
	if err == gorm.ErrRecordNotFound {
		return nil, nil
	}
	return &review, err
}

// Update updates a review
func (r *ReviewRepository) Update(review *Review) error {
	return r.uow.GetDB().Save(review).Error
}

// Delete deletes a review
func (r *ReviewRepository) Delete(id int) error {
	return r.uow.GetDB().Delete(&Review{}, id).Error
}

// GetByProjectID returns all reviews for a project with pagination
func (r *ReviewRepository) GetByProjectID(projectID int, offset, limit int) ([]Review, int64, error) {
	var reviews []Review
	var total int64

	query := r.uow.GetDB().Model(&Review{}).Where("project_id = ?", projectID)

	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	err := query.Order("created_at DESC").
		Offset(offset).
		Limit(limit).
		Find(&reviews).Error

	return reviews, total, err
}

// GetBySprintID returns the review associated with a sprint
func (r *ReviewRepository) GetBySprintID(sprintID int) (*Review, error) {
	var review Review
	err := r.uow.GetDB().Where("sprint_id = ?", sprintID).First(&review).Error
	if err == gorm.ErrRecordNotFound {
		return nil, nil
	}
	return &review, err
}

// CreateItem creates a review item
func (r *ReviewRepository) CreateItem(item *ReviewItem) error {
	return r.uow.GetDB().Create(item).Error
}

// CreateItems creates multiple review items
func (r *ReviewRepository) CreateItems(items []ReviewItem) error {
	if len(items) == 0 {
		return nil
	}
	return r.uow.GetDB().Create(&items).Error
}

// GetItemsByReviewID returns all items for a review
func (r *ReviewRepository) GetItemsByReviewID(reviewID int) ([]ReviewItem, error) {
	var items []ReviewItem
	err := r.uow.GetDB().Where("review_id = ?", reviewID).
		Order("category, item_type, title").
		Find(&items).Error
	return items, err
}

// GetItemsByReviewIDAndCategory returns items for a review filtered by category
func (r *ReviewRepository) GetItemsByReviewIDAndCategory(reviewID int, category string) ([]ReviewItem, error) {
	var items []ReviewItem
	err := r.uow.GetDB().Where("review_id = ? AND category = ?", reviewID, category).
		Order("item_type, title").
		Find(&items).Error
	return items, err
}

// DeleteItemsByReviewID removes all items for a review (used when regenerating)
func (r *ReviewRepository) DeleteItemsByReviewID(reviewID int) error {
	return r.uow.GetDB().Where("review_id = ?", reviewID).Delete(&ReviewItem{}).Error
}
