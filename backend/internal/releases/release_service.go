package releases

import (
	"errors"
	"strconv"
	"time"

	"github.com/dannyswat/pjeasy/internal/features"
	"github.com/dannyswat/pjeasy/internal/htmlsanitizer"
	"github.com/dannyswat/pjeasy/internal/ideas"
	"github.com/dannyswat/pjeasy/internal/issues"
	"github.com/dannyswat/pjeasy/internal/projects"
	"github.com/dannyswat/pjeasy/internal/repositories"
	"github.com/dannyswat/pjeasy/internal/status_changes"
	"github.com/dannyswat/pjeasy/internal/tasks"
	"gorm.io/gorm"
)

type ReleaseService struct {
	releaseRepo *ReleaseRepository
	memberRepo  *projects.ProjectMemberRepository
	projectRepo *projects.ProjectRepository
	statusRepo  *status_changes.StatusChangeService
	uowFactory  *repositories.UnitOfWorkFactory
}

func NewReleaseService(
	releaseRepo *ReleaseRepository,
	memberRepo *projects.ProjectMemberRepository,
	projectRepo *projects.ProjectRepository,
	statusRepo *status_changes.StatusChangeService,
	uowFactory *repositories.UnitOfWorkFactory,
) *ReleaseService {
	return &ReleaseService{
		releaseRepo: releaseRepo,
		memberRepo:  memberRepo,
		projectRepo: projectRepo,
		statusRepo:  statusRepo,
		uowFactory:  uowFactory,
	}
}

// CreateRelease creates a new release
func (s *ReleaseService) CreateRelease(projectID int, version, description string, targetDate *time.Time, selectedItems []ConfirmedReleaseItem, createdBy int) (*Release, error) {
	project, err := s.projectRepo.GetByID(projectID)
	if err != nil {
		return nil, err
	}
	if project == nil {
		return nil, errors.New("project not found")
	}

	canWrite, err := s.memberRepo.CanUserWriteProject(projectID, createdBy)
	if err != nil {
		return nil, err
	}
	if !canWrite {
		return nil, errors.New("project users can only read project items")
	}

	if version == "" {
		return nil, errors.New("version is required")
	}

	description = htmlsanitizer.Sanitize(description)

	now := time.Now()
	if err := s.statusRepo.ValidateTransition(projectID, status_changes.ItemTypeRelease, "", ReleaseStatusOpen); err != nil {
		return nil, err
	}

	release := &Release{
		Version:     version,
		ProjectID:   projectID,
		Description: description,
		Status:      ReleaseStatusOpen,
		TargetDate:  targetDate,
		CreatedBy:   createdBy,
		CreatedAt:   now,
		UpdatedAt:   now,
	}

	if err := s.releaseRepo.uow.GetDB().Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(release).Error; err != nil {
			return err
		}

		return syncReleaseWorkItems(tx, release.ID, projectID, selectedItems, false, false)
	}); err != nil {
		return nil, err
	}

	return release, nil
}

// UpdateRelease updates a release's details
func (s *ReleaseService) UpdateRelease(releaseID int, version, description string, targetDate *time.Time, updatedBy int) (*Release, error) {
	release, err := s.releaseRepo.GetByID(releaseID)
	if err != nil {
		return nil, err
	}
	if release == nil {
		return nil, errors.New("release not found")
	}

	canWrite, err := s.memberRepo.CanUserWriteProject(release.ProjectID, updatedBy)
	if err != nil {
		return nil, err
	}
	if !canWrite {
		return nil, errors.New("project users can only read project items")
	}

	if version == "" {
		return nil, errors.New("version is required")
	}

	description = htmlsanitizer.Sanitize(description)

	release.Version = version
	release.Description = description
	release.TargetDate = targetDate
	release.UpdatedAt = time.Now()

	if err := s.releaseRepo.Update(release); err != nil {
		return nil, err
	}

	return release, nil
}

