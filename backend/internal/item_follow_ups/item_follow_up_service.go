package item_follow_ups

import (
	"errors"
	"sort"
	"strings"
	"time"

	"github.com/dannyswat/pjeasy/internal/features"
	"github.com/dannyswat/pjeasy/internal/ideas"
	"github.com/dannyswat/pjeasy/internal/issues"
	"github.com/dannyswat/pjeasy/internal/projects"
	"github.com/dannyswat/pjeasy/internal/reviews"
	"github.com/dannyswat/pjeasy/internal/service_tickets"
	"github.com/dannyswat/pjeasy/internal/tasks"
	"github.com/dannyswat/pjeasy/internal/users"
	"github.com/dannyswat/pjeasy/internal/wiki_pages"
)

type ItemFollowUpService struct {
	followUpRepo *ItemFollowUpRepository
	userRepo     *users.UserRepository
	memberRepo   *projects.ProjectMemberRepository
	ideaRepo     *ideas.IdeaRepository
	issueRepo    *issues.IssueRepository
	featureRepo  *features.FeatureRepository
	taskRepo     *tasks.TaskRepository
	ticketRepo   *service_tickets.ServiceTicketRepository
	wikiRepo     *wiki_pages.WikiPageRepository
	reviewRepo   *reviews.ReviewRepository
}

func NewItemFollowUpService(followUpRepo *ItemFollowUpRepository, userRepo *users.UserRepository, memberRepo *projects.ProjectMemberRepository, ideaRepo *ideas.IdeaRepository, issueRepo *issues.IssueRepository, featureRepo *features.FeatureRepository, taskRepo *tasks.TaskRepository, ticketRepo *service_tickets.ServiceTicketRepository, wikiRepo *wiki_pages.WikiPageRepository, reviewRepo *reviews.ReviewRepository) *ItemFollowUpService {
	return &ItemFollowUpService{
		followUpRepo: followUpRepo,
		userRepo:     userRepo,
		memberRepo:   memberRepo,
		ideaRepo:     ideaRepo,
		issueRepo:    issueRepo,
		featureRepo:  featureRepo,
		taskRepo:     taskRepo,
		ticketRepo:   ticketRepo,
		wikiRepo:     wikiRepo,
		reviewRepo:   reviewRepo,
	}
}

type ItemFollowUpWithUser struct {
	ItemFollowUp ItemFollowUp
	CreatorName  string
}

type ReviewItemFollowUp struct {
	ItemFollowUp   ItemFollowUp
	CreatorName    string
	SourceItemID   int
	SourceType     string
	SourceRefNum   string
	SourceTitle    string
	SourceStatus   string
	SourceCategory string
}

func (s *ItemFollowUpService) CreateItemFollowUp(itemID int, itemType string, followUpDate time.Time, content string, userID int) (*ItemFollowUp, error) {
	content = strings.TrimSpace(content)
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
	followUp := &ItemFollowUp{
		ItemID:       itemID,
		ItemType:     normalizeItemType(itemType),
		FollowUpDate: followUpDate,
		Content:      content,
		CreatedBy:    userID,
		CreatedAt:    now,
		UpdatedAt:    now,
	}

	if err := s.followUpRepo.Create(followUp); err != nil {
		return nil, err
	}

	return followUp, nil
}

func (s *ItemFollowUpService) GetItemFollowUp(followUpID int, userID int) (*ItemFollowUp, error) {
	followUp, err := s.followUpRepo.GetByID(followUpID)
	if err != nil {
		return nil, err
	}
	if followUp == nil {
		return nil, errors.New("item follow-up not found")
	}

	projectID, err := s.resolveProjectID(followUp.ItemID, followUp.ItemType)
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

	return followUp, nil
}

func (s *ItemFollowUpService) UpdateItemFollowUp(followUpID int, followUpDate time.Time, content string, userID int) (*ItemFollowUp, error) {
	content = strings.TrimSpace(content)
	if content == "" {
		return nil, errors.New("content is required")
	}

	followUp, err := s.followUpRepo.GetByID(followUpID)
	if err != nil {
		return nil, err
	}
	if followUp == nil {
		return nil, errors.New("item follow-up not found")
	}

	projectID, err := s.resolveProjectID(followUp.ItemID, followUp.ItemType)
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
		return nil, errors.New("project users can only add follow-ups")
	}

	if followUp.CreatedBy != userID {
		return nil, errors.New("unauthorized: you can only edit your own follow-ups")
	}

	followUp.FollowUpDate = followUpDate
	followUp.Content = content
	followUp.UpdatedAt = time.Now()

	if err := s.followUpRepo.Update(followUp); err != nil {
		return nil, err
	}

	return followUp, nil
}

