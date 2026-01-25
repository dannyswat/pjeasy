package wiki_pages

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"regexp"
	"strconv"
	"strings"
	"time"

	"github.com/dannyswat/pjeasy/internal/features"
	"github.com/dannyswat/pjeasy/internal/issues"
	"github.com/dannyswat/pjeasy/internal/projects"
	"github.com/dannyswat/pjeasy/internal/repositories"
	"github.com/dannyswat/vchtml"
)

type WikiPageService struct {
	pageRepo    *WikiPageRepository
	changeRepo  *WikiPageChangeRepository
	memberRepo  *projects.ProjectMemberRepository
	projectRepo *projects.ProjectRepository
	featureRepo *features.FeatureRepository
	issueRepo   *issues.IssueRepository
	uowFactory  *repositories.UnitOfWorkFactory
}

func NewWikiPageService(
	pageRepo *WikiPageRepository,
	changeRepo *WikiPageChangeRepository,
	memberRepo *projects.ProjectMemberRepository,
	projectRepo *projects.ProjectRepository,
	featureRepo *features.FeatureRepository,
	issueRepo *issues.IssueRepository,
	uowFactory *repositories.UnitOfWorkFactory,
) *WikiPageService {
	return &WikiPageService{
		pageRepo:    pageRepo,
		changeRepo:  changeRepo,
		memberRepo:  memberRepo,
		projectRepo: projectRepo,
		featureRepo: featureRepo,
		issueRepo:   issueRepo,
		uowFactory:  uowFactory,
	}
}

// generateSlug creates a URL-friendly slug from a title
func generateSlug(title string) string {
	// Convert to lowercase
	slug := strings.ToLower(title)
	// Replace spaces with hyphens
	slug = strings.ReplaceAll(slug, " ", "-")
	// Remove special characters
	reg := regexp.MustCompile(`[^a-z0-9\-]`)
	slug = reg.ReplaceAllString(slug, "")
	// Remove multiple consecutive hyphens
	reg = regexp.MustCompile(`-+`)
	slug = reg.ReplaceAllString(slug, "-")
	// Trim hyphens from start and end
	slug = strings.Trim(slug, "-")
	return slug
}

// computeHash computes SHA256 hash of content
func computeHash(content string) string {
	hash := sha256.Sum256([]byte(content))
	return hex.EncodeToString(hash[:])
}

// CreateWikiPage creates a new wiki page
func (s *WikiPageService) CreateWikiPage(projectID int, title, content string, parentID *int, sortOrder int, createdBy int) (*WikiPage, error) {
	// Validate project exists
	project, err := s.projectRepo.GetByID(projectID)
	if err != nil {
		return nil, err
	}
	if project == nil {
		return nil, errors.New("project not found")
	}

	// Check if user is a member of the project
	isMember, err := s.memberRepo.IsUserMember(projectID, createdBy)
	if err != nil {
		return nil, err
	}
	if !isMember {
		return nil, errors.New("user is not a member of this project")
	}

	// Generate slug from title
	slug := generateSlug(title)

	// Check if slug already exists
	exists, err := s.pageRepo.CheckSlugExists(projectID, slug, 0)
	if err != nil {
		return nil, err
	}
	if exists {
		// Append timestamp to make slug unique
		slug = slug + "-" + time.Now().Format("20060102150405")
	}

	// Validate parent if provided
	if parentID != nil {
		parent, err := s.pageRepo.GetByID(*parentID)
		if err != nil {
			return nil, err
		}
		if parent == nil {
			return nil, errors.New("parent wiki page not found")
		}
		if parent.ProjectID != projectID {
			return nil, errors.New("parent wiki page belongs to a different project")
		}
	}

	contentHash := computeHash(content)
	now := time.Now()

	page := &WikiPage{
		ProjectID:   projectID,
		Slug:        slug,
		Title:       title,
		Content:     content,
		ContentHash: contentHash,
		Version:     1,
		Status:      WikiPageStatusDraft,
		ParentID:    parentID,
		SortOrder:   sortOrder,
		CreatedBy:   createdBy,
		UpdatedBy:   createdBy,
		CreatedAt:   now,
		UpdatedAt:   now,
	}

	if err := s.pageRepo.Create(page); err != nil {
		return nil, err
	}

	return page, nil
}

