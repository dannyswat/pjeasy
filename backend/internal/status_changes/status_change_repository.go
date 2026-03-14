package status_changes

import "github.com/dannyswat/pjeasy/internal/repositories"

type StatusChangeRepository struct {
	uow *repositories.UnitOfWork
}

func NewStatusChangeRepository(uow *repositories.UnitOfWork) *StatusChangeRepository {
	return &StatusChangeRepository{uow: uow}
}

func (r *StatusChangeRepository) Create(change *StatusChange) error {
	return r.uow.GetDB().Create(change).Error
}

func (r *StatusChangeRepository) GetByItem(projectID int, itemType string, itemID int) ([]StatusChange, error) {
	var changes []StatusChange
	err := r.uow.GetDB().Where("project_id = ? AND item_type = ? AND item_id = ?", projectID, itemType, itemID).
		Order("changed_at DESC").
		Find(&changes).Error
	return changes, err
}
