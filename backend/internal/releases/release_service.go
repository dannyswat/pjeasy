package releases

import (
	"errors"
	"time"

	"github.com/dannyswat/pjeasy/internal/htmlsanitizer"
	"github.com/dannyswat/pjeasy/internal/projects"
	"github.com/dannyswat/pjeasy/internal/repositories"
	"github.com/dannyswat/pjeasy/internal/status_changes"
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
func (s *ReleaseService) CreateRelease(projectID int, version, description string, targetDate *time.Time, createdBy int) (*Release, error) {
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

	if err := s.releaseRepo.Create(release); err != nil {
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
func (s *ReleaseService) UpdateReleaseStatus(releaseID int, status string, updatedBy int) (*Release, error) {
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

	if err := s.releaseRepo.UpdateStatus(releaseID, status); err != nil {
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

	confirmedIDsByType := map[string][]int{
		"feature": {},
		"issue":   {},
		"task":    {},
		"idea":    {},
		"sprint":  {},
	}
	for _, item := range confirmedItems {
		confirmedIDsByType[item.ItemType] = append(confirmedIDsByType[item.ItemType], item.ID)
	}

	db := s.releaseRepo.uow.GetDB()

	unlinkByType := func(table string, itemType string) error {
		query := db.Table(table).Where("release_id = ?", releaseID)
		confirmedIDs := confirmedIDsByType[itemType]
		if len(confirmedIDs) > 0 {
			query = query.Where("id NOT IN ?", confirmedIDs)
		}
		return query.Update("release_id", nil).Error
	}

	if err := unlinkByType("features", "feature"); err != nil {
		return nil, err
	}
	if err := unlinkByType("issues", "issue"); err != nil {
		return nil, err
	}
	if err := unlinkByType("tasks", "task"); err != nil {
		return nil, err
	}
	if err := unlinkByType("ideas", "idea"); err != nil {
		return nil, err
	}
	if err := unlinkByType("sprints", "sprint"); err != nil {
		return nil, err
	}

	// Update release status to Completed
	if err := s.releaseRepo.UpdateStatus(releaseID, ReleaseStatusCompleted); err != nil {
		return nil, err
	}

	if err := s.statusRepo.LogChange(release.ProjectID, status_changes.ItemTypeRelease, release.ID, oldStatus, ReleaseStatusCompleted, &updatedBy); err != nil {
		return nil, err
	}

	return s.releaseRepo.GetByID(releaseID)
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
	ID       int    `json:"id"`
	RefNum   string `json:"refNum"`
	Title    string `json:"title"`
	Status   string `json:"status"`
	ItemType string `json:"itemType"` // "feature", "issue", "task", "idea", "sprint"
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
	db.Table("features").Select("id, ref_num, title, status, 'feature' as item_type").
		Where("release_id = ?", releaseID).Scan(&featureItems)
	items = append(items, featureItems...)

	// Query issues
	var issueItems []ReleaseItem
	db.Table("issues").Select("id, ref_num, title, status, 'issue' as item_type").
		Where("release_id = ?", releaseID).Scan(&issueItems)
	items = append(items, issueItems...)

	// Query tasks
	var taskItems []ReleaseItem
	db.Table("tasks").Select("id, '' as ref_num, title, status, 'task' as item_type").
		Where("release_id = ?", releaseID).Scan(&taskItems)
	items = append(items, taskItems...)

	// Query ideas
	var ideaItems []ReleaseItem
	db.Table("ideas").Select("id, ref_num, title, status, 'idea' as item_type").
		Where("release_id = ?", releaseID).Scan(&ideaItems)
	items = append(items, ideaItems...)

	// Query sprints
	var sprintItems []ReleaseItem
	db.Table("sprints").Select("id, '' as ref_num, name as title, status, 'sprint' as item_type").
		Where("release_id = ?", releaseID).Scan(&sprintItems)
	items = append(items, sprintItems...)

	return items, nil
}
