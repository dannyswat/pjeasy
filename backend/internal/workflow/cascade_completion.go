package workflow

import (
	"context"
	"errors"
	"fmt"
	"log"

	"github.com/dannyswat/pjeasy/internal/features"
	"github.com/dannyswat/pjeasy/internal/ideas"
	"github.com/dannyswat/pjeasy/internal/issues"
)

// IssueStatusUpdater is an interface for updating issue status from the workflow
type IssueStatusUpdater interface {
	UpdateIssueStatusByWorkflow(issueID int, status string) error
}

// FeatureStatusUpdater is an interface for updating feature status from the workflow
type FeatureStatusUpdater interface {
	UpdateFeatureStatusByWorkflow(featureID int, status string) error
}

// IdeaStatusUpdater is an interface for updating idea status from the workflow
type IdeaStatusUpdater interface {
	UpdateIdeaStatusByWorkflow(ideaID int, status string) error
}

// IssueByIDGetter interface for getting issue by ID
type IssueByIDGetter interface {
	GetByID(id int) (*issues.Issue, error)
}

// FeatureByIDGetter interface for getting feature by ID
type FeatureByIDGetter interface {
	GetByID(id int) (*features.Feature, error)
}

// IdeaByIDGetter interface for getting idea by ID
type IdeaByIDGetter interface {
	GetByID(id int) (*ideas.Idea, error)
}

// CascadeCompletionChecker checks if a parent item should be cascade-completed
type CascadeCompletionChecker struct {
	issueGetter   IssueByIDGetter
	featureGetter FeatureByIDGetter
	ideaGetter    IdeaByIDGetter
	featureRepo   FeatureRepositoryInterface
	taskRepo      TaskRepositoryInterface
}

// NewCascadeCompletionChecker creates a new CascadeCompletionChecker
func NewCascadeCompletionChecker(
	issueGetter IssueByIDGetter,
	featureGetter FeatureByIDGetter,
	ideaGetter IdeaByIDGetter,
	featureRepo FeatureRepositoryInterface,
	taskRepo TaskRepositoryInterface,
) *CascadeCompletionChecker {
	return &CascadeCompletionChecker{
		issueGetter:   issueGetter,
		featureGetter: featureGetter,
		ideaGetter:    ideaGetter,
		featureRepo:   featureRepo,
		taskRepo:      taskRepo,
	}
}

// ShouldCascadeCompleteParent checks if the parent item (issue/feature) of a task
// has cascade completion enabled and all sibling tasks are completed
func (c *CascadeCompletionChecker) ShouldCascadeCompleteParent(projectID int, itemType string, itemID int) (bool, error) {
	const maxItems = 1000

	switch itemType {
	case "issues":
		issue, err := c.issueGetter.GetByID(itemID)
		if err != nil || issue == nil {
			return false, err
		}
		if !issue.CascadeCompletion {
			return false, nil
		}
		// Check if issue is already completed
		if issue.Status == issues.IssueStatusCompleted || issue.Status == issues.IssueStatusClosed {
			return false, nil
		}
		// Check all tasks linked to this issue
		relatedTasks, _, err := c.taskRepo.GetByItemReference(projectID, "issues", itemID, 0, maxItems)
		if err != nil {
			return false, err
		}
		if len(relatedTasks) == 0 {
			return false, nil // No tasks, nothing to cascade
		}
		for _, task := range relatedTasks {
			if !isTaskCompleted(task.Status) {
				return false, nil
			}
		}
		return true, nil

	case "features":
		feature, err := c.featureGetter.GetByID(itemID)
		if err != nil || feature == nil {
			return false, err
		}
		if !feature.CascadeCompletion {
			return false, nil
		}
		// Check if feature is already completed
		if feature.Status == features.FeatureStatusCompleted || feature.Status == features.FeatureStatusClosed {
			return false, nil
		}
		// Check all tasks linked to this feature
		relatedTasks, _, err := c.taskRepo.GetByItemReference(projectID, "features", itemID, 0, maxItems)
		if err != nil {
			return false, err
		}
		if len(relatedTasks) == 0 {
			return false, nil
		}
		for _, task := range relatedTasks {
			if !isTaskCompleted(task.Status) {
				return false, nil
			}
		}
		return true, nil

	case "ideas":
		idea, err := c.ideaGetter.GetByID(itemID)
		if err != nil || idea == nil {
			return false, err
		}
		if !idea.CascadeCompletion {
			return false, nil
		}
		if idea.Status == ideas.IdeaStatusClosed {
			return false, nil
		}

		relatedTasks, _, err := c.taskRepo.GetByItemReference(projectID, "ideas", itemID, 0, maxItems)
		if err != nil {
			return false, err
		}

		relatedFeatures, _, err := c.featureRepo.GetByItemReference(projectID, "ideas", itemID, 0, maxItems)
		if err != nil {
			return false, err
		}

		if len(relatedTasks) == 0 && len(relatedFeatures) == 0 {
			return false, nil
		}

		for _, task := range relatedTasks {
			if !isTaskCompleted(task.Status) {
				return false, nil
			}
		}

		for _, feature := range relatedFeatures {
			if !isFeatureCompleted(feature.Status) {
				return false, nil
			}
		}

		return true, nil

	default:
		return false, nil
	}
}

