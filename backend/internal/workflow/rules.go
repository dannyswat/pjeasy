package workflow

import (
	"github.com/dannyswat/pjeasy/internal/issues"
	"github.com/dannyswat/pjeasy/internal/service_tickets"
)

// RegisterDefaultRules registers the default workflow rules
func RegisterDefaultRules(engine *WorkflowEngine, ticketUpdater ServiceTicketStatusUpdater, relatedItemsChecker RelatedItemsChecker) {
	// Rule: When an issue is completed, complete the related service ticket
	// only if all related issues, features, and tasks are also completed
	completeServiceTicketRule := &WorkflowRule{
		Name:      "CompleteServiceTicketOnIssueCompletion",
		EventType: EventIssueStatusChanged,
		Conditions: []WorkflowCondition{
			NewStatusCondition("IsIssueCompleted", "newStatus", issues.IssueStatusCompleted),
			NewHasLinkedItemCondition("HasServiceTicketLink", "itemType", "service-tickets"),
			NewHasItemIDCondition("HasValidItemId", "itemId"),
			NewAllRelatedItemsCompletedCondition("AllRelatedItemsCompleted", relatedItemsChecker),
		},
		Actions: []WorkflowAction{
			NewLogAction("LogIssueCompletion", "All related items completed, triggering service ticket fulfillment"),
			NewCompleteServiceTicketAction(ticketUpdater, service_tickets.ServiceTicketStatusFulfilled),
		},
	}

	engine.RegisterRule(completeServiceTicketRule)
}

// Additional rule builders for extensibility

// BuildStatusTransitionRule creates a rule for status transitions
func BuildStatusTransitionRule(name, eventType, statusField, fromStatus, toStatus string, actions ...WorkflowAction) *WorkflowRule {
	conditions := []WorkflowCondition{
		NewStatusCondition(name+"_ToStatus", statusField, toStatus),
	}

	if fromStatus != "" {
		conditions = append(conditions, NewStatusCondition(name+"_FromStatus", "oldStatus", fromStatus))
	}

	return &WorkflowRule{
		Name:       name,
		EventType:  eventType,
		Conditions: conditions,
		Actions:    actions,
	}
}

// BuildLinkedItemRule creates a rule for linked item operations
func BuildLinkedItemRule(name, eventType, itemType string, conditions []WorkflowCondition, actions []WorkflowAction) *WorkflowRule {
	allConditions := append([]WorkflowCondition{
		NewHasLinkedItemCondition(name+"_ItemType", "itemType", itemType),
		NewHasItemIDCondition(name+"_ItemId", "itemId"),
	}, conditions...)

	return &WorkflowRule{
		Name:       name,
		EventType:  eventType,
		Conditions: allConditions,
		Actions:    actions,
	}
}
