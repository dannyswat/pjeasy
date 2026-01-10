package users

import (
	"errors"

	"github.com/dannyswat/pjeasy/internal/repositories"
	"gorm.io/gorm"
)

type UserCredentialRepository struct {
	uow *repositories.UnitOfWork
}

func NewUserCredentialRepository(uow *repositories.UnitOfWork) *UserCredentialRepository {
	return &UserCredentialRepository{uow: uow}
}

func (r *UserCredentialRepository) Create(credential *UserCredential) error {
	return r.uow.GetDB().Create(credential).Error
}

func (r *UserCredentialRepository) Update(credential *UserCredential) error {
	return r.uow.GetDB().Save(credential).Error
}

func (r *UserCredentialRepository) Delete(id int) error {
	return r.uow.GetDB().Delete(&UserCredential{}, id).Error
}

func (r *UserCredentialRepository) GetByID(id int) (*UserCredential, error) {
	var credential UserCredential
	err := r.uow.GetDB().Where("id = ?", id).First(&credential).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &credential, nil
}

func (r *UserCredentialRepository) GetByUserIDAndType(userID int, credType CredentialType) (*UserCredential, error) {
	var credential UserCredential
	err := r.uow.GetDB().Where("user_id = ? AND type = ?", userID, credType).First(&credential).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &credential, nil
}
