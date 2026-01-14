package userroles

import (
	"time"
)

// SystemAdmin represents a user with system administrator privileges
type SystemAdmin struct {
	ID           int       `gorm:"primaryKey;autoIncrement" json:"id"`
	UserID       int       `gorm:"not null;uniqueIndex" json:"userId"`
	CreatedAt    time.Time `gorm:"not null" json:"createdAt"`
	ExpiredAfter time.Time `gorm:"index" json:"expiredAfter"`
}

// TableName specifies the table name for GORM
func (SystemAdmin) TableName() string {
	return "system_admins"
}

// IsExpired checks if the admin role has expired
func (s *SystemAdmin) IsExpired() bool {
	return !s.ExpiredAfter.IsZero() && time.Now().After(s.ExpiredAfter)
}

// IsActive checks if the admin role is currently active
func (s *SystemAdmin) IsActive() bool {
	return !s.IsExpired()
}
