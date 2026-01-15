package comments

import (
	"time"
)

// Comment represents a comment on any item (idea, task, etc.)
type Comment struct {
	ID        int       `gorm:"primaryKey;autoIncrement" json:"id"`
	ItemID    int       `gorm:"not null;index:idx_item" json:"itemId"`
	ItemType  string    `gorm:"not null;size:50;index:idx_item" json:"itemType"` // e.g., "idea", "task", "project"
	Content   string    `gorm:"type:text;not null" json:"content"`
	CreatedBy int       `gorm:"not null;index" json:"createdBy"`
	CreatedAt time.Time `gorm:"not null" json:"createdAt"`
	UpdatedAt time.Time `gorm:"not null" json:"updatedAt"`
}

// TableName specifies the table name for GORM
func (Comment) TableName() string {
	return "comments"
}
