package tasks

import (
	"time"
)

// Task represents a task in the system
type Task struct {
	ID             int        `gorm:"primaryKey;autoIncrement" json:"id"`
	ProjectID      int        `gorm:"not null;index" json:"projectId"`
	Title          string     `gorm:"not null;size:255" json:"title"`
	Description    string     `gorm:"type:text" json:"description"`
	Status         string     `gorm:"not null;size:50;default:'Open'" json:"status"`      // Open, In Progress, On Hold, Blocked, Completed, Closed
	Priority       string     `gorm:"not null;size:50;default:'Normal'" json:"priority"`  // Immediate, Urgent, High, Normal, Low
	EstimatedHours float64    `gorm:"type:decimal(10,2)" json:"estimatedHours,omitempty"` // Estimated time in hours
	AssigneeID     *int       `gorm:"index" json:"assigneeId,omitempty"`                  // Assigned user ID (nullable)
	Deadline       *time.Time `json:"deadline,omitempty"`                                 // Optional deadline
	SprintID       *int       `gorm:"index" json:"sprintId,omitempty"`                    // Optional sprint association
	ItemType       string     `gorm:"size:50;index:idx_item" json:"itemType,omitempty"`   // Type of related item (e.g., "idea", "epic")
	ItemID         *int       `gorm:"index:idx_item" json:"itemId,omitempty"`             // ID of related item
	Tags           string     `gorm:"type:text" json:"tags,omitempty"`                    // Comma-separated tags
	CreatedBy      int        `gorm:"not null;index" json:"createdBy"`
	CreatedAt      time.Time  `gorm:"not null" json:"createdAt"`
	UpdatedAt      time.Time  `gorm:"not null" json:"updatedAt"`
}

// TableName specifies the table name for GORM
func (Task) TableName() string {
	return "tasks"
}

// TaskStatus constants
const (
	TaskStatusOpen       = "Open"
	TaskStatusInProgress = "In Progress"
	TaskStatusOnHold     = "On Hold"
	TaskStatusBlocked    = "Blocked"
	TaskStatusCompleted  = "Completed"
	TaskStatusClosed     = "Closed"
)

// TaskPriority constants
const (
	TaskPriorityImmediate = "Immediate"
	TaskPriorityUrgent    = "Urgent"
	TaskPriorityHigh      = "High"
	TaskPriorityNormal    = "Normal"
	TaskPriorityLow       = "Low"
)

// IsValidStatus checks if the provided status is valid
func IsValidStatus(status string) bool {
	return status == TaskStatusOpen ||
		status == TaskStatusInProgress ||
		status == TaskStatusOnHold ||
		status == TaskStatusBlocked ||
		status == TaskStatusCompleted ||
		status == TaskStatusClosed
}

// IsValidPriority checks if the provided priority is valid
func IsValidPriority(priority string) bool {
	return priority == TaskPriorityImmediate ||
		priority == TaskPriorityUrgent ||
		priority == TaskPriorityHigh ||
		priority == TaskPriorityNormal ||
		priority == TaskPriorityLow
}