// UpdateWikiPage updates a wiki page's metadata (not content)
func (s *WikiPageService) UpdateWikiPage(pageID int, title string, parentID *int, sortOrder int, updatedBy int) (*WikiPage, error) {
	page, err := s.pageRepo.GetByID(pageID)
	if err != nil {
		return nil, err
	}
	if page == nil {
		return nil, errors.New("wiki page not found")
	}

	// Check if user is a member of the project
	isMember, err := s.memberRepo.IsUserMember(page.ProjectID, updatedBy)
	if err != nil {
		return nil, err
	}
	if !isMember {
		return nil, errors.New("user is not a member of this project")
	}

	// Validate parent if provided
	if parentID != nil {
		if *parentID == pageID {
			return nil, errors.New("wiki page cannot be its own parent")
		}
		parent, err := s.pageRepo.GetByID(*parentID)
		if err != nil {
			return nil, err
		}
		if parent == nil {
			return nil, errors.New("parent wiki page not found")
		}
		if parent.ProjectID != page.ProjectID {
			return nil, errors.New("parent wiki page belongs to a different project")
		}
	}

	// Update slug if title changed
	if title != page.Title {
		slug := generateSlug(title)
		exists, err := s.pageRepo.CheckSlugExists(page.ProjectID, slug, pageID)
		if err != nil {
			return nil, err
		}
		if exists {
			slug = slug + "-" + time.Now().Format("20060102150405")
		}
		page.Slug = slug
		page.Title = title
	}

	page.ParentID = parentID
	page.SortOrder = sortOrder
	page.UpdatedBy = updatedBy
	page.UpdatedAt = time.Now()

	if err := s.pageRepo.Update(page); err != nil {
		return nil, err
	}

	return page, nil
}

// UpdateWikiPageContent updates the wiki page content directly (bypassing change system)
func (s *WikiPageService) UpdateWikiPageContent(pageID int, content string, updatedBy int) (*WikiPage, error) {
	page, err := s.pageRepo.GetByID(pageID)
	if err != nil {
		return nil, err
	}
	if page == nil {
		return nil, errors.New("wiki page not found")
	}

	// Check if user is a member of the project
	isMember, err := s.memberRepo.IsUserMember(page.ProjectID, updatedBy)
	if err != nil {
		return nil, err
	}
	if !isMember {
		return nil, errors.New("user is not a member of this project")
	}

	contentHash := computeHash(content)
	page.Content = content
	page.ContentHash = contentHash
	page.Version = page.Version + 1
	page.UpdatedBy = updatedBy
	page.UpdatedAt = time.Now()

	if err := s.pageRepo.Update(page); err != nil {
		return nil, err
	}

	return page, nil
}

// UpdateWikiPageStatus updates the wiki page status
func (s *WikiPageService) UpdateWikiPageStatus(pageID int, status string, updatedBy int) (*WikiPage, error) {
	page, err := s.pageRepo.GetByID(pageID)
	if err != nil {
		return nil, err
	}
	if page == nil {
		return nil, errors.New("wiki page not found")
	}

	// Check if user is a member of the project
	isMember, err := s.memberRepo.IsUserMember(page.ProjectID, updatedBy)
	if err != nil {
		return nil, err
	}
	if !isMember {
		return nil, errors.New("user is not a member of this project")
	}

	// Validate status
	if !IsValidWikiPageStatus(status) {
		return nil, errors.New("invalid status")
	}

	page.Status = status
	page.UpdatedBy = updatedBy
	page.UpdatedAt = time.Now()

	if err := s.pageRepo.Update(page); err != nil {
		return nil, err
	}

	return page, nil
}

