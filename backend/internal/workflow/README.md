# Workflow Engine

The workflow engine provides a flexible, event-driven automation system for PJEasy. It allows defining rules that trigger actions based on domain events.

## Architecture

### Components

1. **Event**: A domain event that can trigger workflows
   - `Type`: Event identifier (e.g., "issue.status.changed")
   - `EntityID`: ID of the entity that triggered the event
   - `ProjectID`: Project context
   - `UserID`: User who triggered the event
   - `Data`: Additional event-specific data

2. **WorkflowCondition**: A condition that must be met for actions to execute
   - `Evaluate()`: Returns true if the condition is met

3. **WorkflowAction**: An action to be executed when a rule fires
   - `Execute()`: Performs the action

4. **WorkflowRule**: Maps events to actions with conditions
   - `EventType`: The event type that triggers this rule
   - `Conditions`: List of conditions that must all be met
   - `Actions`: List of actions to execute

5. **WorkflowEngine**: The core engine that manages rules and processes events

## Usage

### Registering Rules

```go
// Create the workflow engine
engine := workflow.NewWorkflowEngine()

// Create the related items checker
relatedItemsChecker := workflow.NewRelatedItemsChecker(issueRepo, featureRepo, taskRepo)

// Register default rules
workflow.RegisterDefaultRules(engine, serviceTicketService, relatedItemsChecker)

// Or create custom rules
rule := &workflow.WorkflowRule{
    Name:      "MyCustomRule",
    EventType: workflow.EventIssueStatusChanged,
    Conditions: []workflow.WorkflowCondition{
        workflow.NewStatusCondition("CheckStatus", "newStatus", "Completed"),
    },
    Actions: []workflow.WorkflowAction{
        workflow.NewLogAction("LogAction", "Custom action triggered"),
    },
}
engine.RegisterRule(rule)
```

### Triggering Events

```go
ctx := context.Background()
event := workflow.Event{
    Type:      workflow.EventIssueStatusChanged,
    EntityID:  issueID,
    ProjectID: projectID,
    UserID:    userID,
    Data: map[string]interface{}{
        "oldStatus": "InProgress",
        "newStatus": "Completed",
        "itemType":  "service-tickets",
        "itemId":    ticketID,
    },
}
engine.TriggerEvent(ctx, event)
```

## Default Rules

### CompleteServiceTicketOnIssueCompletion

When an issue is marked as "Completed" and it is linked to a service ticket, the service ticket is automatically marked as "Fulfilled" **only if all related items (issues, features, and tasks) are also completed**.

**Trigger**: `issue.status.changed`

**Conditions**:
- New status is "Completed"
- Issue has an item type of "service-tickets"
- Issue has a valid item ID
- All related issues, features, and tasks linked to the same service ticket are completed or closed

**Actions**:
- Log the event
- Update the service ticket status to "Fulfilled"

## Extending the Engine

### Adding New Conditions

```go
type MyCondition struct {
    name string
    // custom fields
}

func (c *MyCondition) Name() string {
    return c.name
}

func (c *MyCondition) Evaluate(ctx context.Context, event Event) (bool, error) {
    // Custom evaluation logic
    return true, nil
}
```

### Adding New Actions

```go
type MyAction struct {
    name string
    // dependencies
}

func (a *MyAction) Name() string {
    return a.name
}

func (a *MyAction) Execute(ctx context.Context, event Event) error {
    // Custom action logic
    return nil
}
```

## Async Processing

The workflow engine can process events asynchronously:

```go
engine := workflow.NewWorkflowEngine()
engine.StartAsync(3) // Start 3 worker goroutines

// Events will be processed asynchronously
engine.TriggerEvent(ctx, event)

// When shutting down
engine.Stop()
```
