package user_sessions

import (
	"errors"
	"time"

	"github.com/dannyswat/pjeasy/internal/repositories"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type UserSessionRepository struct {
	uow *repositories.UnitOfWork
}

func NewUserSessionRepository(uow *repositories.UnitOfWork) *UserSessionRepository {
	return &UserSessionRepository{uow: uow}
}

func (r *UserSessionRepository) Create(session *UserSession) error {
	return r.uow.GetDB().Create(session).Error
}

func (r *UserSessionRepository) GetByID(sessionID uuid.UUID) (*UserSession, error) {
	var session UserSession
	err := r.uow.GetDB().Where("id = ?", sessionID).First(&session).Error
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
	err := r.uow.GetDB().Where("refresh_token_hash = ?", refreshTokenHash).First(&session).Error
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
	err := r.uow.GetDB().Where("user_id = ? AND revoked_at IS NULL", userID).Order("created_at DESC").Find(&sessions).Error
	if err != nil {
		return nil, err
	}
	return sessions, nil
}

func (r *UserSessionRepository) Revoke(sessionID uuid.UUID) error {
	now := time.Now()
	return r.uow.GetDB().Model(&UserSession{}).Where("id = ?", sessionID).Update("revoked_at", now).Error
}

func (r *UserSessionRepository) Update(session *UserSession) error {
	return r.uow.GetDB().Save(session).Error
}

func (r *UserSessionRepository) RevokeAllByUserID(userID int) error {
	now := time.Now()
	return r.uow.GetDB().Model(&UserSession{}).Where("user_id = ? AND revoked_at IS NULL", userID).Update("revoked_at", now).Error
}

func (r *UserSessionRepository) DeleteExpired() error {
	return r.uow.GetDB().Where("expires_at < ?", time.Now()).Delete(&UserSession{}).Error
}
