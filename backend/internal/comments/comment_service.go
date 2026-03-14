package comments

import (
	"errors"
	"strings"
	"time"

	"github.com/dannyswat/pjeasy/internal/features"
	"github.com/dannyswat/pjeasy/internal/ideas"
	"github.com/dannyswat/pjeasy/internal/issues"
	"github.com/dannyswat/pjeasy/internal/projects"
	"github.com/dannyswat/pjeasy/internal/service_tickets"
	"github.com/dannyswat/pjeasy/internal/tasks"
	"github.com/dannyswat/pjeasy/internal/users"
	"github.com/dannyswat/pjeasy/internal/wiki_pages"
)

type CommentService struct {
	commentRepo *CommentRepository
	userRepo    *users.UserRepository
	memberRepo  *projects.ProjectMemberRepository
	ideaRepo    *ideas.IdeaRepository
	issueRepo   *issues.IssueRepository
	featureRepo *features.FeatureRepository
	taskRepo    *tasks.TaskRepository
	ticketRepo  *service_tickets.ServiceTicketRepository
	wikiRepo    *wiki_pages.WikiPageRepository
}

func NewCommentService(commentRepo *CommentRepository, userRepo *users.UserRepository, memberRepo *projects.ProjectMemberRepository, ideaRepo *ideas.IdeaRepository, issueRepo *issues.IssueRepository, featureRepo *features.FeatureRepository, taskRepo *tasks.TaskRepository, ticketRepo *service_tickets.ServiceTicketRepository, wikiRepo *wiki_pages.WikiPageRepository) *CommentService {
	return &CommentService{
		commentRepo: commentRepo,
		userRepo:    userRepo,
		memberRepo:  memberRepo,
		ideaRepo:    ideaRepo,
		issueRepo:   issueRepo,
		featureRepo: featureRepo,
		taskRepo:    taskRepo,
		ticketRepo:  ticketRepo,
		wikiRepo:    wikiRepo,
	}
}

// CommentWithUser represents a comment with user information
type CommentWithUser struct {
	Comment     Comment
	CreatorName string
}

// CreateComment creates a new comment.
func (s *CommentService) CreateComment(itemID int, itemType string, content string, userID int) (*Comment, error) {
	if content == "" {
		return nil, errors.New("content is required")
	}
	if itemType == "" {
		return nil, errors.New("item type is required")
	}

	projectID, err := s.resolveProjectID(itemID, itemType)
	if err != nil {
		return nil, err
	}

	isMember, err := s.memberRepo.IsUserMember(projectID, userID)
	if err != nil {
		return nil, err
	}
	if !isMember {
		return nil, errors.New("user is not a member of this project")
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

// GetComment retrieves a comment by ID.
func (s *CommentService) GetComment(commentID int, userID int) (*Comment, error) {
	comment, err := s.commentRepo.GetByID(commentID)
	if err != nil {
		return nil, err
	}
	if comment == nil {
		return nil, errors.New("comment not found")
	}

	projectID, err := s.resolveProjectID(comment.ItemID, comment.ItemType)
	if err != nil {
		return nil, err
	}

	isMember, err := s.memberRepo.IsUserMember(projectID, userID)
	if err != nil {
		return nil, err
	}
	if !isMember {
		return nil, errors.New("user is not a member of this project")
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

	projectID, err := s.resolveProjectID(comment.ItemID, comment.ItemType)
	if err != nil {
		return nil, err
	}

	isMember, err := s.memberRepo.IsUserMember(projectID, userID)
	if err != nil {
		return nil, err
	}
	if !isMember {
		return nil, errors.New("user is not a member of this project")
	}

	isProjectUser, err := s.memberRepo.IsUserProjectUser(projectID, userID)
	if err != nil {
		return nil, err
	}
	if isProjectUser {
		return nil, errors.New("project users can only add comments")
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

	projectID, err := s.resolveProjectID(comment.ItemID, comment.ItemType)
	if err != nil {
		return err
	}

	isMember, err := s.memberRepo.IsUserMember(projectID, userID)
	if err != nil {
		return err
	}
	if !isMember {
		return errors.New("user is not a member of this project")
	}

	isProjectUser, err := s.memberRepo.IsUserProjectUser(projectID, userID)
	if err != nil {
		return err
	}
	if isProjectUser {
		return errors.New("project users can only add comments")
	}

	// Check if the user is the owner of the comment
	if comment.CreatedBy != userID {
		return errors.New("unauthorized: you can only delete your own comments")
	}

	return s.commentRepo.Delete(commentID)
}

// GetCommentsByItem retrieves all comments for an item.
func (s *CommentService) GetCommentsByItem(itemID int, itemType string, userID int) ([]CommentWithUser, error) {
	projectID, err := s.resolveProjectID(itemID, itemType)
	if err != nil {
		return nil, err
	}

	isMember, err := s.memberRepo.IsUserMember(projectID, userID)
	if err != nil {
		return nil, err
	}
	if !isMember {
		return nil, errors.New("user is not a member of this project")
	}

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

func (s *CommentService) resolveProjectID(itemID int, itemType string) (int, error) {
	switch normalizeCommentItemType(itemType) {
	case "ideas":
		idea, err := s.ideaRepo.GetByID(itemID)
		if err != nil {
			return 0, err
		}
		if idea == nil {
			return 0, errors.New("idea not found")
		}
		return idea.ProjectID, nil
	case "issues":
		issue, err := s.issueRepo.GetByID(itemID)
		if err != nil {
			return 0, err
		}
		if issue == nil {
			return 0, errors.New("issue not found")
		}
		return issue.ProjectID, nil
	case "features":
		feature, err := s.featureRepo.GetByID(itemID)
		if err != nil {
			return 0, err
		}
		if feature == nil {
			return 0, errors.New("feature not found")
		}
		return feature.ProjectID, nil
	case "tasks":
		task, err := s.taskRepo.GetByID(itemID)
		if err != nil {
			return 0, err
		}
		if task == nil {
			return 0, errors.New("task not found")
		}
		return task.ProjectID, nil
	case "service-tickets":
		ticket, err := s.ticketRepo.GetByID(itemID)
		if err != nil {
			return 0, err
		}
		if ticket == nil {
			return 0, errors.New("service ticket not found")
		}
		return ticket.ProjectID, nil
	case "wiki", "wiki-pages":
		page, err := s.wikiRepo.GetByID(itemID)
		if err != nil {
			return 0, err
		}
		if page == nil {
			return 0, errors.New("wiki page not found")
		}
		return page.ProjectID, nil
	default:
		return 0, errors.New("unsupported comment item type")
	}
}

func normalizeCommentItemType(itemType string) string {
	normalized := strings.ToLower(strings.TrimSpace(itemType))
	normalized = strings.ReplaceAll(normalized, "_", "-")
	switch normalized {
	case "serviceticket", "service-ticket":
		return "service-tickets"
	case "wiki-page", "wikipage":
		return "wiki-pages"
	default:
		return normalized
	}
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