// DeleteWikiPage deletes a wiki page
func (s *WikiPageService) DeleteWikiPage(pageID int, userID int) error {
	page, err := s.pageRepo.GetByID(pageID)
	if err != nil {
		return err
	}
	if page == nil {
		return errors.New("wiki page not found")
	}

	// Check if user is a member of the project
	isMember, err := s.memberRepo.IsUserMember(page.ProjectID, userID)
	if err != nil {
		return err
	}
	if !isMember {
		return errors.New("user is not a member of this project")
	}

	// Check if page has children
	children, err := s.pageRepo.GetChildren(pageID)
	if err != nil {
		return err
	}
	if len(children) > 0 {
		return errors.New("cannot delete wiki page with child pages")
	}

	return s.pageRepo.Delete(pageID)
}

// GetWikiPage returns a wiki page by ID
func (s *WikiPageService) GetWikiPage(pageID int, userID int) (*WikiPage, error) {
	page, err := s.pageRepo.GetByID(pageID)
	if err != nil {
		return nil, err
	}
	if page == nil {
		return nil, nil
	}

	// Check if user is a member of the project
	isMember, err := s.memberRepo.IsUserMember(page.ProjectID, userID)
	if err != nil {
		return nil, err
	}
	if !isMember {
		return nil, errors.New("user is not a member of this project")
	}

	return page, nil
}

// GetWikiPageBySlug returns a wiki page by project and slug
func (s *WikiPageService) GetWikiPageBySlug(projectID int, slug string, userID int) (*WikiPage, error) {
	// Check if user is a member of the project
	isMember, err := s.memberRepo.IsUserMember(projectID, userID)
	if err != nil {
		return nil, err
	}
	if !isMember {
		return nil, errors.New("user is not a member of this project")
	}

	return s.pageRepo.GetBySlug(projectID, slug)
}

// ListWikiPages returns wiki pages for a project with pagination
func (s *WikiPageService) ListWikiPages(projectID int, page, pageSize int, status string, userID int) ([]WikiPage, int64, error) {
	// Check if user is a member of the project
	isMember, err := s.memberRepo.IsUserMember(projectID, userID)
	if err != nil {
		return nil, 0, err
	}
	if !isMember {
		return nil, 0, errors.New("user is not a member of this project")
	}

	offset := (page - 1) * pageSize

	if status != "" {
		return s.pageRepo.GetByProjectIDAndStatus(projectID, status, offset, pageSize)
	}
	return s.pageRepo.GetByProjectID(projectID, offset, pageSize)
}

// GetWikiPageTree returns the hierarchical tree of wiki pages
func (s *WikiPageService) GetWikiPageTree(projectID int, userID int) ([]WikiPage, error) {
	// Check if user is a member of the project
	isMember, err := s.memberRepo.IsUserMember(projectID, userID)
	if err != nil {
		return nil, err
	}
	if !isMember {
		return nil, errors.New("user is not a member of this project")
	}

	return s.pageRepo.GetAllByProjectID(projectID)
}

