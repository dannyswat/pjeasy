package features

import (
	"time"
)

// Feature represents a feature in the system
type Feature struct {
	ID          int        `gorm:"primaryKey;autoIncrement" json:"id"`
	RefNum      string     `gorm:"column:ref_num;not null;size:50;uniqueIndex:idx_project_feature_refnum,composite:projectId" json:"refNum"`
	ProjectID   int        `gorm:"not null;index;uniqueIndex:idx_project_feature_refnum,composite:refNum" json:"projectId"`
	Title       string     `gorm:"not null;size:255" json:"title"`
	Description string     `gorm:"type:text" json:"description"`
	Status      string     `gorm:"not null;size:50;default:'Open'" json:"status"`     // Open, Assigned, InProgress, InReview, Completed, Closed
	Priority    string     `gorm:"not null;size:50;default:'Normal'" json:"priority"` // Immediate, Urgent, High, Normal, Low
	AssignedTo  int        `gorm:"index" json:"assignedTo,omitempty"`
	SprintID    int        `gorm:"index" json:"sprintId,omitempty"`
	Points      int        `gorm:"default:0" json:"points"`
	Deadline    *time.Time `gorm:"index" json:"deadline,omitempty"`                          // Feature deadline
	ItemType    string     `gorm:"size:50;index:idx_feature_item" json:"itemType,omitempty"` // Type of related item (e.g., "ideas", "designs", "service-tickets")
	ItemID      *int       `gorm:"index:idx_feature_item" json:"itemId,omitempty"`           // ID of related item
	Tags        string     `gorm:"type:text" json:"tags,omitempty"`                          // Comma-separated tags
	CreatedBy   int        `gorm:"not null;index" json:"createdBy"`
	CreatedAt   time.Time  `gorm:"not null" json:"createdAt"`
	UpdatedAt   time.Time  `gorm:"not null" json:"updatedAt"`
}

// TableName specifies the table name for GORM
func (Feature) TableName() string {
	return "features"
}

// FeatureStatus constants
const (
	FeatureStatusOpen       = "Open"
	FeatureStatusAssigned   = "Assigned"
	FeatureStatusInProgress = "InProgress"
	FeatureStatusInReview   = "InReview"
	FeatureStatusCompleted  = "Completed"
	FeatureStatusClosed     = "Closed"
)

// FeaturePriority constants
const (
	FeaturePriorityImmediate = "Immediate"
	FeaturePriorityUrgent    = "Urgent"
	FeaturePriorityHigh      = "High"
	FeaturePriorityNormal    = "Normal"
	FeaturePriorityLow       = "Low"
)

// IsValidStatus checks if the provided status is valid
func IsValidStatus(status string) bool {
	switch status {
	case FeatureStatusOpen, FeatureStatusAssigned, FeatureStatusInProgress,
		FeatureStatusInReview, FeatureStatusCompleted, FeatureStatusClosed:
		return true
	}
	return false
}

// IsValidPriority checks if the provided priority is valid
func IsValidPriority(priority string) bool {
	switch priority {
	case FeaturePriorityImmediate, FeaturePriorityUrgent, FeaturePriorityHigh,
		FeaturePriorityNormal, FeaturePriorityLow:
		return true
	}
	return false
}
