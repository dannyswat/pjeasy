package wiki_pages

import (
	"time"
)

// WikiPage represents a wiki page in the system
type WikiPage struct {
	ID          int       `gorm:"primaryKey;autoIncrement" json:"id"`
	ProjectID   int       `gorm:"not null;index" json:"projectId"`
	Slug        string    `gorm:"not null;size:255;uniqueIndex:idx_project_wiki_slug,composite:projectId" json:"slug"` // URL-friendly identifier
	Title       string    `gorm:"not null;size:255" json:"title"`
	Content     string    `gorm:"type:text" json:"content"`             // Current merged content (HTML)
	ContentHash string    `gorm:"size:64" json:"contentHash,omitempty"` // Hash of content for version control
	Version     int       `gorm:"not null;default:1" json:"version"`    // Current version number
	Status      string    `gorm:"not null;size:50;default:'Draft'" json:"status"`
	ParentID    *int      `gorm:"index" json:"parentId,omitempty"` // For hierarchical structure
	SortOrder   int       `gorm:"default:0" json:"sortOrder"`      // Order within siblings
	CreatedBy   int       `gorm:"not null;index" json:"createdBy"`
	UpdatedBy   int       `gorm:"index" json:"updatedBy"`
	CreatedAt   time.Time `gorm:"not null" json:"createdAt"`
	UpdatedAt   time.Time `gorm:"not null" json:"updatedAt"`
}

// TableName specifies the table name for GORM
func (WikiPage) TableName() string {
	return "wiki_pages"
}

// WikiPageStatus constants
const (
	WikiPageStatusDraft     = "Draft"
	WikiPageStatusPublished = "Published"
	WikiPageStatusArchived  = "Archived"
)

// IsValidStatus checks if the provided status is valid
func IsValidWikiPageStatus(status string) bool {
	switch status {
	case WikiPageStatusDraft, WikiPageStatusPublished, WikiPageStatusArchived:
		return true
	}
	return false
}
