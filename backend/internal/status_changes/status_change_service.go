package status_changes

import (
	"errors"
	"strings"
	"time"

	"github.com/dannyswat/pjeasy/internal/projects"
)

type StatusChangeService struct {
	repo       *StatusChangeRepository
	flowRepo   *StatusFlowRepository
	memberRepo *projects.ProjectMemberRepository
}

func NewStatusChangeService(repo *StatusChangeRepository, flowRepo *StatusFlowRepository, memberRepo *projects.ProjectMemberRepository) *StatusChangeService {
	return &StatusChangeService{repo: repo, flowRepo: flowRepo, memberRepo: memberRepo}
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

func (s *StatusChangeService) ValidateTransition(projectID int, itemType string, fromStatus, toStatus string) error {
	if !IsValidItemType(itemType) {
		return errors.New("invalid item type")
	}

	toStatus = strings.TrimSpace(toStatus)
	if toStatus == "" {
		return errors.New("status is required")
	}

	normalizedFrom := normalizeStatusPointer(fromStatus)
	if normalizedFrom != nil && *normalizedFrom == toStatus {
		return nil
	}

	flows, err := s.flowRepo.GetActiveByTransition(projectID, itemType, normalizedFrom)
	if err != nil {
		return err
	}
	if len(flows) == 0 {
		return nil
	}

	for _, flow := range flows {
		if flow.Allows(toStatus) {
			return nil
		}
	}

	if normalizedFrom == nil {
		return errors.New("status transition from new to " + toStatus + " is not allowed")
	}

	return errors.New("status transition from " + *normalizedFrom + " to " + toStatus + " is not allowed")
}

func (s *StatusChangeService) ListStatusFlows(projectID int, userID int) ([]StatusFlow, error) {
	isMember, err := s.memberRepo.IsUserMember(projectID, userID)
	if err != nil {
		return nil, err
	}
	if !isMember {
		return nil, errors.New("user is not a member of this project")
	}

	return s.flowRepo.GetByProjectID(projectID)
}

func (s *StatusChangeService) CreateStatusFlow(projectID int, itemType string, fromStatus *string, toStatuses []string, disabled bool, userID int) (*StatusFlow, error) {
	if err := s.ensureManager(projectID, userID); err != nil {
		return nil, err
	}

	normalizedFrom, normalizedTo, err := s.validateStatusFlowInput(projectID, itemType, fromStatus, toStatuses, nil)
	if err != nil {
		return nil, err
	}

	now := time.Now()
	flow := &StatusFlow{
		ProjectID:  projectID,
		ItemType:   itemType,
		FromStatus: normalizedFrom,
		ToStatuses: StatusList(normalizedTo),
		Disabled:   disabled,
		CreatedAt:  now,
		UpdatedAt:  now,
	}

	if err := s.flowRepo.Create(flow); err != nil {
		return nil, err
	}

	return flow, nil
}

func (s *StatusChangeService) UpdateStatusFlow(projectID int, flowID int, itemType string, fromStatus *string, toStatuses []string, disabled bool, userID int) (*StatusFlow, error) {
	if err := s.ensureManager(projectID, userID); err != nil {
		return nil, err
	}

	flow, err := s.flowRepo.GetByID(flowID)
	if err != nil {
		return nil, err
	}
	if flow == nil || flow.ProjectID != projectID {
		return nil, errors.New("status flow not found")
	}

	normalizedFrom, normalizedTo, err := s.validateStatusFlowInput(projectID, itemType, fromStatus, toStatuses, &flowID)
	if err != nil {
		return nil, err
	}

	flow.ItemType = itemType
	flow.FromStatus = normalizedFrom
	flow.ToStatuses = StatusList(normalizedTo)
	flow.Disabled = disabled
	flow.UpdatedAt = time.Now()

	if err := s.flowRepo.Update(flow); err != nil {
		return nil, err
	}

	return flow, nil
}

func (s *StatusChangeService) DeleteStatusFlow(projectID int, flowID int, userID int) error {
	if err := s.ensureManager(projectID, userID); err != nil {
		return err
	}

	flow, err := s.flowRepo.GetByID(flowID)
	if err != nil {
		return err
	}
	if flow == nil || flow.ProjectID != projectID {
		return errors.New("status flow not found")
	}

	return s.flowRepo.Delete(flowID)
}

func (s *StatusChangeService) ensureManager(projectID int, userID int) error {
	isManager, err := s.memberRepo.IsUserAdmin(projectID, userID)
	if err != nil {
		return err
	}
	if !isManager {
		return errors.New("only project managers can manage status workflows")
	}

	return nil
}

func (s *StatusChangeService) validateStatusFlowInput(projectID int, itemType string, fromStatus *string, toStatuses []string, excludeID *int) (*string, []string, error) {
	if !IsValidItemType(itemType) {
		return nil, nil, errors.New("invalid item type")
	}

	normalizedFrom := normalizeOptionalPointer(fromStatus)
	normalizedTo := normalizeStatuses(toStatuses)
	if len(normalizedTo) == 0 {
		return nil, nil, errors.New("toStatuses must contain at least one status")
	}

	exists, err := s.flowRepo.ExistsByTransition(projectID, itemType, normalizedFrom, excludeID)
	if err != nil {
		return nil, nil, err
	}
	if exists {
		return nil, nil, errors.New("a status workflow already exists for this item type and from status")
	}

	return normalizedFrom, normalizedTo, nil
}

func normalizeStatusPointer(status string) *string {
	trimmed := strings.TrimSpace(status)
	if trimmed == "" {
		return nil
	}

	return &trimmed
}

func normalizeOptionalPointer(status *string) *string {
	if status == nil {
		return nil
	}

	return normalizeStatusPointer(*status)
}

func normalizeStatuses(statuses []string) []string {
	result := make([]string, 0, len(statuses))
	seen := make(map[string]struct{}, len(statuses))
	for _, status := range statuses {
		trimmed := strings.TrimSpace(status)
		if trimmed == "" {
			continue
		}
		if _, ok := seen[trimmed]; ok {
			continue
		}
		seen[trimmed] = struct{}{}
		result = append(result, trimmed)
	}

	return result
}