// CreateWikiPageChange creates a change for a wiki page linked to a feature/issue
func (s *WikiPageService) CreateWikiPageChange(wikiPageID int, itemType string, itemID int, newContent string, createdBy int) (*WikiPageChange, error) {
	// Validate item type
	if !IsValidItemType(itemType) {
		return nil, errors.New("invalid item type")
	}

	// Get wiki page
	page, err := s.pageRepo.GetByID(wikiPageID)
	if err != nil {
		return nil, err
	}
	if page == nil {
		return nil, errors.New("wiki page not found")
	}

	// Check if user is a member of the project
	isMember, err := s.memberRepo.IsUserMember(page.ProjectID, createdBy)
	if err != nil {
		return nil, err
	}
	if !isMember {
		return nil, errors.New("user is not a member of this project")
	}

	// Validate the feature/issue exists and belongs to the project
	if itemType == WikiPageItemTypeFeature {
		feature, err := s.featureRepo.GetByID(itemID)
		if err != nil {
			return nil, err
		}
		if feature == nil {
			return nil, errors.New("feature not found")
		}
		if feature.ProjectID != page.ProjectID {
			return nil, errors.New("feature belongs to a different project")
		}
	} else if itemType == WikiPageItemTypeIssue {
		issue, err := s.issueRepo.GetByID(itemID)
		if err != nil {
			return nil, err
		}
		if issue == nil {
			return nil, errors.New("issue not found")
		}
		if issue.ProjectID != page.ProjectID {
			return nil, errors.New("issue belongs to a different project")
		}
	}

	// Compute delta using vchtml
	delta, err := vchtml.Diff(page.Content, newContent, strconv.Itoa(createdBy))
	if err != nil {
		return nil, errors.New("failed to compute diff: " + err.Error())
	}

	deltaJSON, err := json.Marshal(delta)
	if err != nil {
		return nil, errors.New("failed to serialize delta: " + err.Error())
	}

	snapshotHash := computeHash(newContent)
	now := time.Now()

	change := &WikiPageChange{
		WikiPageID:   wikiPageID,
		ProjectID:    page.ProjectID,
		ItemType:     itemType,
		ItemID:       itemID,
		BaseHash:     page.ContentHash,
		Delta:        string(deltaJSON),
		Snapshot:     newContent,
		SnapshotHash: snapshotHash,
		ChangeType:   WikiPageChangeTypeUpdate,
		Status:       WikiPageChangeStatusPending,
		CreatedBy:    createdBy,
		CreatedAt:    now,
		UpdatedAt:    now,
	}

	if err := s.changeRepo.Create(change); err != nil {
		return nil, err
	}

	return change, nil
}

// GetWikiPageChange returns a wiki page change by ID
func (s *WikiPageService) GetWikiPageChange(changeID int, userID int) (*WikiPageChange, error) {
	change, err := s.changeRepo.GetByID(changeID)
	if err != nil {
		return nil, err
	}
	if change == nil {
		return nil, nil
	}

	// Check if user is a member of the project
	isMember, err := s.memberRepo.IsUserMember(change.ProjectID, userID)
	if err != nil {
		return nil, err
	}
	if !isMember {
		return nil, errors.New("user is not a member of this project")
	}

	return change, nil
}

// ListWikiPageChanges returns changes for a wiki page with pagination
func (s *WikiPageService) ListWikiPageChanges(wikiPageID int, page, pageSize int, userID int) ([]WikiPageChange, int64, error) {
	wikiPage, err := s.pageRepo.GetByID(wikiPageID)
	if err != nil {
		return nil, 0, err
	}
	if wikiPage == nil {
		return nil, 0, errors.New("wiki page not found")
	}

	// Check if user is a member of the project
	isMember, err := s.memberRepo.IsUserMember(wikiPage.ProjectID, userID)
	if err != nil {
		return nil, 0, err
	}
	if !isMember {
		return nil, 0, errors.New("user is not a member of this project")
	}

	offset := (page - 1) * pageSize
	return s.changeRepo.GetByWikiPageID(wikiPageID, offset, pageSize)
}

// GetChangesByItem returns changes for a specific feature/issue
func (s *WikiPageService) GetChangesByItem(itemType string, itemID int, userID int) ([]WikiPageChange, error) {
	if !IsValidItemType(itemType) {
		return nil, errors.New("invalid item type")
	}

	// Get any change to verify project membership
	changes, err := s.changeRepo.GetByItem(itemType, itemID)
	if err != nil {
		return nil, err
	}
	if len(changes) == 0 {
		return changes, nil
	}

	// Check if user is a member of the project
	isMember, err := s.memberRepo.IsUserMember(changes[0].ProjectID, userID)
	if err != nil {
		return nil, err
	}
	if !isMember {
		return nil, errors.New("user is not a member of this project")
	}

	return changes, nil
}

