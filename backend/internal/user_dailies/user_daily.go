package user_dailies

import "time"

const (
	ItemTypeTask    = "task"
	ItemTypeIssue   = "issue"
	ItemTypeFeature = "feature"
)

type UserDailyItem struct {
	ID        int       `gorm:"primaryKey;autoIncrement" json:"id"`
	UserID    int       `gorm:"not null;index;uniqueIndex:idx_user_daily_item" json:"userId"`
	ProjectID int       `gorm:"not null;index" json:"projectId"`
	WorkDate  time.Time `gorm:"type:date;not null;index;uniqueIndex:idx_user_daily_item" json:"workDate"`
	ItemType  string    `gorm:"not null;size:20;uniqueIndex:idx_user_daily_item" json:"itemType"`
	ItemID    int       `gorm:"not null;uniqueIndex:idx_user_daily_item" json:"itemId"`
	CreatedAt time.Time `gorm:"not null" json:"createdAt"`
	UpdatedAt time.Time `gorm:"not null" json:"updatedAt"`
}

func (UserDailyItem) TableName() string {
	return "user_daily_items"
}

type UserDailyTimeLog struct {
	ID              int       `gorm:"primaryKey;autoIncrement" json:"id"`
	UserID          int       `gorm:"not null;index" json:"userId"`
	ProjectID       int       `gorm:"not null;index" json:"projectId"`
	UserDailyItemID int       `gorm:"not null;index" json:"userDailyItemId"`
	LogDate         time.Time `gorm:"type:date;not null;index" json:"logDate"`
	StartUnit       int       `gorm:"not null" json:"startUnit"`
	DurationUnits   int       `gorm:"not null" json:"durationUnits"`
	CreatedAt       time.Time `gorm:"not null" json:"createdAt"`
	UpdatedAt       time.Time `gorm:"not null" json:"updatedAt"`
}

func (UserDailyTimeLog) TableName() string {
	return "user_daily_time_logs"
}

func IsValidItemType(itemType string) bool {
	switch itemType {
	case ItemTypeTask, ItemTypeIssue, ItemTypeFeature:
		return true
	default:
		return false
	}
}