// UpdateReleaseStatus updates a release's status
func (s *ReleaseService) UpdateReleaseStatus(releaseID int, status string, confirmedItems []ConfirmedReleaseItem, updatedBy int) (*Release, error) {
	if !IsValidStatus(status) {
		return nil, errors.New("invalid status")
	}

	release, err := s.releaseRepo.GetByID(releaseID)
	if err != nil {
		return nil, err
	}
	if release == nil {
		return nil, errors.New("release not found")
	}

	canWrite, err := s.memberRepo.CanUserWriteProject(release.ProjectID, updatedBy)
	if err != nil {
		return nil, err
	}
	if !canWrite {
		return nil, errors.New("project users can only read project items")
	}

	oldStatus := release.Status
	if err := s.statusRepo.ValidateTransition(release.ProjectID, status_changes.ItemTypeRelease, oldStatus, status); err != nil {
		return nil, err
	}

	if err := s.releaseRepo.uow.GetDB().Transaction(func(tx *gorm.DB) error {
		if status == ReleaseStatusInUAT && confirmedItems != nil {
			if err := syncReleaseWorkItems(tx, releaseID, release.ProjectID, confirmedItems, true, true); err != nil {
				return err
			}
		}

		return tx.Model(&Release{}).
			Where("id = ?", releaseID).
			Update("status", status).Error
	}); err != nil {
		return nil, err
	}

	if err := s.statusRepo.LogChange(release.ProjectID, status_changes.ItemTypeRelease, release.ID, oldStatus, status, &updatedBy); err != nil {
		return nil, err
	}

	return s.releaseRepo.GetByID(releaseID)
}

type ConfirmedReleaseItem struct {
	ID       int
	ItemType string
}

type ReleaseCandidateItem struct {
	ID       int    `json:"id"`
	RefNum   string `json:"refNum"`
	Title    string `json:"title"`
	Status   string `json:"status"`
	ItemType string `json:"itemType"`
	Linked   bool   `json:"linked"`
}

// CompleteRelease completes a release. confirmedItems contains the item type and ID pairs
// that the user confirmed as released. Items not in the list will be unlinked.
func (s *ReleaseService) CompleteRelease(releaseID int, confirmedItems []ConfirmedReleaseItem, updatedBy int) (*Release, error) {
	release, err := s.releaseRepo.GetByID(releaseID)
	if err != nil {
		return nil, err
	}
	if release == nil {
		return nil, errors.New("release not found")
	}

	canWrite, err := s.memberRepo.CanUserWriteProject(release.ProjectID, updatedBy)
	if err != nil {
		return nil, err
	}
	if !canWrite {
		return nil, errors.New("project users can only read project items")
	}

	oldStatus := release.Status
	if err := s.statusRepo.ValidateTransition(release.ProjectID, status_changes.ItemTypeRelease, oldStatus, ReleaseStatusCompleted); err != nil {
		return nil, err
	}

	if err := s.releaseRepo.uow.GetDB().Transaction(func(tx *gorm.DB) error {
		groupedItems, err := groupReleaseItems(confirmedItems)
		if err != nil {
			return err
		}

		for _, config := range completedReleaseItemConfigs() {
			ids := groupedItems[config.key]
			query := tx.Table(config.table).Where("project_id = ? AND release_id = ?", release.ProjectID, releaseID)
			if len(ids) > 0 {
				query = query.Where("id NOT IN ?", ids)
			}
			if err := query.Update("release_id", nil).Error; err != nil {
				return err
			}

			if len(ids) == 0 {
				continue
			}

			if err := s.markReleaseItemsCompleted(tx, release.ProjectID, ids, config, updatedBy); err != nil {
				return err
			}
		}

		return tx.Model(&Release{}).
			Where("id = ?", releaseID).
			Update("status", ReleaseStatusCompleted).Error
	}); err != nil {
		return nil, err
	}

	if err := s.statusRepo.LogChange(release.ProjectID, status_changes.ItemTypeRelease, release.ID, oldStatus, ReleaseStatusCompleted, &updatedBy); err != nil {
		return nil, err
	}

	return s.releaseRepo.GetByID(releaseID)
}

type completedReleaseItemConfig struct {
	key             string
	table           string
	itemType        string
	targetStatus    string
	statusChangeKey string
	updateStatus    bool
}

type releasableItemStatusRow struct {
	ID     int
	Status string
}

func completedReleaseItemConfigs() []completedReleaseItemConfig {
	return []completedReleaseItemConfig{
		{key: "feature", table: "features", itemType: "feature", targetStatus: features.FeatureStatusCompleted, statusChangeKey: status_changes.ItemTypeFeature, updateStatus: true},
		{key: "issue", table: "issues", itemType: "issue", targetStatus: issues.IssueStatusCompleted, statusChangeKey: status_changes.ItemTypeIssue, updateStatus: true},
		{key: "task", table: "tasks", itemType: "task", targetStatus: tasks.TaskStatusCompleted, statusChangeKey: status_changes.ItemTypeTask, updateStatus: true},
		{key: "idea", table: "ideas", itemType: "idea", targetStatus: ideas.IdeaStatusClosed, statusChangeKey: status_changes.ItemTypeIdea, updateStatus: true},
		{key: "sprint", table: "sprints", itemType: "sprint", targetStatus: "", statusChangeKey: status_changes.ItemTypeSprint, updateStatus: false},
	}
}

