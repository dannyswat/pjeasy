package comments

import (
	"time"
)

// Comment represents a comment on any item (idea, task, etc.)
type Comment struct {
	ID        int       `gorm:"primaryKey;autoIncrement" json:"id"`
	ItemID    int       `gorm:"column:item_id;not null;index:idx_item" json:"itemId"`
	ItemType  string    `gorm:"column:item_type;not null;size:50;index:idx_item" json:"itemType"` // e.g., "idea", "task", "project"
	Content   string    `gorm:"type:text;not null" json:"content"`
	CreatedBy int       `gorm:"column:created_by;not null;index" json:"createdBy"`
	CreatedAt time.Time `gorm:"column:created_at;not null" json:"createdAt"`
	UpdatedAt time.Time `gorm:"column:updated_at;not null" json:"updatedAt"`
}

// TableName specifies the table name for GORM
func (Comment) TableName() string {
	return "comments"
}
