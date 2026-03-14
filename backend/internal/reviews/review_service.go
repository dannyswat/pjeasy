package reviews

import (
	"errors"
	"time"

	"github.com/dannyswat/pjeasy/internal/features"
	"github.com/dannyswat/pjeasy/internal/ideas"
	"github.com/dannyswat/pjeasy/internal/issues"
	"github.com/dannyswat/pjeasy/internal/projects"
	"github.com/dannyswat/pjeasy/internal/repositories"
	"github.com/dannyswat/pjeasy/internal/sprints"
	"github.com/dannyswat/pjeasy/internal/status_changes"
	"github.com/dannyswat/pjeasy/internal/tasks"
)

type ReviewService struct {
	reviewRepo  *ReviewRepository
	sprintRepo  *sprints.SprintRepository
	taskRepo    *tasks.TaskRepository
	featureRepo *features.FeatureRepository
	issueRepo   *issues.IssueRepository
	ideaRepo    *ideas.IdeaRepository
	memberRepo  *projects.ProjectMemberRepository
	projectRepo *projects.ProjectRepository
	statusRepo  *status_changes.StatusChangeService
	uowFactory  *repositories.UnitOfWorkFactory
}

func NewReviewService(
	reviewRepo *ReviewRepository,
	sprintRepo *sprints.SprintRepository,
	taskRepo *tasks.TaskRepository,
	featureRepo *features.FeatureRepository,
	issueRepo *issues.IssueRepository,
	ideaRepo *ideas.IdeaRepository,
	memberRepo *projects.ProjectMemberRepository,
	projectRepo *projects.ProjectRepository,
	statusRepo *status_changes.StatusChangeService,
	uowFactory *repositories.UnitOfWorkFactory,
) *ReviewService {
	return &ReviewService{
		reviewRepo:  reviewRepo,
		sprintRepo:  sprintRepo,
		taskRepo:    taskRepo,
		featureRepo: featureRepo,
		issueRepo:   issueRepo,
		ideaRepo:    ideaRepo,
		memberRepo:  memberRepo,
		projectRepo: projectRepo,
		statusRepo:  statusRepo,
		uowFactory:  uowFactory,
	}
}

// CreateSprintReview creates a review for a specific sprint
func (s *ReviewService) CreateSprintReview(projectID int, sprintID int, title, description string, createdBy int) (*Review, error) {
	// Validate project exists
	project, err := s.projectRepo.GetByID(projectID)
	if err != nil {
		return nil, err
	}
	if project == nil {
		return nil, errors.New("project not found")
	}

	// Check if user is a manager
	isManager, err := s.memberRepo.IsUserAdmin(projectID, createdBy)
	if err != nil {
		return nil, err
	}
	if !isManager {
		return nil, errors.New("only project managers can create reviews")
	}

	// Validate sprint exists and belongs to the project
	sprint, err := s.sprintRepo.GetByID(sprintID)
	if err != nil {
		return nil, err
	}
	if sprint == nil {
		return nil, errors.New("sprint not found")
	}
	if sprint.ProjectID != projectID {
		return nil, errors.New("sprint does not belong to this project")
	}

	// Check if a review already exists for this sprint
	existingReview, err := s.reviewRepo.GetBySprintID(sprintID)
	if err != nil {
		return nil, err
	}
	if existingReview != nil {
		return nil, errors.New("a review already exists for this sprint")
	}

	now := time.Now()
	review := &Review{
		ProjectID:   projectID,
		Title:       title,
		Description: description,
		ReviewType:  ReviewTypeSprint,
		SprintID:    &sprintID,
		StartDate:   sprint.StartDate,
		EndDate:     sprint.EndDate,
		Status:      ReviewStatusDraft,
		CreatedBy:   createdBy,
		CreatedAt:   now,
		UpdatedAt:   now,
	}

	if err := s.reviewRepo.Create(review); err != nil {
		return nil, err
	}

	// Generate review items from sprint data
	if err := s.generateSprintReviewItems(review, sprint); err != nil {
		return nil, err
	}

	return review, nil
}

// CreateCustomReview creates a custom review covering a date range
func (s *ReviewService) CreateCustomReview(projectID int, title, description string, startDate, endDate *time.Time, createdBy int) (*Review, error) {
	// Validate project exists
	project, err := s.projectRepo.GetByID(projectID)
	if err != nil {
		return nil, err
	}
	if project == nil {
		return nil, errors.New("project not found")
	}

	// Check if user is a manager
	isManager, err := s.memberRepo.IsUserAdmin(projectID, createdBy)
	if err != nil {
		return nil, err
	}
	if !isManager {
		return nil, errors.New("only project managers can create reviews")
	}

	now := time.Now()
	review := &Review{
		ProjectID:   projectID,
		Title:       title,
		Description: description,
		ReviewType:  ReviewTypeCustom,
		StartDate:   startDate,
		EndDate:     endDate,
		Status:      ReviewStatusDraft,
		CreatedBy:   createdBy,
		CreatedAt:   now,
		UpdatedAt:   now,
	}

	if err := s.reviewRepo.Create(review); err != nil {
		return nil, err
	}

	// Generate review items from project data
	if err := s.generateCustomReviewItems(review); err != nil {
		return nil, err
	}

	return review, nil
}

