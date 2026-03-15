package workflow

import (
	"context"
	"log"

	"github.com/dannyswat/pjeasy/internal/features"
)

// FeatureWorkflowAdapter adapts the workflow engine to handle feature events
type FeatureWorkflowAdapter struct {
	engine *WorkflowEngine
}

// NewFeatureWorkflowAdapter creates a new adapter for feature workflow events
func NewFeatureWorkflowAdapter(engine *WorkflowEngine) *FeatureWorkflowAdapter {
	return &FeatureWorkflowAdapter{
		engine: engine,
	}
}

// OnFeatureStatusChanged handles feature status change events by triggering the workflow engine
func (a *FeatureWorkflowAdapter) OnFeatureStatusChanged(ctx context.Context, feature *features.Feature, oldStatus, newStatus string, userID int) error {
	if a.engine == nil {
		log.Printf("[Workflow] Warning: workflow engine not initialized")
		return nil
	}

	event := Event{
		Type:      EventFeatureStatusChanged,
		EntityID:  feature.ID,
		ProjectID: feature.ProjectID,
		UserID:    userID,
		Data: map[string]interface{}{
			"oldStatus": oldStatus,
			"newStatus": newStatus,
			"itemType":  feature.ItemType,
			"itemId":    feature.ItemID,
		},
	}

	log.Printf("[Workflow] Triggering event: %s for feature %d (status: %s -> %s)",
		event.Type, feature.ID, oldStatus, newStatus)

	return a.engine.TriggerEvent(ctx, event)
}

// Ensure FeatureWorkflowAdapter implements the features.StatusChangeHandler interface
var _ features.StatusChangeHandler = (*FeatureWorkflowAdapter)(nil)
