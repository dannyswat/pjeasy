package comments

import (
	"errors"
	"time"

	"github.com/dannyswat/pjeasy/internal/users"
)

type CommentService struct {
	commentRepo *CommentRepository
	userRepo    *users.UserRepository
}

func NewCommentService(commentRepo *CommentRepository, userRepo *users.UserRepository) *CommentService {
	return &CommentService{
		commentRepo: commentRepo,
		userRepo:    userRepo,
	}
}

// CommentWithUser represents a comment with user information
type CommentWithUser struct {
	Comment     Comment
	CreatorName string
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
func (s *CommentService) GetCommentsByItem(itemID int, itemType string) ([]CommentWithUser, error) {
	comments, err := s.commentRepo.GetByItem(itemID, itemType)
	if err != nil {
		return nil, err
	}

	// Fetch user information for each comment
	var commentsWithUser []CommentWithUser
	for _, comment := range comments {
		user, err := s.userRepo.GetByID(comment.CreatedBy)
		if err != nil {
			// If user not found, use a default name
			commentsWithUser = append(commentsWithUser, CommentWithUser{
				Comment:     comment,
				CreatorName: "Unknown User",
			})
			continue
		}
		commentsWithUser = append(commentsWithUser, CommentWithUser{
			Comment:     comment,
			CreatorName: user.Name,
		})
	}

	return commentsWithUser, nil
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