// GetReview returns a review by ID
func (s *ReviewService) GetReview(reviewID int, userID int) (*Review, error) {
	review, err := s.reviewRepo.GetByID(reviewID)
	if err != nil {
		return nil, err
	}
	if review == nil {
		return nil, errors.New("review not found")
	}

	// Check membership
	isMember, err := s.memberRepo.IsUserMember(review.ProjectID, userID)
	if err != nil {
		return nil, err
	}
	if !isMember {
		return nil, errors.New("you are not a member of this project")
	}

	return review, nil
}

// GetProjectReviews returns paginated reviews for a project
func (s *ReviewService) GetProjectReviews(projectID int, page, pageSize int, userID int) ([]Review, int64, error) {
	// Check membership
	isMember, err := s.memberRepo.IsUserMember(projectID, userID)
	if err != nil {
		return nil, 0, err
	}
	if !isMember {
		return nil, 0, errors.New("you are not a member of this project")
	}

	offset := (page - 1) * pageSize
	return s.reviewRepo.GetByProjectID(projectID, offset, pageSize)
}

// GetReviewItems returns review items for a specific review
func (s *ReviewService) GetReviewItems(reviewID int, userID int) ([]ReviewItem, error) {
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
		return nil, errors.New("you are not a member of this project")
	}

	return s.reviewRepo.GetItemsByReviewID(reviewID)
}

// UpdateReview updates review details
func (s *ReviewService) UpdateReview(reviewID int, title, description, summary string, updatedBy int) (*Review, error) {
	review, err := s.reviewRepo.GetByID(reviewID)
	if err != nil {
		return nil, err
	}
	if review == nil {
		return nil, errors.New("review not found")
	}

	isManager, err := s.memberRepo.IsUserAdmin(review.ProjectID, updatedBy)
	if err != nil {
		return nil, err
	}
	if !isManager {
		return nil, errors.New("only project managers can update reviews")
	}

	if review.Status == ReviewStatusPublished {
		return nil, errors.New("cannot update a published review")
	}

	review.Title = title
	review.Description = description
	review.Summary = summary
	review.UpdatedAt = time.Now()

	if err := s.reviewRepo.Update(review); err != nil {
		return nil, err
	}

	return review, nil
}

// PublishReview publishes a review
func (s *ReviewService) PublishReview(reviewID int, userID int) (*Review, error) {
	review, err := s.reviewRepo.GetByID(reviewID)
	if err != nil {
		return nil, err
	}
	if review == nil {
		return nil, errors.New("review not found")
	}

	isManager, err := s.memberRepo.IsUserAdmin(review.ProjectID, userID)
	if err != nil {
		return nil, err
	}
	if !isManager {
		return nil, errors.New("only project managers can publish reviews")
	}

	if review.Status == ReviewStatusPublished {
		return nil, errors.New("review is already published")
	}

	review.Status = ReviewStatusPublished
	review.UpdatedAt = time.Now()

	if err := s.reviewRepo.Update(review); err != nil {
		return nil, err
	}

	if err := s.statusRepo.LogChange(review.ProjectID, status_changes.ItemTypeReview, review.ID, ReviewStatusDraft, review.Status, &userID); err != nil {
		return nil, err
	}

	return review, nil
}

// DeleteReview deletes a review
func (s *ReviewService) DeleteReview(reviewID int, userID int) error {
	review, err := s.reviewRepo.GetByID(reviewID)
	if err != nil {
		return err
	}
	if review == nil {
		return errors.New("review not found")
	}

	isManager, err := s.memberRepo.IsUserAdmin(review.ProjectID, userID)
	if err != nil {
		return err
	}
	if !isManager {
		return errors.New("only project managers can delete reviews")
	}

	// Delete items first
	if err := s.reviewRepo.DeleteItemsByReviewID(reviewID); err != nil {
		return err
	}

	return s.reviewRepo.Delete(reviewID)
}

