package service_tickets

import (
	"time"
)

// ServiceTicket represents a service ticket in the system
type ServiceTicket struct {
	ID          int       `gorm:"primaryKey;autoIncrement" json:"id"`
	RefNum      string    `gorm:"column:ref_num;not null;size:50;uniqueIndex:idx_project_refnum,composite:projectId" json:"refNum"`
	ProjectID   int       `gorm:"not null;index;uniqueIndex:idx_project_refnum,composite:refNum" json:"projectId"`
	Title       string    `gorm:"not null;size:255" json:"title"`
	Description string    `gorm:"type:text" json:"description"`
	Status      string    `gorm:"not null;size:50;default:'Open'" json:"status"`     // Open, Fulfilled, Closed
	Priority    string    `gorm:"not null;size:50;default:'Normal'" json:"priority"` // Immediate, Urgent, High, Normal, Low
	CreatedBy   int       `gorm:"not null;index" json:"createdBy"`
	CreatedAt   time.Time `gorm:"not null" json:"createdAt"`
	UpdatedAt   time.Time `gorm:"not null" json:"updatedAt"`
}

// TableName specifies the table name for GORM
func (ServiceTicket) TableName() string {
	return "service_tickets"
}

// ServiceTicketStatus constants
const (
	ServiceTicketStatusOpen      = "Open"
	ServiceTicketStatusFulfilled = "Fulfilled"
	ServiceTicketStatusClosed    = "Closed"
)

// ServiceTicketPriority constants
const (
	ServiceTicketPriorityImmediate = "Immediate"
	ServiceTicketPriorityUrgent    = "Urgent"
	ServiceTicketPriorityHigh      = "High"
	ServiceTicketPriorityNormal    = "Normal"
	ServiceTicketPriorityLow       = "Low"
)

// IsValidStatus checks if the provided status is valid
func IsValidStatus(status string) bool {
	return status == ServiceTicketStatusOpen ||
		status == ServiceTicketStatusFulfilled ||
		status == ServiceTicketStatusClosed
}

// IsValidPriority checks if the provided priority is valid
func IsValidPriority(priority string) bool {
	return priority == ServiceTicketPriorityImmediate ||
		priority == ServiceTicketPriorityUrgent ||
		priority == ServiceTicketPriorityHigh ||
		priority == ServiceTicketPriorityNormal ||
		priority == ServiceTicketPriorityLow
}