// MergeChangesOnCompletion merges all pending changes when a feature/issue is completed
func (s *WikiPageService) MergeChangesOnCompletion(itemType string, itemID int, userID int) error {
	if !IsValidItemType(itemType) {
		return errors.New("invalid item type")
	}

	// Get all pending changes for this item
	pendingChanges, err := s.changeRepo.GetPendingChangesByItem(itemType, itemID)
	if err != nil {
		return err
	}

	if len(pendingChanges) == 0 {
		return nil // No changes to merge
	}

	// Check if user is a member of the project
	isMember, err := s.memberRepo.IsUserMember(pendingChanges[0].ProjectID, userID)
	if err != nil {
		return err
	}
	if !isMember {
		return errors.New("user is not a member of this project")
	}

	uow := s.uowFactory.NewUnitOfWork()
	if err := uow.BeginTransaction(); err != nil {
		return err
	}
	defer uow.RollbackTransactionIfError()

	txPageRepo := NewWikiPageRepository(uow)
	txChangeRepo := NewWikiPageChangeRepository(uow)

	// Group changes by wiki page
	changesByPage := make(map[int][]WikiPageChange)
	for _, change := range pendingChanges {
		changesByPage[change.WikiPageID] = append(changesByPage[change.WikiPageID], change)
	}

	now := time.Now()

	// Process each wiki page
	for wikiPageID, pageChanges := range changesByPage {
		page, err := txPageRepo.GetByID(wikiPageID)
		if err != nil {
			uow.RollbackTransaction()
			return err
		}
		if page == nil {
			continue
		}

		currentContent := page.Content
		currentHash := page.ContentHash

		// Apply changes sequentially
		for _, change := range pageChanges {
			// Check if the base hash matches
			if change.BaseHash != currentHash {
				// Try to merge using vchtml
				var delta vchtml.Delta
				if err := json.Unmarshal([]byte(change.Delta), &delta); err != nil {
					// Mark as conflict if we can't parse delta
					change.Status = WikiPageChangeStatusConflict
					change.UpdatedAt = now
					if err := txChangeRepo.Update(&change); err != nil {
						uow.RollbackTransaction()
						return err
					}
					continue
				}

				// Try to apply the patch
				mergedContent, err := vchtml.Patch(currentContent, &delta)
				if err != nil {
					// Mark as conflict
					change.Status = WikiPageChangeStatusConflict
					change.UpdatedAt = now
					if err := txChangeRepo.Update(&change); err != nil {
						uow.RollbackTransaction()
						return err
					}
					continue
				}

				currentContent = mergedContent
			} else {
				// Base hash matches, use snapshot directly
				currentContent = change.Snapshot
			}

			currentHash = computeHash(currentContent)

			// Mark change as merged
			change.Status = WikiPageChangeStatusMerged
			change.MergedAt = &now
			change.UpdatedAt = now
			if err := txChangeRepo.Update(&change); err != nil {
				uow.RollbackTransaction()
				return err
			}
		}

		// Update wiki page with merged content
		page.Content = currentContent
		page.ContentHash = currentHash
		page.Version = page.Version + 1
		page.UpdatedBy = userID
		page.UpdatedAt = now
		if err := txPageRepo.Update(page); err != nil {
			uow.RollbackTransaction()
			return err
		}
	}

	return uow.CommitTransaction()
}