func (s *ReleaseService) markReleaseItemsCompleted(tx *gorm.DB, projectID int, ids []int, config completedReleaseItemConfig, updatedBy int) error {
	if !config.updateStatus {
		return nil
	}

	var rows []releasableItemStatusRow
	if err := tx.Table(config.table).
		Select("id, status").
		Where("project_id = ? AND id IN ? AND release_id IS NOT NULL", projectID, ids).
		Find(&rows).Error; err != nil {
		return err
	}
	if len(rows) != len(ids) {
		return errors.New("one or more linked release items could not be found")
	}

	now := time.Now()
	for _, row := range rows {
		if row.Status == config.targetStatus {
			continue
		}

		if err := s.statusRepo.ValidateTransition(projectID, config.statusChangeKey, row.Status, config.targetStatus); err != nil {
			return err
		}

		if err := tx.Table(config.table).
			Where("project_id = ? AND id = ?", projectID, row.ID).
			Update("status", config.targetStatus).Error; err != nil {
			return err
		}

		change := &status_changes.StatusChange{
			ProjectID: projectID,
			ItemType:  config.statusChangeKey,
			ItemID:    row.ID,
			OldStatus: row.Status,
			NewStatus: config.targetStatus,
			ChangedBy: &updatedBy,
			ChangedAt: now,
		}
		if err := tx.Create(change).Error; err != nil {
			return err
		}
	}

	return nil
}

// DeleteRelease deletes a release
func (s *ReleaseService) DeleteRelease(releaseID int, deletedBy int) error {
	release, err := s.releaseRepo.GetByID(releaseID)
	if err != nil {
		return err
	}
	if release == nil {
		return errors.New("release not found")
	}

	canWrite, err := s.memberRepo.CanUserWriteProject(release.ProjectID, deletedBy)
	if err != nil {
		return err
	}
	if !canWrite {
		return errors.New("project users can only read project items")
	}

	// Unlink all items associated with this release
	db := s.releaseRepo.uow.GetDB()
	tables := []string{"features", "issues", "tasks", "ideas", "sprints"}
	for _, table := range tables {
		if err := db.Table(table).
			Where("release_id = ?", releaseID).
			Update("release_id", nil).Error; err != nil {
			return err
		}
	}

	return s.releaseRepo.Delete(releaseID)
}

// GetRelease retrieves a release by ID
func (s *ReleaseService) GetRelease(releaseID int, requestedBy int) (*Release, error) {
	release, err := s.releaseRepo.GetByID(releaseID)
	if err != nil {
		return nil, err
	}
	if release == nil {
		return nil, errors.New("release not found")
	}

	isMember, err := s.memberRepo.IsUserMember(release.ProjectID, requestedBy)
	if err != nil {
		return nil, err
	}
	if !isMember {
		return nil, errors.New("user is not a member of this project")
	}

	return release, nil
}

// GetProjectReleases retrieves all releases for a project with optional status filter
func (s *ReleaseService) GetProjectReleases(projectID int, statuses []string, page, pageSize int, requestedBy int) ([]Release, int64, error) {
	isMember, err := s.memberRepo.IsUserMember(projectID, requestedBy)
	if err != nil {
		return nil, 0, err
	}
	if !isMember {
		return nil, 0, errors.New("user is not a member of this project")
	}

	offset := (page - 1) * pageSize

	if len(statuses) == 1 {
		if !IsValidStatus(statuses[0]) {
			return nil, 0, errors.New("invalid status")
		}
		return s.releaseRepo.GetByProjectIDAndStatus(projectID, statuses[0], offset, pageSize)
	} else if len(statuses) > 1 {
		for _, status := range statuses {
			if !IsValidStatus(status) {
				return nil, 0, errors.New("invalid status: " + status)
			}
		}
		return s.releaseRepo.GetByProjectIDAndStatuses(projectID, statuses, offset, pageSize)
	}

	return s.releaseRepo.GetByProjectID(projectID, offset, pageSize)
}

