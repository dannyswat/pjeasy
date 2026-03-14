package status_changes

import (
	"errors"
	"time"

	"github.com/dannyswat/pjeasy/internal/projects"
)

type StatusChangeService struct {
	repo       *StatusChangeRepository
	memberRepo *projects.ProjectMemberRepository
}

func NewStatusChangeService(repo *StatusChangeRepository, memberRepo *projects.ProjectMemberRepository) *StatusChangeService {
	return &StatusChangeService{repo: repo, memberRepo: memberRepo}
}

func (s *StatusChangeService) LogChange(projectID int, itemType string, itemID int, oldStatus, newStatus string, changedBy *int) error {
	if oldStatus == "" || newStatus == "" || oldStatus == newStatus {
		return nil
	}
	if !IsValidItemType(itemType) {
		return errors.New("invalid item type")
	}

	change := &StatusChange{
		ProjectID: projectID,
		ItemType:  itemType,
		ItemID:    itemID,
		OldStatus: oldStatus,
		NewStatus: newStatus,
		ChangedBy: changedBy,
		ChangedAt: time.Now(),
	}

	return s.repo.Create(change)
}

func (s *StatusChangeService) GetByItem(projectID int, itemType string, itemID int, userID int) ([]StatusChange, error) {
	if !IsValidItemType(itemType) {
		return nil, errors.New("invalid item type")
	}

	isMember, err := s.memberRepo.IsUserMember(projectID, userID)
	if err != nil {
		return nil, err
	}
	if !isMember {
		return nil, errors.New("user is not a member of this project")
	}

	return s.repo.GetByItem(projectID, itemType, itemID)
}
