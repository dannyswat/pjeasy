package workflow

import (
	"context"
	"fmt"
	"log"
	"sync"
)

// Event represents a domain event that can trigger workflows
type Event struct {
	Type      string                 // Event type identifier (e.g., "issue.status.changed")
	EntityID  int                    // ID of the entity that triggered the event
	ProjectID int                    // Project context
	UserID    int                    // User who triggered the event
	Data      map[string]interface{} // Additional event data
}

// EventType constants
const (
	EventIssueStatusChanged         = "issue.status.changed"
	EventIssueCreated               = "issue.created"
	EventServiceTicketStatusChanged = "service_ticket.status.changed"
	EventTaskStatusChanged          = "task.status.changed"
)

// WorkflowAction defines an action to be executed by a workflow
type WorkflowAction interface {
	Execute(ctx context.Context, event Event) error
	Name() string
}

// WorkflowCondition defines a condition that must be met for an action to execute
type WorkflowCondition interface {
	Evaluate(ctx context.Context, event Event) (bool, error)
	Name() string
}

// WorkflowRule defines a rule that maps events to actions with optional conditions
type WorkflowRule struct {
	Name       string
	EventType  string
	Conditions []WorkflowCondition
	Actions    []WorkflowAction
}

// WorkflowEngine manages and executes workflow rules
type WorkflowEngine struct {
	rules   map[string][]*WorkflowRule // Map of event types to rules
	mu      sync.RWMutex
	asyncCh chan Event
	stopCh  chan struct{}
	wg      sync.WaitGroup
	isAsync bool
}

// NewWorkflowEngine creates a new workflow engine
func NewWorkflowEngine() *WorkflowEngine {
	return &WorkflowEngine{
		rules:   make(map[string][]*WorkflowRule),
		asyncCh: make(chan Event, 100),
		stopCh:  make(chan struct{}),
		isAsync: false,
	}
}

// RegisterRule registers a workflow rule with the engine
func (e *WorkflowEngine) RegisterRule(rule *WorkflowRule) {
	e.mu.Lock()
	defer e.mu.Unlock()

	if e.rules[rule.EventType] == nil {
		e.rules[rule.EventType] = make([]*WorkflowRule, 0)
	}
	e.rules[rule.EventType] = append(e.rules[rule.EventType], rule)
	log.Printf("[Workflow] Registered rule: %s for event: %s", rule.Name, rule.EventType)
}

// TriggerEvent triggers an event and executes matching workflow rules
func (e *WorkflowEngine) TriggerEvent(ctx context.Context, event Event) error {
	if e.isAsync {
		select {
		case e.asyncCh <- event:
			return nil
		default:
			log.Printf("[Workflow] Warning: event queue full, processing synchronously")
			return e.processEvent(ctx, event)
		}
	}
	return e.processEvent(ctx, event)
}

// processEvent processes an event synchronously
func (e *WorkflowEngine) processEvent(ctx context.Context, event Event) error {
	e.mu.RLock()
	rules, exists := e.rules[event.Type]
	e.mu.RUnlock()

	if !exists || len(rules) == 0 {
		return nil
	}

	var errs []error
	for _, rule := range rules {
		if err := e.executeRule(ctx, rule, event); err != nil {
			log.Printf("[Workflow] Error executing rule %s: %v", rule.Name, err)
			errs = append(errs, fmt.Errorf("rule %s: %w", rule.Name, err))
		}
	}

	if len(errs) > 0 {
		return fmt.Errorf("workflow errors: %v", errs)
	}
	return nil
}

// executeRule executes a single workflow rule
func (e *WorkflowEngine) executeRule(ctx context.Context, rule *WorkflowRule, event Event) error {
	// Check all conditions
	for _, condition := range rule.Conditions {
		met, err := condition.Evaluate(ctx, event)
		if err != nil {
			return fmt.Errorf("condition %s evaluation failed: %w", condition.Name(), err)
		}
		if !met {
			log.Printf("[Workflow] Rule %s: condition %s not met, skipping", rule.Name, condition.Name())
			return nil
		}
	}

	// Execute all actions
	for _, action := range rule.Actions {
		log.Printf("[Workflow] Executing action: %s for rule: %s", action.Name(), rule.Name)
		if err := action.Execute(ctx, event); err != nil {
			return fmt.Errorf("action %s failed: %w", action.Name(), err)
		}
	}

	return nil
}

// StartAsync starts the asynchronous event processing
func (e *WorkflowEngine) StartAsync(workers int) {
	e.isAsync = true
	for i := 0; i < workers; i++ {
		e.wg.Add(1)
		go e.worker(i)
	}
	log.Printf("[Workflow] Started %d async workers", workers)
}

// worker processes events asynchronously
func (e *WorkflowEngine) worker(id int) {
	defer e.wg.Done()
	for {
		select {
		case event := <-e.asyncCh:
			ctx := context.Background()
			if err := e.processEvent(ctx, event); err != nil {
				log.Printf("[Workflow] Worker %d error: %v", id, err)
			}
		case <-e.stopCh:
			log.Printf("[Workflow] Worker %d stopping", id)
			return
		}
	}
}

// Stop stops the workflow engine and waits for all workers to finish
func (e *WorkflowEngine) Stop() {
	if e.isAsync {
		close(e.stopCh)
		e.wg.Wait()
	}
}

// GetRegisteredRules returns a list of registered rules (for debugging/admin purposes)
func (e *WorkflowEngine) GetRegisteredRules() map[string][]string {
	e.mu.RLock()
	defer e.mu.RUnlock()

	result := make(map[string][]string)
	for eventType, rules := range e.rules {
		ruleNames := make([]string, len(rules))
		for i, rule := range rules {
			ruleNames[i] = rule.Name
		}
		result[eventType] = ruleNames
	}
	return result
}
