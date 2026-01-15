package comments

import (
	"errors"
	"time"
)

type CommentService struct {
	commentRepo *CommentRepository
}

func NewCommentService(commentRepo *CommentRepository) *CommentService {
	return &CommentService{
		commentRepo: commentRepo,
	}
}

// CreateComment creates a new comment
func (s *CommentService) CreateComment(itemID int, itemType string, content string, userID int) (*Comment, error) {
	if content == "" {
		return nil, errors.New("content is required")
	}
	if itemType == "" {
		return nil, errors.New("item type is required")
	}

	now := time.Now()
	comment := &Comment{
		ItemID:    itemID,
		ItemType:  itemType,
		Content:   content,
		CreatedBy: userID,
		CreatedAt: now,
		UpdatedAt: now,
	}

	if err := s.commentRepo.Create(comment); err != nil {
		return nil, err
	}

	return comment, nil
}

// GetComment retrieves a comment by ID
func (s *CommentService) GetComment(commentID int) (*Comment, error) {
	comment, err := s.commentRepo.GetByID(commentID)
	if err != nil {
		return nil, err
	}
	if comment == nil {
		return nil, errors.New("comment not found")
	}
	return comment, nil
}

// UpdateComment updates an existing comment
func (s *CommentService) UpdateComment(commentID int, content string, userID int) (*Comment, error) {
	if content == "" {
		return nil, errors.New("content is required")
	}

	comment, err := s.commentRepo.GetByID(commentID)
	if err != nil {
		return nil, err
	}
	if comment == nil {
		return nil, errors.New("comment not found")
	}

	// Check if the user is the owner of the comment
	if comment.CreatedBy != userID {
		return nil, errors.New("unauthorized: you can only edit your own comments")
	}

	comment.Content = content
	comment.UpdatedAt = time.Now()

	if err := s.commentRepo.Update(comment); err != nil {
		return nil, err
	}

	return comment, nil
}

// DeleteComment deletes a comment
func (s *CommentService) DeleteComment(commentID int, userID int) error {
	comment, err := s.commentRepo.GetByID(commentID)
	if err != nil {
		return err
	}
	if comment == nil {
		return errors.New("comment not found")
	}

	// Check if the user is the owner of the comment
	if comment.CreatedBy != userID {
		return errors.New("unauthorized: you can only delete your own comments")
	}

	return s.commentRepo.Delete(commentID)
}

// GetCommentsByItem retrieves all comments for an item
func (s *CommentService) GetCommentsByItem(itemID int, itemType string) ([]Comment, error) {
	return s.commentRepo.GetByItem(itemID, itemType)
}

// GetCommentsByItemWithPagination retrieves comments for an item with pagination
func (s *CommentService) GetCommentsByItemWithPagination(itemID int, itemType string, page, pageSize int) ([]Comment, int64, error) {
	offset := (page - 1) * pageSize
	return s.commentRepo.GetByItemWithPagination(itemID, itemType, offset, pageSize)
}

// GetCommentCount returns the number of comments for an item
func (s *CommentService) GetCommentCount(itemID int, itemType string) (int64, error) {
	return s.commentRepo.CountByItem(itemID, itemType)
}