// ReleaseItem represents an item linked to a release
type ReleaseItem struct {
	ID          int    `json:"id"`
	RefNum      string `json:"refNum"`
	Title       string `json:"title"`
	Description string `json:"description"`
	Status      string `json:"status"`
	ItemType    string `json:"itemType"` // "feature", "issue", "task", "idea", "sprint"
}

// GetReleaseItems retrieves all items linked to a release
func (s *ReleaseService) GetReleaseItems(releaseID int, requestedBy int) ([]ReleaseItem, error) {
	release, err := s.releaseRepo.GetByID(releaseID)
	if err != nil {
		return nil, err
	}
	if release == nil {
		return nil, errors.New("release not found")
	}

	isMember, err := s.memberRepo.IsUserMember(release.ProjectID, requestedBy)
	if err != nil {
		return nil, err
	}
	if !isMember {
		return nil, errors.New("user is not a member of this project")
	}

	var items []ReleaseItem
	db := s.releaseRepo.uow.GetDB()

	// Query features
	var featureItems []ReleaseItem
	db.Table("features").Select("id, ref_num, title, description, status, 'feature' as item_type").
		Where("release_id = ?", releaseID).Scan(&featureItems)
	items = append(items, featureItems...)

	// Query issues
	var issueItems []ReleaseItem
	db.Table("issues").Select("id, ref_num, title, description, status, 'issue' as item_type").
		Where("release_id = ?", releaseID).Scan(&issueItems)
	items = append(items, issueItems...)

	// Query tasks
	var taskItems []ReleaseItem
	db.Table("tasks t").
		Select(`t.id,
			'' as ref_num,
			t.title,
			COALESCE(
				NULLIF(
					CASE
						WHEN t.item_type = 'ideas' THEN linked_ideas.description
						WHEN t.item_type = 'features' THEN linked_features.description
						WHEN t.item_type = 'issues' THEN linked_issues.description
						WHEN t.item_type = 'service-tickets' THEN linked_service_tickets.description
						ELSE ''
					END,
					''
				),
				t.description
			) as description,
			t.status,
			'task' as item_type`).
		Joins("LEFT JOIN ideas linked_ideas ON t.item_type = ? AND t.item_id = linked_ideas.id", "ideas").
		Joins("LEFT JOIN features linked_features ON t.item_type = ? AND t.item_id = linked_features.id", "features").
		Joins("LEFT JOIN issues linked_issues ON t.item_type = ? AND t.item_id = linked_issues.id", "issues").
		Joins("LEFT JOIN service_tickets linked_service_tickets ON t.item_type = ? AND t.item_id = linked_service_tickets.id", "service-tickets").
		Where("t.release_id = ?", releaseID).Scan(&taskItems)
	items = append(items, taskItems...)

	// Query ideas
	var ideaItems []ReleaseItem
	db.Table("ideas").Select("id, ref_num, title, description, status, 'idea' as item_type").
		Where("release_id = ?", releaseID).Scan(&ideaItems)
	items = append(items, ideaItems...)

	// Query sprints
	var sprintItems []ReleaseItem
	db.Table("sprints").Select("id, '' as ref_num, name as title, goal as description, status, 'sprint' as item_type").
		Where("release_id = ?", releaseID).Scan(&sprintItems)
	items = append(items, sprintItems...)

	return items, nil
}