// ResolveConflict allows manual resolution of a conflicting change
func (s *WikiPageService) ResolveConflict(changeID int, resolvedContent string, userID int) (*WikiPageChange, error) {
	change, err := s.changeRepo.GetByID(changeID)
	if err != nil {
		return nil, err
	}
	if change == nil {
		return nil, errors.New("change not found")
	}

	// Check if user is a member of the project
	isMember, err := s.memberRepo.IsUserMember(change.ProjectID, userID)
	if err != nil {
		return nil, err
	}
	if !isMember {
		return nil, errors.New("user is not a member of this project")
	}

	if change.Status != WikiPageChangeStatusConflict {
		return nil, errors.New("change is not in conflict status")
	}

	// Update the snapshot with resolved content
	change.Snapshot = resolvedContent
	change.SnapshotHash = computeHash(resolvedContent)
	change.Status = WikiPageChangeStatusPending // Return to pending so it can be merged
	change.UpdatedAt = time.Now()

	// Recalculate delta from current wiki page content
	page, err := s.pageRepo.GetByID(change.WikiPageID)
	if err != nil {
		return nil, err
	}
	if page == nil {
		return nil, errors.New("wiki page not found")
	}

	delta, err := vchtml.Diff(page.Content, resolvedContent, strconv.Itoa(userID))
	if err != nil {
		return nil, errors.New("failed to compute diff: " + err.Error())
	}

	deltaJSON, err := json.Marshal(delta)
	if err != nil {
		return nil, errors.New("failed to serialize delta: " + err.Error())
	}

	change.Delta = string(deltaJSON)
	change.BaseHash = page.ContentHash

	if err := s.changeRepo.Update(change); err != nil {
		return nil, err
	}

	return change, nil
}

// RejectChange rejects a pending change
func (s *WikiPageService) RejectChange(changeID int, userID int) (*WikiPageChange, error) {
	change, err := s.changeRepo.GetByID(changeID)
	if err != nil {
		return nil, err
	}
	if change == nil {
		return nil, errors.New("change not found")
	}

	// Check if user is a member of the project
	isMember, err := s.memberRepo.IsUserMember(change.ProjectID, userID)
	if err != nil {
		return nil, err
	}
	if !isMember {
		return nil, errors.New("user is not a member of this project")
	}

	change.Status = WikiPageChangeStatusRejected
	change.UpdatedAt = time.Now()

	if err := s.changeRepo.Update(change); err != nil {
		return nil, err
	}

	return change, nil
}

// GetPendingChanges returns all pending changes for a wiki page
func (s *WikiPageService) GetPendingChanges(wikiPageID int, userID int) ([]WikiPageChange, error) {
	page, err := s.pageRepo.GetByID(wikiPageID)
	if err != nil {
		return nil, err
	}
	if page == nil {
		return nil, errors.New("wiki page not found")
	}

	// Check if user is a member of the project
	isMember, err := s.memberRepo.IsUserMember(page.ProjectID, userID)
	if err != nil {
		return nil, err
	}
	if !isMember {
		return nil, errors.New("user is not a member of this project")
	}

	return s.changeRepo.GetPendingChangesByWikiPageID(wikiPageID)
}

// PreviewMerge previews what the merged content would look like
func (s *WikiPageService) PreviewMerge(changeID int, userID int) (string, error) {
	change, err := s.changeRepo.GetByID(changeID)
	if err != nil {
		return "", err
	}
	if change == nil {
		return "", errors.New("change not found")
	}

	// Check if user is a member of the project
	isMember, err := s.memberRepo.IsUserMember(change.ProjectID, userID)
	if err != nil {
		return "", err
	}
	if !isMember {
		return "", errors.New("user is not a member of this project")
	}

	page, err := s.pageRepo.GetByID(change.WikiPageID)
	if err != nil {
		return "", err
	}
	if page == nil {
		return "", errors.New("wiki page not found")
	}

	// If base hash matches, just return snapshot
	if change.BaseHash == page.ContentHash {
		return change.Snapshot, nil
	}

	// Try to apply patch
	var delta vchtml.Delta
	if err := json.Unmarshal([]byte(change.Delta), &delta); err != nil {
		return "", errors.New("failed to parse delta: " + err.Error())
	}

	mergedContent, err := vchtml.Patch(page.Content, &delta)
	if err != nil {
		return "", errors.New("merge would result in conflict: " + err.Error())
	}

	return mergedContent, nil
}
