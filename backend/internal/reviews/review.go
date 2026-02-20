package reviews

import (
	"time"
)

// Review represents a project review in the system
type Review struct {
	ID          int        `gorm:"primaryKey;autoIncrement" json:"id"`
	ProjectID   int        `gorm:"not null;index" json:"projectId"`
	Title       string     `gorm:"not null;size:255" json:"title"`
	Description string     `gorm:"type:text" json:"description"`
	ReviewType  string     `gorm:"not null;size:50;default:'Sprint'" json:"reviewType"` // Sprint, Custom
	SprintID    *int       `gorm:"index" json:"sprintId,omitempty"`                     // Associated sprint (for sprint reviews)
	StartDate   *time.Time `json:"startDate,omitempty"`                                 // Review period start (for custom reviews)
	EndDate     *time.Time `json:"endDate,omitempty"`                                   // Review period end (for custom reviews)
	Status      string     `gorm:"not null;size:50;default:'Draft'" json:"status"`      // Draft, Published
	Summary     string     `gorm:"type:text" json:"summary"`                            // Review summary/notes

	// Metrics
	TotalTasks      int     `gorm:"default:0" json:"totalTasks"`
	CompletedTasks  int     `gorm:"default:0" json:"completedTasks"`
	TotalPoints     int     `gorm:"default:0" json:"totalPoints"`
	CompletedPoints int     `gorm:"default:0" json:"completedPoints"`
	CompletionRate  float64 `gorm:"type:decimal(5,2);default:0" json:"completionRate"` // Percentage

	CreatedBy int       `gorm:"not null;index" json:"createdBy"`
	CreatedAt time.Time `gorm:"not null" json:"createdAt"`
	UpdatedAt time.Time `gorm:"not null" json:"updatedAt"`
}

// TableName specifies the table name for GORM
func (Review) TableName() string {
	return "reviews"
}

// ReviewType constants
const (
	ReviewTypeSprint = "Sprint"
	ReviewTypeCustom = "Custom"
)

// ReviewStatus constants
const (
	ReviewStatusDraft     = "Draft"
	ReviewStatusPublished = "Published"
)

// IsValidReviewType checks if the provided review type is valid
func IsValidReviewType(reviewType string) bool {
	return reviewType == ReviewTypeSprint || reviewType == ReviewTypeCustom
}

// IsValidStatus checks if the provided status is valid
func IsValidStatus(status string) bool {
	return status == ReviewStatusDraft || status == ReviewStatusPublished
}

// ReviewItem represents a snapshot of an item included in the review
type ReviewItem struct {
	ID         int       `gorm:"primaryKey;autoIncrement" json:"id"`
	ReviewID   int       `gorm:"not null;index" json:"reviewId"`
	ItemType   string    `gorm:"not null;size:50" json:"itemType"` // feature, issue, task, idea
	ItemID     int       `gorm:"not null" json:"itemId"`
	RefNum     string    `gorm:"size:50" json:"refNum"`
	Title      string    `gorm:"not null;size:255" json:"title"`
	Status     string    `gorm:"not null;size:50" json:"status"`
	Priority   string    `gorm:"size:50" json:"priority,omitempty"`
	AssignedTo int       `json:"assignedTo,omitempty"`
	Points     int       `gorm:"default:0" json:"points"`
	Category   string    `gorm:"not null;size:50" json:"category"` // completed, in_progress, delayed, prioritization
	CreatedAt  time.Time `gorm:"not null" json:"createdAt"`
}

// TableName specifies the table name for GORM
func (ReviewItem) TableName() string {
	return "review_items"
}

// ReviewItemCategory constants
const (
	ReviewItemCategoryCompleted      = "completed"
	ReviewItemCategoryInProgress     = "in_progress"
	ReviewItemCategoryDelayed        = "delayed"
	ReviewItemCategoryPrioritization = "prioritization"
)

// ReviewItemType constants
const (
	ReviewItemTypeFeature = "feature"
	ReviewItemTypeIssue   = "issue"
	ReviewItemTypeTask    = "task"
	ReviewItemTypeIdea    = "idea"
)
