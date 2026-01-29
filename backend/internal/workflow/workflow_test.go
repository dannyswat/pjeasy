package workflow

import (
	"context"
	"errors"
	"testing"
)

// MockServiceTicketUpdater is a mock implementation for testing
type MockServiceTicketUpdater struct {
	UpdatedTickets map[int]string
	ShouldFail     bool
}

func NewMockServiceTicketUpdater() *MockServiceTicketUpdater {
	return &MockServiceTicketUpdater{
		UpdatedTickets: make(map[int]string),
	}
}

func (m *MockServiceTicketUpdater) UpdateServiceTicketStatusByWorkflow(ticketID int, status string) error {
	if m.ShouldFail {
		return errors.New("mock error")
	}
	m.UpdatedTickets[ticketID] = status
	return nil
}

func TestWorkflowEngine_RegisterRule(t *testing.T) {
	engine := NewWorkflowEngine()

	rule := &WorkflowRule{
		Name:       "TestRule",
		EventType:  EventIssueStatusChanged,
		Conditions: []WorkflowCondition{},
		Actions:    []WorkflowAction{},
	}

	engine.RegisterRule(rule)

	rules := engine.GetRegisteredRules()
	if len(rules[EventIssueStatusChanged]) != 1 {
		t.Errorf("Expected 1 rule, got %d", len(rules[EventIssueStatusChanged]))
	}
	if rules[EventIssueStatusChanged][0] != "TestRule" {
		t.Errorf("Expected rule name 'TestRule', got '%s'", rules[EventIssueStatusChanged][0])
	}
}

func TestStatusCondition(t *testing.T) {
	condition := NewStatusCondition("TestCondition", "newStatus", "Completed")

	tests := []struct {
		name     string
		data     map[string]interface{}
		expected bool
	}{
		{
			name:     "matching status",
			data:     map[string]interface{}{"newStatus": "Completed"},
			expected: true,
		},
		{
			name:     "non-matching status",
			data:     map[string]interface{}{"newStatus": "Open"},
			expected: false,
		},
		{
			name:     "missing status field",
			data:     map[string]interface{}{},
			expected: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			event := Event{Data: tt.data}
			result, err := condition.Evaluate(context.Background(), event)
			if err != nil {
				t.Errorf("Unexpected error: %v", err)
			}
			if result != tt.expected {
				t.Errorf("Expected %v, got %v", tt.expected, result)
			}
		})
	}
}

func TestHasLinkedItemCondition(t *testing.T) {
	condition := NewHasLinkedItemCondition("TestCondition", "itemType", "service-tickets")

	tests := []struct {
		name     string
		data     map[string]interface{}
		expected bool
	}{
		{
			name:     "matching item type",
			data:     map[string]interface{}{"itemType": "service-tickets"},
			expected: true,
		},
		{
			name:     "non-matching item type",
			data:     map[string]interface{}{"itemType": "features"},
			expected: false,
		},
		{
			name:     "missing item type",
			data:     map[string]interface{}{},
			expected: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			event := Event{Data: tt.data}
			result, err := condition.Evaluate(context.Background(), event)
			if err != nil {
				t.Errorf("Unexpected error: %v", err)
			}
			if result != tt.expected {
				t.Errorf("Expected %v, got %v", tt.expected, result)
			}
		})
	}
}

func TestHasItemIDCondition(t *testing.T) {
	condition := NewHasItemIDCondition("TestCondition", "itemId")

	ticketID := 123
	tests := []struct {
		name     string
		data     map[string]interface{}
		expected bool
	}{
		{
			name:     "valid int pointer",
			data:     map[string]interface{}{"itemId": &ticketID},
			expected: true,
		},
		{
			name:     "valid int",
			data:     map[string]interface{}{"itemId": 123},
			expected: true,
		},
		{
			name:     "nil pointer",
			data:     map[string]interface{}{"itemId": (*int)(nil)},
			expected: false,
		},
		{
			name:     "zero int",
			data:     map[string]interface{}{"itemId": 0},
			expected: false,
		},
		{
			name:     "missing item id",
			data:     map[string]interface{}{},
			expected: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			event := Event{Data: tt.data}
			result, err := condition.Evaluate(context.Background(), event)
			if err != nil {
				t.Errorf("Unexpected error: %v", err)
			}
			if result != tt.expected {
				t.Errorf("Expected %v, got %v", tt.expected, result)
			}
		})
	}
}

func TestCompleteServiceTicketAction(t *testing.T) {
	mock := NewMockServiceTicketUpdater()
	action := NewCompleteServiceTicketAction(mock, "Fulfilled")

	ticketID := 42
	event := Event{
		EntityID:  1,
		ProjectID: 1,
		UserID:    1,
		Data:      map[string]interface{}{"itemId": &ticketID},
	}

	err := action.Execute(context.Background(), event)
	if err != nil {
		t.Errorf("Unexpected error: %v", err)
	}

	if mock.UpdatedTickets[42] != "Fulfilled" {
		t.Errorf("Expected ticket 42 to be 'Fulfilled', got '%s'", mock.UpdatedTickets[42])
	}
}