// RegenerateReviewItems regenerates the review items (refreshing from current data)
func (s *ReviewService) RegenerateReviewItems(reviewID int, userID int) (*Review, error) {
	review, err := s.reviewRepo.GetByID(reviewID)
	if err != nil {
		return nil, err
	}
	if review == nil {
		return nil, errors.New("review not found")
	}

	isManager, err := s.memberRepo.IsUserAdmin(review.ProjectID, userID)
	if err != nil {
		return nil, err
	}
	if !isManager {
		return nil, errors.New("only project managers can regenerate reviews")
	}

	if review.Status == ReviewStatusPublished {
		return nil, errors.New("cannot regenerate a published review")
	}

	// Delete existing items
	if err := s.reviewRepo.DeleteItemsByReviewID(reviewID); err != nil {
		return nil, err
	}

	// Regenerate based on type
	if review.ReviewType == ReviewTypeSprint && review.SprintID != nil {
		sprint, err := s.sprintRepo.GetByID(*review.SprintID)
		if err != nil {
			return nil, err
		}
		if sprint != nil {
			if err := s.generateSprintReviewItems(review, sprint); err != nil {
				return nil, err
			}
		}
	} else {
		if err := s.generateCustomReviewItems(review); err != nil {
			return nil, err
		}
	}

	return review, nil
}

// generateSprintReviewItems creates review items for a sprint review
func (s *ReviewService) generateSprintReviewItems(review *Review, sprint *sprints.Sprint) error {
	var items []ReviewItem
	now := time.Now()

	// Get tasks in sprint (unlimited)
	sprintTasks, _, err := s.taskRepo.GetBySprintID(*review.SprintID, 0, 10000)
	if err != nil {
		return err
	}

	totalTasks := 0
	completedTasks := 0
	totalPoints := 0
	completedPoints := 0

	for _, t := range sprintTasks {
		totalTasks++
		category := categorizeTaskStatus(t.Status)
		if category == ReviewItemCategoryCompleted {
			completedTasks++
			completedPoints += 1 // tasks don't have points, count as 1
		}
		totalPoints += 1

		items = append(items, ReviewItem{
			ReviewID:   review.ID,
			ItemType:   ReviewItemTypeTask,
			ItemID:     t.ID,
			Title:      t.Title,
			Status:     t.Status,
			Priority:   t.Priority,
			AssignedTo: derefInt(t.AssigneeID),
			Points:     0,
			Category:   category,
			CreatedAt:  now,
		})
	}

	// Get features in sprint
	sprintFeatures, err := s.featureRepo.GetByProjectIDAndSprintID(review.ProjectID, *review.SprintID)
	if err != nil {
		return err
	}

	for _, f := range sprintFeatures {
		totalTasks++
		category := categorizeFeatureIssueStatus(f.Status)
		if category == ReviewItemCategoryCompleted {
			completedTasks++
			completedPoints += f.Points
		}
		totalPoints += f.Points

		items = append(items, ReviewItem{
			ReviewID:   review.ID,
			ItemType:   ReviewItemTypeFeature,
			ItemID:     f.ID,
			RefNum:     f.RefNum,
			Title:      f.Title,
			Status:     f.Status,
			Priority:   f.Priority,
			AssignedTo: f.AssignedTo,
			Points:     f.Points,
			Category:   category,
			CreatedAt:  now,
		})
	}

	// Get issues in sprint
	sprintIssues, err := s.issueRepo.GetByProjectIDAndSprintID(review.ProjectID, *review.SprintID)
	if err != nil {
		return err
	}

	for _, i := range sprintIssues {
		totalTasks++
		category := categorizeFeatureIssueStatus(i.Status)
		if category == ReviewItemCategoryCompleted {
			completedTasks++
			completedPoints += i.Points
		}
		totalPoints += i.Points

		items = append(items, ReviewItem{
			ReviewID:   review.ID,
			ItemType:   ReviewItemTypeIssue,
			ItemID:     i.ID,
			RefNum:     i.RefNum,
			Title:      i.Title,
			Status:     i.Status,
			Priority:   i.Priority,
			AssignedTo: i.AssignedTo,
			Points:     i.Points,
			Category:   category,
			CreatedAt:  now,
		})
	}

	// Get open ideas for prioritization
	openIdeas, _, err := s.ideaRepo.GetByProjectIDAndStatus(review.ProjectID, ideas.IdeaStatusOpen, 0, 100)
	if err != nil {
		return err
	}

	for _, idea := range openIdeas {
		items = append(items, ReviewItem{
			ReviewID:  review.ID,
			ItemType:  ReviewItemTypeIdea,
			ItemID:    idea.ID,
			RefNum:    idea.RefNum,
			Title:     idea.Title,
			Status:    idea.Status,
			Category:  ReviewItemCategoryPrioritization,
			CreatedAt: now,
		})
	}

	// Batch create items
	if err := s.reviewRepo.CreateItems(items); err != nil {
		return err
	}

	// Update metrics on the review
	var completionRate float64
	if totalTasks > 0 {
		completionRate = float64(completedTasks) / float64(totalTasks) * 100
	}

	review.TotalTasks = totalTasks
	review.CompletedTasks = completedTasks
	review.TotalPoints = totalPoints
	review.CompletedPoints = completedPoints
	review.CompletionRate = completionRate
	review.UpdatedAt = time.Now()

	return s.reviewRepo.Update(review)
}