func (s *ReleaseService) GetReleaseCandidateItems(projectID int, releaseID *int, excludeDone bool, linkedOnly bool, requestedBy int) ([]ReleaseCandidateItem, error) {
	isMember, err := s.memberRepo.IsUserMember(projectID, requestedBy)
	if err != nil {
		return nil, err
	}
	if !isMember {
		return nil, errors.New("user is not a member of this project")
	}

	if releaseID != nil {
		release, err := s.releaseRepo.GetByID(*releaseID)
		if err != nil {
			return nil, err
		}
		if release == nil || release.ProjectID != projectID {
			return nil, errors.New("release not found")
		}
	}

	items := make([]ReleaseCandidateItem, 0)
	db := s.releaseRepo.uow.GetDB()

	appendItems := func(table string, titleColumn string, itemType string, withRefNum bool, excludedStatuses []string) error {
		refNumSelect := "'' as ref_num"
		if withRefNum {
			refNumSelect = "ref_num"
		}

		query := db.Table(table).
			Select("id, "+refNumSelect+", "+titleColumn+" as title, status, ? as item_type, CASE WHEN release_id IS NOT NULL THEN true ELSE false END as linked", itemType).
			Where("project_id = ?", projectID)

		if releaseID == nil {
			query = query.Where("release_id IS NULL")
		} else if linkedOnly {
			query = query.Where("release_id = ?", *releaseID)
		} else {
			query = query.Where("release_id IS NULL OR release_id = ?", *releaseID)
		}

		if excludeDone && len(excludedStatuses) > 0 {
			query = query.Where("status NOT IN ?", excludedStatuses)
		}

		var rows []ReleaseCandidateItem
		if err := query.Order("created_at DESC").Scan(&rows).Error; err != nil {
			return err
		}

		items = append(items, rows...)
		return nil
	}

	if err := appendItems("features", "title", "feature", true, []string{features.FeatureStatusCompleted, features.FeatureStatusClosed}); err != nil {
		return nil, err
	}
	if err := appendItems("issues", "title", "issue", true, []string{issues.IssueStatusCompleted, issues.IssueStatusClosed}); err != nil {
		return nil, err
	}
	if err := appendItems("tasks", "title", "task", false, []string{tasks.TaskStatusCompleted, tasks.TaskStatusClosed}); err != nil {
		return nil, err
	}

	return items, nil
}

func syncReleaseWorkItems(tx *gorm.DB, releaseID int, projectID int, confirmedItems []ConfirmedReleaseItem, unlinkMissing bool, promoteInReview bool) error {
	groupedItems, err := groupReleaseItems(confirmedItems)
	if err != nil {
		return err
	}

	types := []struct {
		itemType   string
		table      string
		assigned   string
		inProgress string
		inReview   string
		canPromote bool
	}{
		{itemType: "feature", table: "features", assigned: features.FeatureStatusAssigned, inProgress: features.FeatureStatusInProgress, inReview: features.FeatureStatusInReview, canPromote: true},
		{itemType: "issue", table: "issues", assigned: issues.IssueStatusAssigned, inProgress: issues.IssueStatusInProgress, inReview: issues.IssueStatusInReview, canPromote: true},
		{itemType: "task", table: "tasks", assigned: tasks.TaskStatusOpen, inProgress: "", inReview: tasks.TaskStatusInProgress, canPromote: true},
	}

	for _, itemConfig := range types {
		ids := groupedItems[itemConfig.itemType]
		if len(ids) > 0 {
			var count int64
			if err := tx.Table(itemConfig.table).
				Where("project_id = ? AND id IN ?", projectID, ids).
				Where("release_id IS NULL OR release_id = ?", releaseID).
				Count(&count).Error; err != nil {
				return err
			}
			if count != int64(len(ids)) {
				return errors.New("one or more selected release items are invalid or already linked to another release")
			}

			if err := tx.Table(itemConfig.table).
				Where("project_id = ? AND id IN ?", projectID, ids).
				Update("release_id", releaseID).Error; err != nil {
				return err
			}

			if promoteInReview && itemConfig.canPromote {
				if err := tx.Table(itemConfig.table).
					Where("project_id = ? AND id IN ? AND (status = ? OR status = ?)", projectID, ids, itemConfig.assigned, itemConfig.inProgress).
					Update("status", itemConfig.inReview).Error; err != nil {
					return err
				}
			}
		}

		if unlinkMissing {
			query := tx.Table(itemConfig.table).Where("project_id = ? AND release_id = ?", projectID, releaseID)
			if len(ids) > 0 {
				query = query.Where("id NOT IN ?", ids)
			}
			if err := query.Update("release_id", nil).Error; err != nil {
				return err
			}
		}
	}

	return nil
}

func groupReleaseItems(confirmedItems []ConfirmedReleaseItem) (map[string][]int, error) {
	groupedItems := map[string][]int{
		"feature": {},
		"issue":   {},
		"task":    {},
		"idea":    {},
		"sprint":  {},
	}

	seen := make(map[string]struct{}, len(confirmedItems))
	for _, item := range confirmedItems {
		if item.ID <= 0 {
			return nil, errors.New("release item id is required")
		}
		if _, ok := groupedItems[item.ItemType]; !ok {
			return nil, errors.New("invalid release item type")
		}

		key := item.ItemType + ":" + strconv.Itoa(item.ID)
		if _, ok := seen[key]; ok {
			continue
		}
		seen[key] = struct{}{}
		groupedItems[item.ItemType] = append(groupedItems[item.ItemType], item.ID)
	}

	return groupedItems, nil
}
