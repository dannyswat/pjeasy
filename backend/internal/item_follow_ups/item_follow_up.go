package item_follow_ups

import "time"

// ItemFollowUp represents a dated plain-text status update for a project item.
type ItemFollowUp struct {
	ID           int       `gorm:"primaryKey;autoIncrement" json:"id"`
	ItemID       int       `gorm:"column:item_id;not null;index:idx_item_follow_up_item" json:"itemId"`
	ItemType     string    `gorm:"column:item_type;not null;size:50;index:idx_item_follow_up_item" json:"itemType"`
	FollowUpDate time.Time `gorm:"column:follow_up_date;type:date;not null;index" json:"followUpDate"`
	Content      string    `gorm:"type:text;not null" json:"content"`
	CreatedBy    int       `gorm:"column:created_by;not null;index" json:"createdBy"`
	CreatedAt    time.Time `gorm:"column:created_at;not null" json:"createdAt"`
	UpdatedAt    time.Time `gorm:"column:updated_at;not null" json:"updatedAt"`
}

func (ItemFollowUp) TableName() string {
	return "item_follow_ups"
}
