package user_sessions

import (
	"errors"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type UserSessionRepository struct {
	db *gorm.DB
}

func NewUserSessionRepository(db *gorm.DB) *UserSessionRepository {
	return &UserSessionRepository{db: db}
}

func (r *UserSessionRepository) Create(session *UserSession) error {
	return r.db.Create(session).Error
}

func (r *UserSessionRepository) GetByID(sessionID uuid.UUID) (*UserSession, error) {
	var session UserSession
	err := r.db.Where("id = ?", sessionID).First(&session).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &session, nil
}

func (r *UserSessionRepository) GetByRefreshTokenHash(refreshTokenHash string) (*UserSession, error) {
	var session UserSession
	err := r.db.Where("refresh_token_hash = ?", refreshTokenHash).First(&session).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &session, nil
}

func (r *UserSessionRepository) GetByUserID(userID int) ([]*UserSession, error) {
	var sessions []*UserSession
	err := r.db.Where("user_id = ? AND revoked_at IS NULL", userID).Order("created_at DESC").Find(&sessions).Error
	if err != nil {
		return nil, err
	}
	return sessions, nil
}

func (r *UserSessionRepository) Revoke(sessionID uuid.UUID) error {
	now := time.Now()
	return r.db.Model(&UserSession{}).Where("id = ?", sessionID).Update("revoked_at", now).Error
}

func (r *UserSessionRepository) Update(session *UserSession) error {
	return r.db.Save(session).Error
}

func (r *UserSessionRepository) RevokeAllByUserID(userID int) error {
	now := time.Now()
	return r.db.Model(&UserSession{}).Where("user_id = ? AND revoked_at IS NULL", userID).Update("revoked_at", now).Error
}

func (r *UserSessionRepository) DeleteExpired() error {
	return r.db.Where("expires_at < ?", time.Now()).Delete(&UserSession{}).Error
}
