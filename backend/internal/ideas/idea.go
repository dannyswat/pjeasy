package ideas

import (
	"time"
)

// Idea represents an idea in the system
type Idea struct {
	ID          int       `gorm:"primaryKey;autoIncrement" json:"id"`
	RefNum      string    `gorm:"column:ref_num;not null;size:50;uniqueIndex:idx_project_refnum,composite:projectId" json:"refNum"`
	ProjectID   int       `gorm:"not null;index;uniqueIndex:idx_project_refnum,composite:refNum" json:"projectId"`
	Title       string    `gorm:"not null;size:255" json:"title"`
	Description string    `gorm:"type:text" json:"description"`
	Status      string    `gorm:"not null;size:50;default:'Open'" json:"status"`         // Open, Closed
	ItemType    string    `gorm:"size:50;index:idx_idea_item" json:"itemType,omitempty"` // Type of related item (e.g., "service-tickets")
	ItemID      *int      `gorm:"index:idx_idea_item" json:"itemId,omitempty"`           // ID of related item
	Tags        string    `gorm:"type:text" json:"tags,omitempty"`                       // Comma-separated tags
	CreatedBy   int       `gorm:"not null;index" json:"createdBy"`
	CreatedAt   time.Time `gorm:"not null" json:"createdAt"`
	UpdatedAt   time.Time `gorm:"not null" json:"updatedAt"`
}

// TableName specifies the table name for GORM
func (Idea) TableName() string {
	return "ideas"
}

// IdeaStatus constants
const (
	IdeaStatusOpen   = "Open"
	IdeaStatusClosed = "Closed"
)

// IsValidStatus checks if the provided status is valid
func IsValidStatus(status string) bool {
	return status == IdeaStatusOpen || status == IdeaStatusClosed
}