// CascadeCompletionCondition checks if a parent item should be cascade-completed
type CascadeCompletionCondition struct {
	name    string
	checker *CascadeCompletionChecker
}

// NewCascadeCompletionCondition creates a new condition
func NewCascadeCompletionCondition(name string, checker *CascadeCompletionChecker) *CascadeCompletionCondition {
	return &CascadeCompletionCondition{
		name:    name,
		checker: checker,
	}
}

func (c *CascadeCompletionCondition) Name() string {
	return c.name
}

func (c *CascadeCompletionCondition) Evaluate(ctx context.Context, event Event) (bool, error) {
	itemType, ok := event.Data["itemType"].(string)
	if !ok || itemType == "" {
		return false, nil
	}

	itemID, ok := event.Data["itemId"]
	if !ok {
		return false, nil
	}

	var id int
	switch v := itemID.(type) {
	case int:
		id = v
	case *int:
		if v == nil {
			return false, nil
		}
		id = *v
	default:
		return false, nil
	}

	if id <= 0 {
		return false, nil
	}

	return c.checker.ShouldCascadeCompleteParent(event.ProjectID, itemType, id)
}

// CompleteIssueAction completes a parent issue via cascade
type CompleteIssueAction struct {
	name         string
	issueUpdater IssueStatusUpdater
	targetStatus string
}

// NewCompleteIssueAction creates an action to complete an issue
func NewCompleteIssueAction(issueUpdater IssueStatusUpdater, targetStatus string) *CompleteIssueAction {
	return &CompleteIssueAction{
		name:         "CompleteIssue",
		issueUpdater: issueUpdater,
		targetStatus: targetStatus,
	}
}

func (a *CompleteIssueAction) Name() string {
	return a.name
}

func (a *CompleteIssueAction) Execute(ctx context.Context, event Event) error {
	itemType, ok := event.Data["itemType"].(string)
	if !ok || itemType != "issues" {
		return nil // Not an issue parent, skip
	}

	itemID, ok := event.Data["itemId"]
	if !ok {
		return errors.New("itemId not found in event data")
	}

	var issueID int
	switch v := itemID.(type) {
	case int:
		issueID = v
	case *int:
		if v == nil {
			return errors.New("itemId is nil")
		}
		issueID = *v
	default:
		return fmt.Errorf("unexpected itemId type: %T", itemID)
	}

	log.Printf("[Workflow] Cascade completing issue %d with status %s", issueID, a.targetStatus)
	return a.issueUpdater.UpdateIssueStatusByWorkflow(issueID, a.targetStatus)
}

// CompleteFeatureAction completes a parent feature via cascade
type CompleteFeatureAction struct {
	name           string
	featureUpdater FeatureStatusUpdater
	targetStatus   string
}

// CompleteIdeaAction closes a parent idea via cascade
type CompleteIdeaAction struct {
	name         string
	ideaUpdater  IdeaStatusUpdater
	targetStatus string
}

// NewCompleteFeatureAction creates an action to complete a feature
func NewCompleteFeatureAction(featureUpdater FeatureStatusUpdater, targetStatus string) *CompleteFeatureAction {
	return &CompleteFeatureAction{
		name:           "CompleteFeature",
		featureUpdater: featureUpdater,
		targetStatus:   targetStatus,
	}
}

func (a *CompleteFeatureAction) Name() string {
	return a.name
}

