package users

import (
	"errors"

	"github.com/dannyswat/pjeasy/internal/repositories"
	"gorm.io/gorm"
)

type UserRepository struct {
	uow *repositories.UnitOfWork
}

func NewUserRepository(uow *repositories.UnitOfWork) *UserRepository {
	return &UserRepository{uow: uow}
}

func (r *UserRepository) Create(user *User) error {
	return r.uow.GetDB().Create(user).Error
}

func (r *UserRepository) GetByID(userID int) (*User, error) {
	var user User
	err := r.uow.GetDB().Where("id = ?", userID).First(&user).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &user, nil
}

func (r *UserRepository) GetByLoginID(loginID string) (*User, error) {
	var user User
	err := r.uow.GetDB().Where("login_id = ?", loginID).First(&user).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &user, nil
}

func (r *UserRepository) Update(user *User) error {
	return r.uow.GetDB().Save(user).Error
}

func (r *UserRepository) Delete(userID int) error {
	return r.uow.GetDB().Delete(&User{}, userID).Error
}
