package status_changes

import (
	"github.com/dannyswat/pjeasy/internal/repositories"
	"gorm.io/gorm"
)

type StatusFlowRepository struct {
	uow *repositories.UnitOfWork
}

func NewStatusFlowRepository(uow *repositories.UnitOfWork) *StatusFlowRepository {
	return &StatusFlowRepository{uow: uow}
}

func (r *StatusFlowRepository) Create(flow *StatusFlow) error {
	return r.uow.GetDB().Create(flow).Error
}

func (r *StatusFlowRepository) Update(flow *StatusFlow) error {
	return r.uow.GetDB().Save(flow).Error
}

func (r *StatusFlowRepository) Delete(id int) error {
	return r.uow.GetDB().Delete(&StatusFlow{}, id).Error
}

func (r *StatusFlowRepository) GetByID(id int) (*StatusFlow, error) {
	var flow StatusFlow
	err := r.uow.GetDB().First(&flow, id).Error
	if err == gorm.ErrRecordNotFound {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}

	return &flow, nil
}

func (r *StatusFlowRepository) GetByProjectID(projectID int) ([]StatusFlow, error) {
	var flows []StatusFlow
	err := r.uow.GetDB().Where("project_id = ?", projectID).
		Order("item_type ASC").
		Order("from_status ASC").
		Order("id ASC").
		Find(&flows).Error
	return flows, err
}

func (r *StatusFlowRepository) GetActiveByTransition(projectID int, itemType string, fromStatus *string) ([]StatusFlow, error) {
	query := r.uow.GetDB().Where("project_id = ? AND item_type = ? AND disabled = ?", projectID, itemType, false)
	if fromStatus == nil {
		query = query.Where("from_status IS NULL")
	} else {
		query = query.Where("from_status = ?", *fromStatus)
	}

	var flows []StatusFlow
	err := query.Order("id ASC").Find(&flows).Error
	return flows, err
}

func (r *StatusFlowRepository) ExistsByTransition(projectID int, itemType string, fromStatus *string, excludeID *int) (bool, error) {
	query := r.uow.GetDB().Model(&StatusFlow{}).Where("project_id = ? AND item_type = ?", projectID, itemType)
	if fromStatus == nil {
		query = query.Where("from_status IS NULL")
	} else {
		query = query.Where("from_status = ?", *fromStatus)
	}
	if excludeID != nil {
		query = query.Where("id <> ?", *excludeID)
	}

	var count int64
	err := query.Count(&count).Error
	return count > 0, err
}
