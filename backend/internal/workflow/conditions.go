package workflow

import (
	"context"
)

// StatusCondition checks if the new status matches expected values
type StatusCondition struct {
	name           string
	expectedStatus string
	statusField    string // e.g., "newStatus", "oldStatus"
}

// NewStatusCondition creates a new status condition
func NewStatusCondition(name, statusField, expectedStatus string) *StatusCondition {
	return &StatusCondition{
		name:           name,
		statusField:    statusField,
		expectedStatus: expectedStatus,
	}
}

func (c *StatusCondition) Name() string {
	return c.name
}

func (c *StatusCondition) Evaluate(ctx context.Context, event Event) (bool, error) {
	status, ok := event.Data[c.statusField].(string)
	if !ok {
		return false, nil
	}
	return status == c.expectedStatus, nil
}

// HasLinkedItemCondition checks if the entity has a linked item of a specific type
type HasLinkedItemCondition struct {
	name         string
	itemTypeKey  string
	expectedType string
}

// NewHasLinkedItemCondition creates a condition that checks for linked items
func NewHasLinkedItemCondition(name, itemTypeKey, expectedType string) *HasLinkedItemCondition {
	return &HasLinkedItemCondition{
		name:         name,
		itemTypeKey:  itemTypeKey,
		expectedType: expectedType,
	}
}

func (c *HasLinkedItemCondition) Name() string {
	return c.name
}

func (c *HasLinkedItemCondition) Evaluate(ctx context.Context, event Event) (bool, error) {
	itemType, ok := event.Data[c.itemTypeKey].(string)
	if !ok {
		return false, nil
	}
	return itemType == c.expectedType, nil
}

// HasItemIDCondition checks if the entity has a valid item ID
type HasItemIDCondition struct {
	name      string
	itemIDKey string
}

// NewHasItemIDCondition creates a condition that checks for a valid item ID
func NewHasItemIDCondition(name, itemIDKey string) *HasItemIDCondition {
	return &HasItemIDCondition{
		name:      name,
		itemIDKey: itemIDKey,
	}
}

func (c *HasItemIDCondition) Name() string {
	return c.name
}

func (c *HasItemIDCondition) Evaluate(ctx context.Context, event Event) (bool, error) {
	itemID, ok := event.Data[c.itemIDKey]
	if !ok {
		return false, nil
	}

	// Check if itemID is not nil and has a valid value
	switch v := itemID.(type) {
	case int:
		return v > 0, nil
	case *int:
		return v != nil && *v > 0, nil
	default:
		return false, nil
	}
}

// CompositeCondition combines multiple conditions with AND/OR logic
type CompositeCondition struct {
	name       string
	conditions []WorkflowCondition
	operator   string // "AND" or "OR"
}

// NewAndCondition creates a composite condition with AND logic
func NewAndCondition(name string, conditions ...WorkflowCondition) *CompositeCondition {
	return &CompositeCondition{
		name:       name,
		conditions: conditions,
		operator:   "AND",
	}
}

// NewOrCondition creates a composite condition with OR logic
func NewOrCondition(name string, conditions ...WorkflowCondition) *CompositeCondition {
	return &CompositeCondition{
		name:       name,
		conditions: conditions,
		operator:   "OR",
	}
}

func (c *CompositeCondition) Name() string {
	return c.name
}

func (c *CompositeCondition) Evaluate(ctx context.Context, event Event) (bool, error) {
	if len(c.conditions) == 0 {
		return true, nil
	}

	for _, condition := range c.conditions {
		met, err := condition.Evaluate(ctx, event)
		if err != nil {
			return false, err
		}

		if c.operator == "OR" && met {
			return true, nil
		}
		if c.operator == "AND" && !met {
			return false, nil
		}
	}

	// For AND: all conditions met; For OR: no condition met
	return c.operator == "AND", nil
}

// RelatedItemsChecker is an interface for checking if all related items are completed
type RelatedItemsChecker interface {
	// AreAllRelatedItemsCompleted checks if all issues, features, and tasks
	// related to a service ticket are completed
	AreAllRelatedItemsCompleted(projectID int, serviceTicketID int) (bool, error)
}

// AllRelatedItemsCompletedCondition checks if all related items for a service ticket are completed
type AllRelatedItemsCompletedCondition struct {
	name    string
	checker RelatedItemsChecker
}

// NewAllRelatedItemsCompletedCondition creates a condition that checks if all related items are completed
func NewAllRelatedItemsCompletedCondition(name string, checker RelatedItemsChecker) *AllRelatedItemsCompletedCondition {
	return &AllRelatedItemsCompletedCondition{
		name:    name,
		checker: checker,
	}
}

func (c *AllRelatedItemsCompletedCondition) Name() string {
	return c.name
}

func (c *AllRelatedItemsCompletedCondition) Evaluate(ctx context.Context, event Event) (bool, error) {
	// Get the service ticket ID from the event data
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

	return c.checker.AreAllRelatedItemsCompleted(event.ProjectID, ticketID)
}
