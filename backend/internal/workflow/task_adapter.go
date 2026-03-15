package workflow

import (
	"context"
	"log"

	"github.com/dannyswat/pjeasy/internal/tasks"
)

// TaskWorkflowAdapter adapts the workflow engine to handle task events
type TaskWorkflowAdapter struct {
	engine *WorkflowEngine
}

// NewTaskWorkflowAdapter creates a new adapter for task workflow events
func NewTaskWorkflowAdapter(engine *WorkflowEngine) *TaskWorkflowAdapter {
	return &TaskWorkflowAdapter{
		engine: engine,
	}
}

// OnTaskStatusChanged handles task status change events by triggering the workflow engine
func (a *TaskWorkflowAdapter) OnTaskStatusChanged(ctx context.Context, task *tasks.Task, oldStatus, newStatus string, userID int) error {
	if a.engine == nil {
		log.Printf("[Workflow] Warning: workflow engine not initialized")
		return nil
	}

	event := Event{
		Type:      EventTaskStatusChanged,
		EntityID:  task.ID,
		ProjectID: task.ProjectID,
		UserID:    userID,
		Data: map[string]interface{}{
			"oldStatus": oldStatus,
			"newStatus": newStatus,
			"itemType":  task.ItemType,
			"itemId":    task.ItemID,
		},
	}

	log.Printf("[Workflow] Triggering event: %s for task %d (status: %s -> %s)",
		event.Type, task.ID, oldStatus, newStatus)

	return a.engine.TriggerEvent(ctx, event)
}

// Ensure TaskWorkflowAdapter implements the tasks.StatusChangeHandler interface
var _ tasks.StatusChangeHandler = (*TaskWorkflowAdapter)(nil)
