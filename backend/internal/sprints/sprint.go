package sprints

import (
	"time"
)

// Sprint represents a sprint in the system
type Sprint struct {
	ID          int        `gorm:"primaryKey;autoIncrement" json:"id"`
	ProjectID   int        `gorm:"not null;index" json:"projectId"`
	Name        string     `gorm:"not null;size:255" json:"name"`
	Goal        string     `gorm:"type:text" json:"goal"`
	StartDate   *time.Time `json:"startDate,omitempty"`
	EndDate     *time.Time `json:"endDate,omitempty"`
	MilestoneID *int       `gorm:"index" json:"milestoneId,omitempty"`
	Status      string     `gorm:"not null;size:50;default:'Planning'" json:"status"` // Planning, Active, Closed
	CreatedBy   int        `gorm:"not null;index" json:"createdBy"`
	CreatedAt   time.Time  `gorm:"not null" json:"createdAt"`
	UpdatedAt   time.Time  `gorm:"not null" json:"updatedAt"`
}

// TableName specifies the table name for GORM
func (Sprint) TableName() string {
	return "sprints"
}

// SprintStatus constants
const (
	SprintStatusPlanning = "Planning"
	SprintStatusActive   = "Active"
	SprintStatusClosed   = "Closed"
)

// IsValidStatus checks if the provided status is valid
func IsValidStatus(status string) bool {
	return status == SprintStatusPlanning ||
		status == SprintStatusActive ||
		status == SprintStatusClosed
}

// IsActiveStatus checks if the sprint is active
func IsActiveStatus(status string) bool {
	return status == SprintStatusActive
}

// IsClosedStatus checks if the sprint is closed
func IsClosedStatus(status string) bool {
	return status == SprintStatusClosed
}
