package releases

import (
	"time"
)

// Release represents a release in the system
type Release struct {
	ID          int        `gorm:"primaryKey;autoIncrement" json:"id"`
	Version     string     `gorm:"column:version;not null;size:50;uniqueIndex:idx_project_release_version,composite:projectId" json:"version"`
	ProjectID   int        `gorm:"not null;index;uniqueIndex:idx_project_release_version,composite:version" json:"projectId"`
	Description string     `gorm:"type:text" json:"description"`
	Status      string     `gorm:"not null;size:50;default:'Open'" json:"status"` // Open, InUAT, Completed, OnHold, Abandoned, RolledBack
	TargetDate  *time.Time `gorm:"index" json:"targetDate,omitempty"`
	CreatedBy   int        `gorm:"not null;index" json:"createdBy"`
	CreatedAt   time.Time  `gorm:"not null" json:"createdAt"`
	UpdatedAt   time.Time  `gorm:"not null" json:"updatedAt"`
}

// TableName specifies the table name for GORM
func (Release) TableName() string {
	return "releases"
}

// ReleaseStatus constants
const (
	ReleaseStatusOpen       = "Open"
	ReleaseStatusInUAT      = "InUAT"
	ReleaseStatusCompleted  = "Completed"
	ReleaseStatusOnHold     = "OnHold"
	ReleaseStatusAbandoned  = "Abandoned"
	ReleaseStatusRolledBack = "RolledBack"
)

// IsValidStatus checks if the provided status is valid
func IsValidStatus(status string) bool {
	switch status {
	case ReleaseStatusOpen, ReleaseStatusInUAT, ReleaseStatusCompleted,
		ReleaseStatusOnHold, ReleaseStatusAbandoned, ReleaseStatusRolledBack:
		return true
	}
	return false
}
