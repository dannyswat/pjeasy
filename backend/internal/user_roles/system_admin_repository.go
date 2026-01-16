package userroles

import (
	"time"

	"github.com/dannyswat/pjeasy/internal/repositories"
	"gorm.io/gorm"
)

type SystemAdminRepository struct {
	uow *repositories.UnitOfWork
}

func NewSystemAdminRepository(uow *repositories.UnitOfWork) *SystemAdminRepository {
	return &SystemAdminRepository{uow: uow}
}

// GetAll returns all system admins
func (r *SystemAdminRepository) GetAll() ([]SystemAdmin, error) {
	var admins []SystemAdmin
	err := r.uow.GetDB().Order("created_at DESC").Find(&admins).Error
	return admins, err
}

// GetActive returns all active (non-expired) system admins
func (r *SystemAdminRepository) GetActive() ([]SystemAdmin, error) {
	var admins []SystemAdmin
	err := r.uow.GetDB().Where("expired_after IS NULL OR expired_after > ?", time.Now()).
		Order("created_at DESC").
		Find(&admins).Error
	return admins, err
}

// GetByUserID finds a system admin by user ID
func (r *SystemAdminRepository) GetByUserID(userID int) (*SystemAdmin, error) {
	var admin SystemAdmin
	err := r.uow.GetDB().Where("user_id = ?", userID).First(&admin).Error
	if err == gorm.ErrRecordNotFound {
		return nil, nil
	}
	return &admin, err
}

// Create creates a new system admin
func (r *SystemAdminRepository) Create(admin *SystemAdmin) error {
	return r.uow.GetDB().Create(admin).Error
}

// Update updates an existing system admin
func (r *SystemAdminRepository) Update(admin *SystemAdmin) error {
	return r.uow.GetDB().Save(admin).Error
}

// Delete deletes a system admin
func (r *SystemAdminRepository) Delete(id int) error {
	return r.uow.GetDB().Delete(&SystemAdmin{}, id).Error
}

// DeleteByUserID deletes a system admin by user ID
func (r *SystemAdminRepository) DeleteByUserID(userID int) error {
	return r.uow.GetDB().Where("user_id = ?", userID).Delete(&SystemAdmin{}).Error
}

// IsUserAdmin checks if a user is an active system admin
func (r *SystemAdminRepository) IsUserAdmin(userID int) (bool, error) {
	var count int64
	err := r.uow.GetDB().Model(&SystemAdmin{}).
		Where("user_id = ? AND (expired_after IS NULL OR expired_after > ?)", userID, time.Now()).
		Count(&count).Error
	return count > 0, err
}
