package projects

import (
	"time"
)

// Project represents a project in the system
type Project struct {
	ID          int       `gorm:"primaryKey;autoIncrement" json:"id"`
	Name        string    `gorm:"not null;size:255" json:"name"`
	Description string    `gorm:"type:text" json:"description"`
	IsArchived  bool      `gorm:"default:false;index" json:"isArchived"`
	CreatedBy   int       `gorm:"not null;index" json:"createdBy"`
	CreatedAt   time.Time `gorm:"not null" json:"createdAt"`
	UpdatedAt   time.Time `gorm:"not null" json:"updatedAt"`
	ArchivedAt  time.Time `json:"archivedAt,omitempty"`
}

// TableName specifies the table name for GORM
func (Project) TableName() string {
	return "projects"
}
