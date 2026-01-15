package sequences

import (
	"time"
)

// Sequence defines the configuration for generating sequential numbers for an item type
type Sequence struct {
	ID               int       `gorm:"primaryKey;autoIncrement" json:"id"`
	ProjectID        int       `gorm:"not null;uniqueIndex:idx_project_item;index" json:"projectId"`
	ItemType         string    `gorm:"not null;uniqueIndex:idx_project_item;size:50" json:"itemType"` // e.g., "idea", "task", "project"
	Prefix           string    `gorm:"size:50" json:"prefix"`                                         // e.g., "IDEA-{yyyy}-", "TSK-{yy}{mm}-"
	PaddedZeroLength int       `gorm:"not null;default:4" json:"paddedZeroLength"`                    // e.g., 4 for "0001", 6 for "000001"
	CreatedAt        time.Time `gorm:"not null" json:"createdAt"`
	UpdatedAt        time.Time `gorm:"not null" json:"updatedAt"`
}

// TableName specifies the table name for GORM
func (Sequence) TableName() string {
	return "sequences"
}
