package projects

import (
	"github.com/dannyswat/pjeasy/internal/repositories"
	"gorm.io/gorm"
)

type ProjectInvitationRepository struct {
	uow *repositories.UnitOfWork
}

func NewProjectInvitationRepository(uow *repositories.UnitOfWork) *ProjectInvitationRepository {
	return &ProjectInvitationRepository{uow: uow}
}

func (r *ProjectInvitationRepository) Create(invitation *ProjectInvitation) error {
	return r.uow.GetDB().Create(invitation).Error
}

func (r *ProjectInvitationRepository) GetByTokenHash(tokenHash string) (*ProjectInvitation, error) {
	var invitation ProjectInvitation
	err := r.uow.GetDB().Where("token_hash = ?", tokenHash).First(&invitation).Error
	if err == gorm.ErrRecordNotFound {
		return nil, nil
	}

	return &invitation, err
}

func (r *ProjectInvitationRepository) ListByProjectID(projectID int) ([]ProjectInvitation, error) {
	var invitations []ProjectInvitation
	err := r.uow.GetDB().Where("project_id = ?", projectID).Order("created_at DESC").Find(&invitations).Error
	return invitations, err
}

func (r *ProjectInvitationRepository) GetByID(id int) (*ProjectInvitation, error) {
	var invitation ProjectInvitation
	err := r.uow.GetDB().First(&invitation, id).Error
	if err == gorm.ErrRecordNotFound {
		return nil, nil
	}

	return &invitation, err
}

func (r *ProjectInvitationRepository) Update(invitation *ProjectInvitation) error {
	return r.uow.GetDB().Save(invitation).Error
}
