package workflow

import (
	"github.com/dannyswat/pjeasy/internal/features"
	"github.com/dannyswat/pjeasy/internal/ideas"
	"github.com/dannyswat/pjeasy/internal/issues"
	"github.com/dannyswat/pjeasy/internal/service_tickets"
	"github.com/dannyswat/pjeasy/internal/tasks"
)

// RegisterDefaultRules registers the default workflow rules
func RegisterDefaultRules(
	engine *WorkflowEngine,
	ticketUpdater ServiceTicketStatusUpdater,
	issueUpdater IssueStatusUpdater,
	featureUpdater FeatureStatusUpdater,
	ideaUpdater IdeaStatusUpdater,
	relatedItemsChecker RelatedItemsChecker,
	cascadeChecker *CascadeCompletionChecker,
	cascadeTicketChecker *CascadeServiceTicketChecker,
) {
	// Rule 1: When an issue is completed and linked to a service ticket with cascade completion,
	// complete the service ticket if all related items are also completed
	completeServiceTicketOnIssueRule := &WorkflowRule{
		Name:      "CompleteServiceTicketOnIssueCompletion",
		EventType: EventIssueStatusChanged,
		Conditions: []WorkflowCondition{
			NewStatusCondition("IsIssueCompleted", "newStatus", issues.IssueStatusCompleted),
			NewHasLinkedItemCondition("HasServiceTicketLink", "itemType", "service-tickets"),
			NewHasItemIDCondition("HasValidItemId", "itemId"),
			NewServiceTicketCascadeCondition("ServiceTicketCascadeEnabled", cascadeTicketChecker),
		},
		Actions: []WorkflowAction{
			NewLogAction("LogIssueCompletion", "All related items completed, triggering service ticket fulfillment"),
			NewCompleteServiceTicketAction(ticketUpdater, service_tickets.ServiceTicketStatusFulfilled),
		},
	}
	engine.RegisterRule(completeServiceTicketOnIssueRule)

	// Rule 2: When a feature is completed and linked to a service ticket with cascade completion,
	// complete the service ticket if all related items are also completed
	completeServiceTicketOnFeatureRule := &WorkflowRule{
		Name:      "CompleteServiceTicketOnFeatureCompletion",
		EventType: EventFeatureStatusChanged,
		Conditions: []WorkflowCondition{
			NewStatusCondition("IsFeatureCompleted", "newStatus", features.FeatureStatusCompleted),
			NewHasLinkedItemCondition("HasServiceTicketLink", "itemType", "service-tickets"),
			NewHasItemIDCondition("HasValidItemId", "itemId"),
			NewServiceTicketCascadeCondition("ServiceTicketCascadeEnabled", cascadeTicketChecker),
		},
		Actions: []WorkflowAction{
			NewLogAction("LogFeatureCompletion", "All related items completed, triggering service ticket fulfillment"),
			NewCompleteServiceTicketAction(ticketUpdater, service_tickets.ServiceTicketStatusFulfilled),
		},
	}
	engine.RegisterRule(completeServiceTicketOnFeatureRule)

	// Rule 3: When a feature is completed and linked to an idea with cascade completion,
	// close the idea if all related tasks and features are also completed
	completeIdeaOnFeatureRule := &WorkflowRule{
		Name:      "CompleteIdeaOnFeatureCompletion",
		EventType: EventFeatureStatusChanged,
		Conditions: []WorkflowCondition{
			NewStatusCondition("IsFeatureCompleted", "newStatus", features.FeatureStatusCompleted),
			NewHasLinkedItemCondition("HasIdeaLink", "itemType", "ideas"),
			NewHasItemIDCondition("HasValidIdeaId", "itemId"),
			NewCascadeCompletionCondition("IdeaCascadeEnabled", cascadeChecker),
		},
		Actions: []WorkflowAction{
			NewLogAction("LogIdeaFeatureCompletion", "All related idea items completed, triggering idea closure"),
			NewCompleteIdeaAction(ideaUpdater, ideas.IdeaStatusClosed),
		},
	}
	engine.RegisterRule(completeIdeaOnFeatureRule)

	// Rule 4: When a task is completed and linked to an issue/feature/idea with cascade completion,
	// complete the parent if all sibling tasks are also completed
	cascadeCompleteParentOnTaskRule := &WorkflowRule{
		Name:      "CascadeCompleteParentOnTaskCompletion",
		EventType: EventTaskStatusChanged,
		Conditions: []WorkflowCondition{
			NewStatusCondition("IsTaskCompleted", "newStatus", tasks.TaskStatusCompleted),
			NewHasItemIDCondition("HasValidParentId", "itemId"),
			NewCascadeCompletionCondition("ParentCascadeEnabled", cascadeChecker),
		},
		Actions: []WorkflowAction{
			NewLogAction("LogTaskCascade", "All sibling tasks completed, cascade completing parent item"),
			NewCompleteIssueAction(issueUpdater, issues.IssueStatusCompleted),
			NewCompleteFeatureAction(featureUpdater, features.FeatureStatusCompleted),
			NewCompleteIdeaAction(ideaUpdater, ideas.IdeaStatusClosed),
		},
	}
	engine.RegisterRule(cascadeCompleteParentOnTaskRule)
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
