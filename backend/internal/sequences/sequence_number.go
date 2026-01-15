package sequences

import (
	"time"
)

// SequenceNumber stores the current/next number for each sequence
type SequenceNumber struct {
	ID         int       `gorm:"primaryKey;autoIncrement" json:"id"`
	ProjectID  int       `gorm:"not null;uniqueIndex:idx_project_item;index" json:"projectId"`
	ItemType   string    `gorm:"not null;uniqueIndex:idx_project_item;size:50" json:"itemType"`
	NextNumber int       `gorm:"not null;default:1" json:"nextNumber"`
	UpdatedAt  time.Time `gorm:"not null" json:"updatedAt"`
}

// TableName specifies the table name for GORM
func (SequenceNumber) TableName() string {
	return "sequence_numbers"
}
