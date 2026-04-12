package user_dailies

import (
	"time"

	"github.com/dannyswat/pjeasy/internal/repositories"
	"gorm.io/gorm"
)

type UserDailyItemRepository struct {
	uow *repositories.UnitOfWork
}

func NewUserDailyItemRepository(uow *repositories.UnitOfWork) *UserDailyItemRepository {
	return &UserDailyItemRepository{uow: uow}
}

func (r *UserDailyItemRepository) Create(item *UserDailyItem) error {
	return r.uow.GetDB().Create(item).Error
}

func (r *UserDailyItemRepository) GetByID(id int) (*UserDailyItem, error) {
	var item UserDailyItem
	err := r.uow.GetDB().First(&item, id).Error
	if err == gorm.ErrRecordNotFound {
		return nil, nil
	}
	return &item, err
}

func (r *UserDailyItemRepository) GetByUserDateAndItem(userID int, workDate time.Time, itemType string, itemID int) (*UserDailyItem, error) {
	var item UserDailyItem
	err := r.uow.GetDB().Where("user_id = ? AND work_date = ? AND item_type = ? AND item_id = ?", userID, workDate, itemType, itemID).First(&item).Error
	if err == gorm.ErrRecordNotFound {
		return nil, nil
	}
	return &item, err
}

func (r *UserDailyItemRepository) ListByUserAndDate(userID int, workDate time.Time) ([]UserDailyItem, error) {
	var items []UserDailyItem
	err := r.uow.GetDB().Where("user_id = ? AND work_date = ?", userID, workDate).Order("created_at ASC").Find(&items).Error
	return items, err
}

func (r *UserDailyItemRepository) Delete(id int) error {
	return r.uow.GetDB().Delete(&UserDailyItem{}, id).Error
}

type UserDailyTimeLogRepository struct {
	uow *repositories.UnitOfWork
}

func NewUserDailyTimeLogRepository(uow *repositories.UnitOfWork) *UserDailyTimeLogRepository {
	return &UserDailyTimeLogRepository{uow: uow}
}

func (r *UserDailyTimeLogRepository) Create(log *UserDailyTimeLog) error {
	return r.uow.GetDB().Create(log).Error
}

func (r *UserDailyTimeLogRepository) GetByID(id int) (*UserDailyTimeLog, error) {
	var log UserDailyTimeLog
	err := r.uow.GetDB().First(&log, id).Error
	if err == gorm.ErrRecordNotFound {
		return nil, nil
	}
	return &log, err
}

func (r *UserDailyTimeLogRepository) Update(log *UserDailyTimeLog) error {
	return r.uow.GetDB().Save(log).Error
}

func (r *UserDailyTimeLogRepository) Delete(id int) error {
	return r.uow.GetDB().Delete(&UserDailyTimeLog{}, id).Error
}

func (r *UserDailyTimeLogRepository) DeleteByDailyItemID(userDailyItemID int) error {
	return r.uow.GetDB().Where("user_daily_item_id = ?", userDailyItemID).Delete(&UserDailyTimeLog{}).Error
}

func (r *UserDailyTimeLogRepository) ListByUserAndDate(userID int, logDate time.Time) ([]UserDailyTimeLog, error) {
	var logs []UserDailyTimeLog
	err := r.uow.GetDB().Where("user_id = ? AND log_date = ?", userID, logDate).Order("start_unit ASC, created_at ASC").Find(&logs).Error
	return logs, err
}

func (r *UserDailyTimeLogRepository) ListByUserAndRange(userID int, startDate, endDate time.Time) ([]UserDailyTimeLog, error) {
	var logs []UserDailyTimeLog
	err := r.uow.GetDB().Where("user_id = ? AND log_date >= ? AND log_date <= ?", userID, startDate, endDate).Order("log_date ASC, start_unit ASC").Find(&logs).Error
	return logs, err
}

func (r *UserDailyTimeLogRepository) HasOverlap(userID int, logDate time.Time, startUnit, durationUnits int, excludeID *int) (bool, error) {
	endUnit := startUnit + durationUnits
	query := r.uow.GetDB().Model(&UserDailyTimeLog{}).
		Where("user_id = ? AND log_date = ?", userID, logDate).
		Where("start_unit < ? AND start_unit + duration_units > ?", endUnit, startUnit)
	if excludeID != nil {
		query = query.Where("id != ?", *excludeID)
	}

	var count int64
	err := query.Count(&count).Error
	return count > 0, err
}
