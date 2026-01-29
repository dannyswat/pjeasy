package workflow

import (
	"context"
	"log"

	"github.com/dannyswat/pjeasy/internal/issues"
)

// IssueWorkflowAdapter adapts the workflow engine to handle issue events
type IssueWorkflowAdapter struct {
	engine *WorkflowEngine
}

// NewIssueWorkflowAdapter creates a new adapter for issue workflow events
func NewIssueWorkflowAdapter(engine *WorkflowEngine) *IssueWorkflowAdapter {
	return &IssueWorkflowAdapter{
		engine: engine,
	}
}

// OnIssueStatusChanged handles issue status change events by triggering the workflow engine
func (a *IssueWorkflowAdapter) OnIssueStatusChanged(ctx context.Context, issue *issues.Issue, oldStatus, newStatus string, userID int) error {
	if a.engine == nil {
		log.Printf("[Workflow] Warning: workflow engine not initialized")
		return nil
	}

	event := Event{
		Type:      EventIssueStatusChanged,
		EntityID:  issue.ID,
		ProjectID: issue.ProjectID,
		UserID:    userID,
		Data: map[string]interface{}{
			"oldStatus": oldStatus,
			"newStatus": newStatus,
			"itemType":  issue.ItemType,
			"itemId":    issue.ItemID,
			"refNum":    issue.RefNum,
			"title":     issue.Title,
		},
	}

	log.Printf("[Workflow] Triggering event: %s for issue %d (status: %s -> %s)",
		event.Type, issue.ID, oldStatus, newStatus)

	return a.engine.TriggerEvent(ctx, event)
}

// Ensure IssueWorkflowAdapter implements the StatusChangeHandler interface
var _ issues.StatusChangeHandler = (*IssueWorkflowAdapter)(nil)