func (a *CompleteFeatureAction) Execute(ctx context.Context, event Event) error {
	itemType, ok := event.Data["itemType"].(string)
	if !ok || itemType != "features" {
		return nil // Not a feature parent, skip
	}

	itemID, ok := event.Data["itemId"]
	if !ok {
		return errors.New("itemId not found in event data")
	}

	var featureID int
	switch v := itemID.(type) {
	case int:
		featureID = v
	case *int:
		if v == nil {
			return errors.New("itemId is nil")
		}
		featureID = *v
	default:
		return fmt.Errorf("unexpected itemId type: %T", itemID)
	}

	log.Printf("[Workflow] Cascade completing feature %d with status %s", featureID, a.targetStatus)
	return a.featureUpdater.UpdateFeatureStatusByWorkflow(featureID, a.targetStatus)
}

// NewCompleteIdeaAction creates an action to close an idea
func NewCompleteIdeaAction(ideaUpdater IdeaStatusUpdater, targetStatus string) *CompleteIdeaAction {
	return &CompleteIdeaAction{
		name:         "CompleteIdea",
		ideaUpdater:  ideaUpdater,
		targetStatus: targetStatus,
	}
}

func (a *CompleteIdeaAction) Name() string {
	return a.name
}

func (a *CompleteIdeaAction) Execute(ctx context.Context, event Event) error {
	itemType, ok := event.Data["itemType"].(string)
	if !ok || itemType != "ideas" {
		return nil
	}

	itemID, ok := event.Data["itemId"]
	if !ok {
		return errors.New("itemId not found in event data")
	}

	var ideaID int
	switch v := itemID.(type) {
	case int:
		ideaID = v
	case *int:
		if v == nil {
			return errors.New("itemId is nil")
		}
		ideaID = *v
	default:
		return fmt.Errorf("unexpected itemId type: %T", itemID)
	}

	log.Printf("[Workflow] Cascade completing idea %d with status %s", ideaID, a.targetStatus)
	return a.ideaUpdater.UpdateIdeaStatusByWorkflow(ideaID, a.targetStatus)
}

// ServiceTicketCascadeChecker checks if a service ticket has cascade completion enabled
// and all related items are completed

// ServiceTicketCascadeGetter gets a service ticket to check cascade flag
type ServiceTicketCascadeGetter interface {
	GetCascadeCompletion(ticketID int) (bool, error)
}

// CascadeServiceTicketChecker checks service ticket cascade completion
type CascadeServiceTicketChecker struct {
	ticketRepo          ServiceTicketCascadeGetter
	relatedItemsChecker RelatedItemsChecker
}

// NewCascadeServiceTicketChecker creates a new checker
func NewCascadeServiceTicketChecker(ticketRepo ServiceTicketCascadeGetter, relatedItemsChecker RelatedItemsChecker) *CascadeServiceTicketChecker {
	return &CascadeServiceTicketChecker{
		ticketRepo:          ticketRepo,
		relatedItemsChecker: relatedItemsChecker,
	}
}

// NewServiceTicketCascadeCondition creates a condition that checks if a service ticket
// has cascade completion enabled and all related items are completed
func NewServiceTicketCascadeCondition(name string, checker *CascadeServiceTicketChecker) *CascadeServiceTicketCondition {
	return &CascadeServiceTicketCondition{
		name:    name,
		checker: checker,
	}
}

// ShouldCascadeComplete checks if a service ticket should be cascade-completed
func (c *CascadeServiceTicketChecker) ShouldCascadeComplete(projectID int, ticketID int) (bool, error) {
	hasCascade, err := c.ticketRepo.GetCascadeCompletion(ticketID)
	if err != nil {
		return false, err
	}
	if !hasCascade {
		return false, nil
	}

	return c.relatedItemsChecker.AreAllRelatedItemsCompleted(projectID, ticketID)
}

// CascadeServiceTicketCondition is a workflow condition for service ticket cascade
type CascadeServiceTicketCondition struct {
	name    string
	checker *CascadeServiceTicketChecker
}

func (c *CascadeServiceTicketCondition) Name() string {
	return c.name
}

func (c *CascadeServiceTicketCondition) Evaluate(ctx context.Context, event Event) (bool, error) {
	itemID, ok := event.Data["itemId"]
	if !ok {
		return false, nil
	}

	var ticketID int
	switch v := itemID.(type) {
	case int:
		ticketID = v
	case *int:
		if v == nil {
			return false, nil
		}
		ticketID = *v
	default:
		return false, nil
	}

	if ticketID <= 0 {
		return false, nil
	}

	return c.checker.ShouldCascadeComplete(event.ProjectID, ticketID)
}
