package workflow

import (
	"github.com/dannyswat/pjeasy/internal/features"
	"github.com/dannyswat/pjeasy/internal/issues"
	"github.com/dannyswat/pjeasy/internal/tasks"
)

// ItemRepository defines the interface for querying items by reference
type ItemRepository[T any] interface {
	GetByItemReference(projectID int, itemType string, itemID int, offset, limit int) ([]T, int64, error)
}

// IssueRepositoryInterface defines the interface for issue repository
type IssueRepositoryInterface interface {
	GetByItemReference(projectID int, itemType string, itemID int, offset, limit int) ([]issues.Issue, int64, error)
}

// FeatureRepositoryInterface defines the interface for feature repository
type FeatureRepositoryInterface interface {
	GetByItemReference(projectID int, itemType string, itemID int, offset, limit int) ([]features.Feature, int64, error)
}

// TaskRepositoryInterface defines the interface for task repository
type TaskRepositoryInterface interface {
	GetByItemReference(projectID int, itemType string, itemID int, offset, limit int) ([]tasks.Task, int64, error)
}

// DefaultRelatedItemsChecker implements RelatedItemsChecker
type DefaultRelatedItemsChecker struct {
	issueRepo   IssueRepositoryInterface
	featureRepo FeatureRepositoryInterface
	taskRepo    TaskRepositoryInterface
}

// NewRelatedItemsChecker creates a new RelatedItemsChecker
func NewRelatedItemsChecker(
	issueRepo IssueRepositoryInterface,
	featureRepo FeatureRepositoryInterface,
	taskRepo TaskRepositoryInterface,
) *DefaultRelatedItemsChecker {
	return &DefaultRelatedItemsChecker{
		issueRepo:   issueRepo,
		featureRepo: featureRepo,
		taskRepo:    taskRepo,
	}
}

// AreAllRelatedItemsCompleted checks if all issues, features, and tasks
// related to a service ticket are completed
func (c *DefaultRelatedItemsChecker) AreAllRelatedItemsCompleted(projectID int, serviceTicketID int) (bool, error) {
	const itemType = "service-tickets"
	const maxItems = 1000 // Reasonable limit for related items

	// Check all related issues
	relatedIssues, _, err := c.issueRepo.GetByItemReference(projectID, itemType, serviceTicketID, 0, maxItems)
	if err != nil {
		return false, err
	}

	for _, issue := range relatedIssues {
		if !isIssueCompleted(issue.Status) {
			return false, nil
		}
	}

	// Check all related features
	relatedFeatures, _, err := c.featureRepo.GetByItemReference(projectID, itemType, serviceTicketID, 0, maxItems)
	if err != nil {
		return false, err
	}

	for _, feature := range relatedFeatures {
		if !isFeatureCompleted(feature.Status) {
			return false, nil
		}
	}

	// Check all related tasks
	relatedTasks, _, err := c.taskRepo.GetByItemReference(projectID, itemType, serviceTicketID, 0, maxItems)
	if err != nil {
		return false, err
	}

	for _, task := range relatedTasks {
		if !isTaskCompleted(task.Status) {
			return false, nil
		}
	}

	// All items are completed (or there are no related items)
	return true, nil
}

// isIssueCompleted checks if an issue status indicates completion
func isIssueCompleted(status string) bool {
	return status == issues.IssueStatusCompleted || status == issues.IssueStatusClosed
}

// isFeatureCompleted checks if a feature status indicates completion
func isFeatureCompleted(status string) bool {
	return status == features.FeatureStatusCompleted || status == features.FeatureStatusClosed
}

// isTaskCompleted checks if a task status indicates completion
func isTaskCompleted(status string) bool {
	return status == tasks.TaskStatusCompleted || status == tasks.TaskStatusClosed
}

// Ensure DefaultRelatedItemsChecker implements RelatedItemsChecker
var _ RelatedItemsChecker = (*DefaultRelatedItemsChecker)(nil)
