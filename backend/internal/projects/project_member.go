package projects

import (
	"time"
)

// ProjectMember represents a user's membership in a project
type ProjectMember struct {
	ID        int       `gorm:"primaryKey;autoIncrement" json:"id"`
	ProjectID int       `gorm:"not null;index:idx_project_user,unique" json:"projectId"`
	UserID    int       `gorm:"not null;index:idx_project_user,unique;index" json:"userId"`
	IsAdmin   bool      `gorm:"default:false" json:"isAdmin"`
	AddedAt   time.Time `gorm:"not null" json:"addedAt"`
	AddedBy   int       `gorm:"not null" json:"addedBy"`
}

// TableName specifies the table name for GORM
func (ProjectMember) TableName() string {
	return "project_members"
}
