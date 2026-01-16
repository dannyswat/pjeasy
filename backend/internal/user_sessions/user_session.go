package user_sessions

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type UserSession struct {
	ID               uuid.UUID `gorm:"type:uuid;primaryKey"`
	UserID           int       `gorm:"not null;index"`
	RefreshTokenHash string    `gorm:"not null;uniqueIndex;size:64"` // SHA256 hash
	ExpiresAt        time.Time `gorm:"not null"`
	CreatedAt        time.Time
	RevokedAt        *time.Time
	UserAgent        string
	IPAddress        string
	LastRefreshedAt  *time.Time
}

func (s *UserSession) IsValid() bool {
	return s.RevokedAt == nil && time.Now().Before(s.ExpiresAt)
}

func (s *UserSession) BeforeCreate(db *gorm.DB) error {
	if s.ID == uuid.Nil {
		s.ID = uuid.New()
	}
	return nil
}