func TestWorkflowEngine_TriggerEvent_CompleteServiceTicket(t *testing.T) {
	engine := NewWorkflowEngine()
	mock := NewMockServiceTicketUpdater()

	ticketID := 99
	rule := &WorkflowRule{
		Name:      "TestCompleteServiceTicket",
		EventType: EventIssueStatusChanged,
		Conditions: []WorkflowCondition{
			NewStatusCondition("IsCompleted", "newStatus", "Completed"),
			NewHasLinkedItemCondition("HasServiceTicket", "itemType", "service-tickets"),
			NewHasItemIDCondition("HasItemId", "itemId"),
		},
		Actions: []WorkflowAction{
			NewCompleteServiceTicketAction(mock, "Fulfilled"),
		},
	}
	engine.RegisterRule(rule)

	event := Event{
		Type:      EventIssueStatusChanged,
		EntityID:  1,
		ProjectID: 1,
		UserID:    1,
		Data: map[string]interface{}{
			"oldStatus": "InProgress",
			"newStatus": "Completed",
			"itemType":  "service-tickets",
			"itemId":    &ticketID,
		},
	}

	err := engine.TriggerEvent(context.Background(), event)
	if err != nil {
		t.Errorf("Unexpected error: %v", err)
	}

	if mock.UpdatedTickets[99] != "Fulfilled" {
		t.Errorf("Expected ticket 99 to be 'Fulfilled', got '%s'", mock.UpdatedTickets[99])
	}
}

func TestWorkflowEngine_TriggerEvent_ConditionsNotMet(t *testing.T) {
	engine := NewWorkflowEngine()
	mock := NewMockServiceTicketUpdater()

	ticketID := 99
	rule := &WorkflowRule{
		Name:      "TestCompleteServiceTicket",
		EventType: EventIssueStatusChanged,
		Conditions: []WorkflowCondition{
			NewStatusCondition("IsCompleted", "newStatus", "Completed"),
			NewHasLinkedItemCondition("HasServiceTicket", "itemType", "service-tickets"),
		},
		Actions: []WorkflowAction{
			NewCompleteServiceTicketAction(mock, "Fulfilled"),
		},
	}
	engine.RegisterRule(rule)

	event := Event{
		Type:      EventIssueStatusChanged,
		EntityID:  1,
		ProjectID: 1,
		UserID:    1,
		Data: map[string]interface{}{
			"oldStatus": "Open",
			"newStatus": "InProgress",
			"itemType":  "service-tickets",
			"itemId":    &ticketID,
		},
	}

	err := engine.TriggerEvent(context.Background(), event)
	if err != nil {
		t.Errorf("Unexpected error: %v", err)
	}

	if _, exists := mock.UpdatedTickets[99]; exists {
		t.Error("Ticket should not have been updated when conditions are not met")
	}
}

func TestCompositeCondition_And(t *testing.T) {
	cond1 := NewStatusCondition("Cond1", "status1", "A")
	cond2 := NewStatusCondition("Cond2", "status2", "B")
	andCond := NewAndCondition("AndCondition", cond1, cond2)

	tests := []struct {
		name     string
		data     map[string]interface{}
		expected bool
	}{
		{
			name:     "both true",
			data:     map[string]interface{}{"status1": "A", "status2": "B"},
			expected: true,
		},
		{
			name:     "first false",
			data:     map[string]interface{}{"status1": "X", "status2": "B"},
			expected: false,
		},
		{
			name:     "second false",
			data:     map[string]interface{}{"status1": "A", "status2": "X"},
			expected: false,
		},
		{
			name:     "both false",
			data:     map[string]interface{}{"status1": "X", "status2": "X"},
			expected: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			event := Event{Data: tt.data}
			result, err := andCond.Evaluate(context.Background(), event)
			if err != nil {
				t.Errorf("Unexpected error: %v", err)
			}
			if result != tt.expected {
				t.Errorf("Expected %v, got %v", tt.expected, result)
			}
		})
	}
}

func TestCompositeCondition_Or(t *testing.T) {
	cond1 := NewStatusCondition("Cond1", "status1", "A")
	cond2 := NewStatusCondition("Cond2", "status2", "B")
	orCond := NewOrCondition("OrCondition", cond1, cond2)

	tests := []struct {
		name     string
		data     map[string]interface{}
		expected bool
	}{
		{
			name:     "both true",
			data:     map[string]interface{}{"status1": "A", "status2": "B"},
			expected: true,
		},
		{
			name:     "first true",
			data:     map[string]interface{}{"status1": "A", "status2": "X"},
			expected: true,
		},
		{
			name:     "second true",
			data:     map[string]interface{}{"status1": "X", "status2": "B"},
			expected: true,
		},
		{
			name:     "both false",
			data:     map[string]interface{}{"status1": "X", "status2": "X"},
			expected: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			event := Event{Data: tt.data}
			result, err := orCond.Evaluate(context.Background(), event)
			if err != nil {
				t.Errorf("Unexpected error: %v", err)
			}
			if result != tt.expected {
				t.Errorf("Expected %v, got %v", tt.expected, result)
			}
		})
	}
}
