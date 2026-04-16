package item_follow_ups

import (
	"github.com/dannyswat/pjeasy/internal/repositories"
	"gorm.io/gorm"
)

type ItemFollowUpRepository struct {
	uow *repositories.UnitOfWork
}

func NewItemFollowUpRepository(uow *repositories.UnitOfWork) *ItemFollowUpRepository {
	return &ItemFollowUpRepository{uow: uow}
}

func (r *ItemFollowUpRepository) Create(followUp *ItemFollowUp) error {
	return r.uow.GetDB().Create(followUp).Error
}

func (r *ItemFollowUpRepository) GetByID(id int) (*ItemFollowUp, error) {
	var followUp ItemFollowUp
	err := r.uow.GetDB().First(&followUp, id).Error
	if err == gorm.ErrRecordNotFound {
		return nil, nil
	}
	return &followUp, err
}

func (r *ItemFollowUpRepository) Update(followUp *ItemFollowUp) error {
	return r.uow.GetDB().Save(followUp).Error
}

func (r *ItemFollowUpRepository) Delete(id int) error {
	return r.uow.GetDB().Delete(&ItemFollowUp{}, id).Error
}

func (r *ItemFollowUpRepository) GetByItem(itemID int, itemType string) ([]ItemFollowUp, error) {
	var followUps []ItemFollowUp
	err := r.uow.GetDB().Where("item_id = ? AND item_type = ?", itemID, itemType).
		Order("follow_up_date DESC").
		Order("created_at DESC").
		Find(&followUps).Error
	return followUps, err
}
