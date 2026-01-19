package issues

import (
	"time"
)

// Issue represents an issue in the system
type Issue struct {
	ID          int       `gorm:"primaryKey;autoIncrement" json:"id"`
	RefNum      string    `gorm:"column:ref_num;not null;size:50;uniqueIndex:idx_project_issue_refnum,composite:projectId" json:"refNum"`
	ProjectID   int       `gorm:"not null;index;uniqueIndex:idx_project_issue_refnum,composite:refNum" json:"projectId"`
	Title       string    `gorm:"not null;size:255" json:"title"`
	Description string    `gorm:"type:text" json:"description"`
	Status      string    `gorm:"not null;size:50;default:'Open'" json:"status"`     // Open, Assigned, InProgress, InReview, Completed, Closed
	Priority    string    `gorm:"not null;size:50;default:'Normal'" json:"priority"` // Immediate, Urgent, High, Normal, Low
	AssignedTo  int       `gorm:"index" json:"assignedTo,omitempty"`
	SprintID    int       `gorm:"index" json:"sprintId,omitempty"`
	Points      int       `gorm:"default:0" json:"points"`
	Tags        string    `gorm:"type:text" json:"tags,omitempty"` // Comma-separated tags
	CreatedBy   int       `gorm:"not null;index" json:"createdBy"`
	CreatedAt   time.Time `gorm:"not null" json:"createdAt"`
	UpdatedAt   time.Time `gorm:"not null" json:"updatedAt"`
}

// TableName specifies the table name for GORM
func (Issue) TableName() string {
	return "issues"
}

// IssueStatus constants
const (
	IssueStatusOpen       = "Open"
	IssueStatusAssigned   = "Assigned"
	IssueStatusInProgress = "InProgress"
	IssueStatusInReview   = "InReview"
	IssueStatusCompleted  = "Completed"
	IssueStatusClosed     = "Closed"
)

// IssuePriority constants
const (
	IssuePriorityImmediate = "Immediate"
	IssuePriorityUrgent    = "Urgent"
	IssuePriorityHigh      = "High"
	IssuePriorityNormal    = "Normal"
	IssuePriorityLow       = "Low"
)

// IsValidStatus checks if the provided status is valid
func IsValidStatus(status string) bool {
	switch status {
	case IssueStatusOpen, IssueStatusAssigned, IssueStatusInProgress,
		IssueStatusInReview, IssueStatusCompleted, IssueStatusClosed:
		return true
	}
	return false
}

// IsValidPriority checks if the provided priority is valid
func IsValidPriority(priority string) bool {
	switch priority {
	case IssuePriorityImmediate, IssuePriorityUrgent, IssuePriorityHigh,
		IssuePriorityNormal, IssuePriorityLow:
		return true
	}
	return false
}