func (s *ItemFollowUpService) DeleteItemFollowUp(followUpID int, userID int) error {
	followUp, err := s.followUpRepo.GetByID(followUpID)
	if err != nil {
		return err
	}
	if followUp == nil {
		return errors.New("item follow-up not found")
	}

	projectID, err := s.resolveProjectID(followUp.ItemID, followUp.ItemType)
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
		return errors.New("project users can only add follow-ups")
	}

	if followUp.CreatedBy != userID {
		return errors.New("unauthorized: you can only delete your own follow-ups")
	}

	return s.followUpRepo.Delete(followUpID)
}

func (s *ItemFollowUpService) GetItemFollowUpsByItem(itemID int, itemType string, userID int) ([]ItemFollowUpWithUser, error) {
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

	followUps, err := s.followUpRepo.GetByItem(itemID, normalizeItemType(itemType))
	if err != nil {
		return nil, err
	}

	result := make([]ItemFollowUpWithUser, 0, len(followUps))
	for _, followUp := range followUps {
		user, err := s.userRepo.GetByID(followUp.CreatedBy)
		if err != nil || user == nil {
			result = append(result, ItemFollowUpWithUser{ItemFollowUp: followUp, CreatorName: "Unknown User"})
			continue
		}

		result = append(result, ItemFollowUpWithUser{ItemFollowUp: followUp, CreatorName: user.Name})
	}

	return result, nil
}

func (s *ItemFollowUpService) resolveProjectID(itemID int, itemType string) (int, error) {
	switch normalizeItemType(itemType) {
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
		return 0, errors.New("unsupported follow-up item type")
	}
}

func (s *ItemFollowUpService) GetFollowUpsForReview(reviewID int, userID int) ([]ReviewItemFollowUp, error) {
	review, err := s.reviewRepo.GetByID(reviewID)
	if err != nil {
		return nil, err
	}
	if review == nil {
		return nil, errors.New("review not found")
	}

	isMember, err := s.memberRepo.IsUserMember(review.ProjectID, userID)
	if err != nil {
		return nil, err
	}
	if !isMember {
		return nil, errors.New("user is not a member of this project")
	}

	reviewItems, err := s.reviewRepo.GetItemsByReviewID(reviewID)
	if err != nil {
		return nil, err
	}

	result := make([]ReviewItemFollowUp, 0)
	for _, reviewItem := range reviewItems {
		followUps, err := s.followUpRepo.GetByItem(reviewItem.ItemID, normalizeItemType(reviewItem.ItemType))
		if err != nil {
			return nil, err
		}

		for _, followUp := range followUps {
			creatorName := "Unknown User"
			user, userErr := s.userRepo.GetByID(followUp.CreatedBy)
			if userErr == nil && user != nil {
				creatorName = user.Name
			}

			result = append(result, ReviewItemFollowUp{
				ItemFollowUp:   followUp,
				CreatorName:    creatorName,
				SourceItemID:   reviewItem.ItemID,
				SourceType:     reviewItem.ItemType,
				SourceRefNum:   reviewItem.RefNum,
				SourceTitle:    reviewItem.Title,
				SourceStatus:   reviewItem.Status,
				SourceCategory: reviewItem.Category,
			})
		}
	}

	sort.SliceStable(result, func(i, j int) bool {
		if result[i].ItemFollowUp.FollowUpDate.Equal(result[j].ItemFollowUp.FollowUpDate) {
			return result[i].ItemFollowUp.CreatedAt.After(result[j].ItemFollowUp.CreatedAt)
		}
		return result[i].ItemFollowUp.FollowUpDate.After(result[j].ItemFollowUp.FollowUpDate)
	})

	return result, nil
}

func normalizeItemType(itemType string) string {
	normalized := strings.ToLower(strings.TrimSpace(itemType))
	normalized = strings.ReplaceAll(normalized, "_", "-")
	if strings.HasSuffix(normalized, "s") {
		switch normalized {
		case "ideas", "issues", "features", "tasks", "service-tickets", "wiki-pages":
			return normalized
		}
	}

	switch normalized {
	case "idea":
		return "ideas"
	case "issue":
		return "issues"
	case "feature":
		return "features"
	case "task":
		return "tasks"
	case "service-ticket", "service ticket", "serviceticket":
		return "service-tickets"
	case "wiki", "wiki-page", "wiki page", "wikipage":
		return "wiki-pages"
	default:
		return normalized
	}
}