// generateCustomReviewItems creates review items for a custom review
func (s *ReviewService) generateCustomReviewItems(review *Review) error {
	var items []ReviewItem
	now := time.Now()

	totalTasks := 0
	completedTasks := 0
	totalPoints := 0
	completedPoints := 0

	// Get all features for the project
	allFeatures, _, err := s.featureRepo.GetByProjectID(review.ProjectID, 0, 10000)
	if err != nil {
		return err
	}

	for _, f := range allFeatures {
		category := categorizeFeatureIssueStatus(f.Status)
		// For custom reviews, include all items
		totalTasks++
		if category == ReviewItemCategoryCompleted {
			completedTasks++
			completedPoints += f.Points
		}
		totalPoints += f.Points

		items = append(items, ReviewItem{
			ReviewID:   review.ID,
			ItemType:   ReviewItemTypeFeature,
			ItemID:     f.ID,
			RefNum:     f.RefNum,
			Title:      f.Title,
			Status:     f.Status,
			Priority:   f.Priority,
			AssignedTo: f.AssignedTo,
			Points:     f.Points,
			Category:   category,
			CreatedAt:  now,
		})
	}

	// Get all issues for the project
	allIssues, _, err := s.issueRepo.GetByProjectID(review.ProjectID, 0, 10000)
	if err != nil {
		return err
	}

	for _, i := range allIssues {
		category := categorizeFeatureIssueStatus(i.Status)
		totalTasks++
		if category == ReviewItemCategoryCompleted {
			completedTasks++
			completedPoints += i.Points
		}
		totalPoints += i.Points

		items = append(items, ReviewItem{
			ReviewID:   review.ID,
			ItemType:   ReviewItemTypeIssue,
			ItemID:     i.ID,
			RefNum:     i.RefNum,
			Title:      i.Title,
			Status:     i.Status,
			Priority:   i.Priority,
			AssignedTo: i.AssignedTo,
			Points:     i.Points,
			Category:   category,
			CreatedAt:  now,
		})
	}

	// Get open ideas for prioritization
	openIdeas, _, err := s.ideaRepo.GetByProjectIDAndStatus(review.ProjectID, ideas.IdeaStatusOpen, 0, 100)
	if err != nil {
		return err
	}

	for _, idea := range openIdeas {
		items = append(items, ReviewItem{
			ReviewID:  review.ID,
			ItemType:  ReviewItemTypeIdea,
			ItemID:    idea.ID,
			RefNum:    idea.RefNum,
			Title:     idea.Title,
			Status:    idea.Status,
			Category:  ReviewItemCategoryPrioritization,
			CreatedAt: now,
		})
	}

	// Batch create items
	if err := s.reviewRepo.CreateItems(items); err != nil {
		return err
	}

	// Update metrics
	var completionRate float64
	if totalTasks > 0 {
		completionRate = float64(completedTasks) / float64(totalTasks) * 100
	}

	review.TotalTasks = totalTasks
	review.CompletedTasks = completedTasks
	review.TotalPoints = totalPoints
	review.CompletedPoints = completedPoints
	review.CompletionRate = completionRate
	review.UpdatedAt = time.Now()

	return s.reviewRepo.Update(review)
}

// categorizeTaskStatus determines the review category for a task based on its status
func categorizeTaskStatus(status string) string {
	switch status {
	case tasks.TaskStatusCompleted, tasks.TaskStatusClosed:
		return ReviewItemCategoryCompleted
	case tasks.TaskStatusInProgress, tasks.TaskStatusOnHold, tasks.TaskStatusBlocked:
		return ReviewItemCategoryInProgress
	default:
		return ReviewItemCategoryDelayed
	}
}

// categorizeFeatureIssueStatus determines the review category for a feature/issue based on its status
func categorizeFeatureIssueStatus(status string) string {
	switch status {
	case features.FeatureStatusCompleted, features.FeatureStatusClosed:
		return ReviewItemCategoryCompleted
	case features.FeatureStatusInProgress, features.FeatureStatusInReview, features.FeatureStatusAssigned:
		return ReviewItemCategoryInProgress
	default:
		return ReviewItemCategoryDelayed
	}
}

func derefInt(p *int) int {
	if p == nil {
		return 0
	}
	return *p
}
