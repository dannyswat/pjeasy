package workflow

import (
	"context"
	"errors"
	"fmt"
	"log"
)

// ServiceTicketStatusUpdater is an interface for updating service ticket status
type ServiceTicketStatusUpdater interface {
	UpdateServiceTicketStatusByWorkflow(ticketID int, status string) error
}

// CompleteServiceTicketAction completes a related service ticket
type CompleteServiceTicketAction struct {
	name          string
	ticketUpdater ServiceTicketStatusUpdater
	targetStatus  string
}

// NewCompleteServiceTicketAction creates an action to complete a service ticket
func NewCompleteServiceTicketAction(ticketUpdater ServiceTicketStatusUpdater, targetStatus string) *CompleteServiceTicketAction {
	return &CompleteServiceTicketAction{
		name:          "CompleteServiceTicket",
		ticketUpdater: ticketUpdater,
		targetStatus:  targetStatus,
	}
}

func (a *CompleteServiceTicketAction) Name() string {
	return a.name
}

func (a *CompleteServiceTicketAction) Execute(ctx context.Context, event Event) error {
	// Get the linked item ID from the event data
	itemID, ok := event.Data["itemId"]
	if !ok {
		return errors.New("itemId not found in event data")
	}

	var ticketID int
	switch v := itemID.(type) {
	case int:
		ticketID = v
	case *int:
		if v == nil {
			return errors.New("itemId is nil")
		}
		ticketID = *v
	default:
		return fmt.Errorf("unexpected itemId type: %T", itemID)
	}

	if ticketID <= 0 {
		return errors.New("invalid ticket ID")
	}

	log.Printf("[Workflow] Completing service ticket %d with status %s", ticketID, a.targetStatus)
	return a.ticketUpdater.UpdateServiceTicketStatusByWorkflow(ticketID, a.targetStatus)
}

// LogAction logs an event for auditing purposes
type LogAction struct {
	name    string
	message string
}

// NewLogAction creates an action that logs a message
func NewLogAction(name, message string) *LogAction {
	return &LogAction{
		name:    name,
		message: message,
	}
}

func (a *LogAction) Name() string {
	return a.name
}

func (a *LogAction) Execute(ctx context.Context, event Event) error {
	log.Printf("[Workflow Audit] %s - Event: %s, EntityID: %d, ProjectID: %d, UserID: %d, Data: %v",
		a.message, event.Type, event.EntityID, event.ProjectID, event.UserID, event.Data)
	return nil
}

// NotificationAction could be extended to send notifications
type NotificationAction struct {
	name string
	// Add notification service dependency here
}

// NewNotificationAction creates an action that sends notifications
func NewNotificationAction(name string) *NotificationAction {
	return &NotificationAction{
		name: name,
	}
}

func (a *NotificationAction) Name() string {
	return a.name
}

func (a *NotificationAction) Execute(ctx context.Context, event Event) error {
	// TODO: Implement notification logic
	log.Printf("[Workflow] Notification action triggered for event: %s", event.Type)
	return nil
}
