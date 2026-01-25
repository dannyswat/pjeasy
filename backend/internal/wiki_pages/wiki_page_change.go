package wiki_pages

import (
	"time"
)

// WikiPageChange represents a change record for a wiki page
// It stores both the delta (for version control) and snapshot (for quick access)
// Connected to features or issues, and merges to WikiPage upon completion
type WikiPageChange struct {
	ID           int        `gorm:"primaryKey;autoIncrement" json:"id"`
	WikiPageID   int        `gorm:"not null;index" json:"wikiPageId"`
	ProjectID    int        `gorm:"not null;index" json:"projectId"`
	ItemType     string     `gorm:"not null;size:50;index:idx_wiki_change_item" json:"itemType"` // "feature" or "issue"
	ItemID       int        `gorm:"not null;index:idx_wiki_change_item" json:"itemId"`           // ID of the feature or issue
	BaseHash     string     `gorm:"size:64" json:"baseHash"`                                     // Hash of base content for validation
	Delta        string     `gorm:"type:text" json:"delta"`                                      // JSON-encoded delta (vchtml format)
	Snapshot     string     `gorm:"type:text" json:"snapshot"`                                   // Full HTML snapshot at this change
	SnapshotHash string     `gorm:"size:64" json:"snapshotHash"`                                 // Hash of snapshot for version control
	ChangeType   string     `gorm:"not null;size:50" json:"changeType"`                          // "create", "update", "merge"
	Status       string     `gorm:"not null;size:50;default:'Pending'" json:"status"`            // Pending, Merged, Rejected, Conflict
	MergedAt     *time.Time `json:"mergedAt,omitempty"`
	CreatedBy    int        `gorm:"not null;index" json:"createdBy"`
	CreatedAt    time.Time  `gorm:"not null" json:"createdAt"`
	UpdatedAt    time.Time  `gorm:"not null" json:"updatedAt"`
}

// TableName specifies the table name for GORM
func (WikiPageChange) TableName() string {
	return "wiki_page_changes"
}

// WikiPageChangeStatus constants
const (
	WikiPageChangeStatusPending  = "Pending"
	WikiPageChangeStatusMerged   = "Merged"
	WikiPageChangeStatusRejected = "Rejected"
	WikiPageChangeStatusConflict = "Conflict"
)

// WikiPageChangeType constants
const (
	WikiPageChangeTypeCreate = "create"
	WikiPageChangeTypeUpdate = "update"
	WikiPageChangeTypeMerge  = "merge"
)

// WikiPageItemType constants
const (
	WikiPageItemTypeFeature = "feature"
	WikiPageItemTypeIssue   = "issue"
)

// IsValidChangeStatus checks if the provided status is valid
func IsValidChangeStatus(status string) bool {
	switch status {
	case WikiPageChangeStatusPending, WikiPageChangeStatusMerged,
		WikiPageChangeStatusRejected, WikiPageChangeStatusConflict:
		return true
	}
	return false
}

// IsValidChangeType checks if the provided change type is valid
func IsValidChangeType(changeType string) bool {
	switch changeType {
	case WikiPageChangeTypeCreate, WikiPageChangeTypeUpdate, WikiPageChangeTypeMerge:
		return true
	}
	return false
}

// IsValidItemType checks if the provided item type is valid
func IsValidItemType(itemType string) bool {
	switch itemType {
	case WikiPageItemTypeFeature, WikiPageItemTypeIssue:
		return true
	}
	return false
}
