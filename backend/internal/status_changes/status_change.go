package status_changes

import "time"

// StatusChange records a status transition for a project item.
type StatusChange struct {
	ID        int       `gorm:"primaryKey;autoIncrement" json:"id"`
	ProjectID int       `gorm:"not null;index" json:"projectId"`
	ItemType  string    `gorm:"not null;size:50;index:idx_status_change_item" json:"itemType"`
	ItemID    int       `gorm:"not null;index:idx_status_change_item" json:"itemId"`
	OldStatus string    `gorm:"not null;size:100" json:"oldStatus"`
	NewStatus string    `gorm:"not null;size:100" json:"newStatus"`
	ChangedBy *int      `gorm:"index" json:"changedBy,omitempty"`
	ChangedAt time.Time `gorm:"not null;index" json:"changedAt"`
}

func (StatusChange) TableName() string {
	return "status_changes"
}

const (
	ItemTypeIdea          = "idea"
	ItemTypeIssue         = "issue"
	ItemTypeFeature       = "feature"
	ItemTypeTask          = "task"
	ItemTypeServiceTicket = "service-ticket"
	ItemTypeWikiPage      = "wiki-page"
	ItemTypeSprint        = "sprint"
	ItemTypeReview        = "review"
)

func IsValidItemType(itemType string) bool {
	switch itemType {
	case ItemTypeIdea, ItemTypeIssue, ItemTypeFeature, ItemTypeTask,
		ItemTypeServiceTicket, ItemTypeWikiPage, ItemTypeSprint, ItemTypeReview:
		return true
	}
	return false
}
