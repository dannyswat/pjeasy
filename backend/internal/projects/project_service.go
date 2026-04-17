package projects

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"errors"
	"time"

	"github.com/dannyswat/pjeasy/internal/sequences"
	"github.com/dannyswat/pjeasy/internal/users"
)

type ProjectService struct {
	projectRepo    *ProjectRepository
	memberRepo     *ProjectMemberRepository
	invitationRepo *ProjectInvitationRepository
	memberCache    *ProjectMemberCache
	userRepo       *users.UserRepository
	sequenceRepo   *sequences.SequenceRepository
}

func NewProjectService(projectRepo *ProjectRepository, memberRepo *ProjectMemberRepository, invitationRepo *ProjectInvitationRepository, userRepo *users.UserRepository, sequenceRepo *sequences.SequenceRepository, memberCache *ProjectMemberCache) *ProjectService {
	return &ProjectService{
		projectRepo:    projectRepo,
		memberRepo:     memberRepo,
		invitationRepo: invitationRepo,
		memberCache:    memberCache,
		userRepo:       userRepo,
		sequenceRepo:   sequenceRepo,
	}
}

// ProjectWithMembers represents a project with its members
type ProjectWithMembers struct {
	Project Project              `json:"project"`
	Members []MemberWithUserInfo `json:"members"`
}

// MemberWithUserInfo represents a project member with user details
type MemberWithUserInfo struct {
	Member ProjectMember `json:"member"`
	User   *users.User   `json:"user"`
}

type ProjectInvitationDetails struct {
	Invitation *ProjectInvitation `json:"invitation"`
	Project    *Project           `json:"project"`
}

type ProjectInvitationListItem struct {
	Invitation *ProjectInvitation `json:"invitation"`
	Project    *Project           `json:"project"`
}

// CreateProject creates a new project and adds creator as admin
func (s *ProjectService) CreateProject(name, description string, createdBy int) (*Project, error) {
	// Validate creator exists
	creator, err := s.userRepo.GetByID(createdBy)
	if err != nil {
		return nil, err
	}
	if creator == nil {
		return nil, errors.New("creator user not found")
	}

	now := time.Now()
	project := &Project{
		Name:        name,
		Description: description,
		IsArchived:  false,
		CreatedBy:   createdBy,
		CreatedAt:   now,
		UpdatedAt:   now,
	}

	if err := s.projectRepo.Create(project); err != nil {
		return nil, err
	}

	// Add creator as admin member
	member := &ProjectMember{
		ProjectID: project.ID,
		UserID:    createdBy,
		IsAdmin:   true,
		AddedAt:   now,
		AddedBy:   createdBy,
	}

	if err := s.memberRepo.Create(member); err != nil {
		// Rollback project creation if member addition fails
		s.projectRepo.Delete(project.ID)
		return nil, err
	}

	// Invalidate cache for this project
	s.memberCache.InvalidateProject(project.ID)

	return project, nil
}

// UpdateProject updates a project's basic information
func (s *ProjectService) UpdateProject(projectID int, name, description string, updatedBy int) (*Project, error) {
	project, err := s.projectRepo.GetByID(projectID)
	if err != nil {
		return nil, err
	}
	if project == nil {
		return nil, errors.New("project not found")
	}

	// Check if user is project admin
	isAdmin, err := s.memberRepo.IsUserAdmin(projectID, updatedBy)
	if err != nil {
		return nil, err
	}
	if !isAdmin {
		return nil, errors.New("only project admins can update project")
	}

	project.Name = name
	project.Description = description
	project.UpdatedAt = time.Now()

	if err := s.projectRepo.Update(project); err != nil {
		return nil, err
	}

	return project, nil
}

// GetProject returns a project by ID
func (s *ProjectService) GetProject(projectID int) (*Project, error) {
	return s.projectRepo.GetByID(projectID)
}

// GetProjectWithMembers returns a project with all its members
func (s *ProjectService) GetProjectWithMembers(projectID int) (*ProjectWithMembers, error) {
	project, err := s.projectRepo.GetByID(projectID)
	if err != nil {
		return nil, err
	}
	if project == nil {
		return nil, errors.New("project not found")
	}

	members, err := s.memberRepo.GetByProjectID(projectID)
	if err != nil {
		return nil, err
	}

	membersWithInfo := make([]MemberWithUserInfo, 0, len(members))
	for _, member := range members {
		user, err := s.userRepo.GetByID(member.UserID)
		if err != nil {
			continue
		}
		membersWithInfo = append(membersWithInfo, MemberWithUserInfo{
			Member: member,
			User:   user,
		})
	}

	return &ProjectWithMembers{
		Project: *project,
		Members: membersWithInfo,
	}, nil
}

// GetAllProjects returns all projects with pagination
func (s *ProjectService) GetAllProjects(includeArchived bool, page, pageSize int) ([]Project, int64, error) {
	offset := (page - 1) * pageSize
	return s.projectRepo.GetAll(includeArchived, offset, pageSize)
}

// GetUserProjects returns all projects where user is a member
func (s *ProjectService) GetUserProjects(userID int, includeArchived bool, page, pageSize int) ([]Project, int64, error) {
	offset := (page - 1) * pageSize
	return s.projectRepo.GetByUserID(userID, includeArchived, offset, pageSize)
}

// AddMember adds a user to a project
// AddMemberByLoginID adds a member to a project using their login ID
func (s *ProjectService) AddMemberByLoginID(projectID int, loginID string, isAdmin bool, isUser bool, addedBy int) error {
	// Look up user by login ID
	user, err := s.userRepo.GetByLoginID(loginID)
	if err != nil {
		return err
	}
	if user == nil {
		return errors.New("user not found")
	}

	return s.AddMember(projectID, user.ID, isAdmin, isUser, addedBy)
}

func (s *ProjectService) AddMember(projectID, userID int, isAdmin bool, isUser bool, addedBy int) error {
	if isAdmin && isUser {
		return errors.New("member cannot be both project admin and project user")
	}

	// Check if project exists
	project, err := s.projectRepo.GetByID(projectID)
	if err != nil {
		return err
	}
	if project == nil {
		return errors.New("project not found")
	}

	// Check if user exists
	user, err := s.userRepo.GetByID(userID)
	if err != nil {
		return err
	}
	if user == nil {
		return errors.New("user not found")
	}

	// Check if adding user is project admin
	isAdderAdmin, err := s.memberRepo.IsUserAdmin(projectID, addedBy)
	if err != nil {
		return err
	}
	if !isAdderAdmin {
		return errors.New("only project admins can add members")
	}

	// Check if user is already a member
	existing, err := s.memberRepo.GetByProjectAndUser(projectID, userID)
	if err != nil {
		return err
	}
	if existing != nil {
		return errors.New("user is already a member")
	}

	member := &ProjectMember{
		ProjectID: projectID,
		UserID:    userID,
		IsAdmin:   isAdmin,
		IsUser:    isUser,
		AddedAt:   time.Now(),
		AddedBy:   addedBy,
	}

	if err := s.memberRepo.Create(member); err != nil {
		return err
	}

	// Invalidate cache for this project
	s.memberCache.InvalidateProject(projectID)
	return nil
}

// RemoveMember removes a user from a project
func (s *ProjectService) RemoveMember(projectID, userID int, removedBy int) error {
	// Check if removing user is project admin
	isAdmin, err := s.memberRepo.IsUserAdmin(projectID, removedBy)
	if err != nil {
		return err
	}
	if !isAdmin {
		return errors.New("only project admins can remove members")
	}

	// Check if member exists
	member, err := s.memberRepo.GetByProjectAndUser(projectID, userID)
	if err != nil {
		return err
	}
	if member == nil {
		return errors.New("user is not a member of this project")
	}

	// Don't allow removing the last admin
	members, err := s.memberRepo.GetByProjectID(projectID)
	if err != nil {
		return err
	}

	adminCount := 0
	for _, m := range members {
		if m.IsAdmin {
			adminCount++
		}
	}

	if member.IsAdmin && adminCount <= 1 {
		return errors.New("cannot remove the last admin from project")
	}

	if err := s.memberRepo.Delete(projectID, userID); err != nil {
		return err
	}

	// Invalidate cache for this project
	s.memberCache.InvalidateProject(projectID)
	return nil
}

// UpdateMemberRole updates a member's admin status
func (s *ProjectService) UpdateMemberRole(projectID, userID int, isAdmin bool, isUser bool, updatedBy int) error {
	if isAdmin && isUser {
		return errors.New("member cannot be both project admin and project user")
	}

	// Check if updating user is project admin
	isUpdaterAdmin, err := s.memberRepo.IsUserAdmin(projectID, updatedBy)
	if err != nil {
		return err
	}
	if !isUpdaterAdmin {
		return errors.New("only project admins can update member roles")
	}

	member, err := s.memberRepo.GetByProjectAndUser(projectID, userID)
	if err != nil {
		return err
	}
	if member == nil {
		return errors.New("user is not a member of this project")
	}

	// If demoting from admin, check we're not removing last admin
	if member.IsAdmin && !isAdmin {
		members, err := s.memberRepo.GetByProjectID(projectID)
		if err != nil {
			return err
		}

		adminCount := 0
		for _, m := range members {
			if m.IsAdmin {
				adminCount++
			}
		}

		if adminCount <= 1 {
			return errors.New("cannot remove the last admin from project")
		}
	}

	member.IsAdmin = isAdmin
	member.IsUser = isUser
	if err := s.memberRepo.Update(member); err != nil {
		return err
	}

	// Invalidate cache for this project
	s.memberCache.InvalidateProject(projectID)
	return nil
}

// ArchiveProject archives a project
func (s *ProjectService) ArchiveProject(projectID int, archivedBy int) error {
	// Check if user is project admin
	isAdmin, err := s.memberRepo.IsUserAdmin(projectID, archivedBy)
	if err != nil {
		return err
	}
	if !isAdmin {
		return errors.New("only project admins can archive project")
	}

	return s.projectRepo.Archive(projectID)
}

// UnarchiveProject unarchives a project
func (s *ProjectService) UnarchiveProject(projectID int, unarchivedBy int) error {
	// Check if user is project admin
	isAdmin, err := s.memberRepo.IsUserAdmin(projectID, unarchivedBy)
	if err != nil {
		return err
	}
	if !isAdmin {
		return errors.New("only project admins can unarchive project")
	}

	return s.projectRepo.Unarchive(projectID)
}

// IsUserProjectAdmin checks if a user is a project admin
func (s *ProjectService) IsUserProjectAdmin(projectID, userID int) (bool, error) {
	return s.memberRepo.IsUserAdmin(projectID, userID)
}

func (s *ProjectService) CreateInvitation(projectID int, isUser bool, expiresAt *time.Time, createdBy int) (*ProjectInvitation, string, error) {
	project, err := s.projectRepo.GetByID(projectID)
	if err != nil {
		return nil, "", err
	}
	if project == nil {
		return nil, "", errors.New("project not found")
	}
	if project.IsArchived {
		return nil, "", errors.New("cannot generate invitations for archived projects")
	}

	isAdmin, err := s.memberRepo.IsUserAdmin(projectID, createdBy)
	if err != nil {
		return nil, "", err
	}
	if !isAdmin {
		return nil, "", errors.New("only project admins can generate invitation links")
	}

	if expiresAt != nil && expiresAt.Before(time.Now()) {
		return nil, "", errors.New("invitation expiry must be in the future")
	}

	token, err := generateInvitationToken()
	if err != nil {
		return nil, "", err
	}

	invitation := &ProjectInvitation{
		ProjectID: projectID,
		Token:     token,
		TokenHash: hashInvitationToken(token),
		IsUser:    isUser,
		ExpiresAt: expiresAt,
		CreatedBy: createdBy,
		CreatedAt: time.Now(),
	}

	if err := s.invitationRepo.Create(invitation); err != nil {
		return nil, "", err
	}

	return invitation, token, nil
}

func (s *ProjectService) ResolveInvitation(token string) (*ProjectInvitationDetails, error) {
	return s.getActiveInvitationDetails(token)
}

func (s *ProjectService) ListInvitations(projectID int, requestedBy int) ([]ProjectInvitationListItem, error) {
	project, err := s.projectRepo.GetByID(projectID)
	if err != nil {
		return nil, err
	}
	if project == nil {
		return nil, errors.New("project not found")
	}

	isAdmin, err := s.memberRepo.IsUserAdmin(projectID, requestedBy)
	if err != nil {
		return nil, err
	}
	if !isAdmin {
		return nil, errors.New("only project admins can view invitation links")
	}

	invitations, err := s.invitationRepo.ListByProjectID(projectID)
	if err != nil {
		return nil, err
	}

	items := make([]ProjectInvitationListItem, 0, len(invitations))
	for index := range invitations {
		invitation := invitations[index]
		items = append(items, ProjectInvitationListItem{
			Invitation: &invitation,
			Project:    project,
		})
	}

	return items, nil
}

func (s *ProjectService) RevokeInvitation(projectID int, invitationID int, revokedBy int) error {
	project, err := s.projectRepo.GetByID(projectID)
	if err != nil {
		return err
	}
	if project == nil {
		return errors.New("project not found")
	}

	isAdmin, err := s.memberRepo.IsUserAdmin(projectID, revokedBy)
	if err != nil {
		return err
	}
	if !isAdmin {
		return errors.New("only project admins can revoke invitation links")
	}

	invitation, err := s.invitationRepo.GetByID(invitationID)
	if err != nil {
		return err
	}
	if invitation == nil || invitation.ProjectID != projectID {
		return errors.New("invitation not found")
	}
	if invitation.RevokedAt != nil {
		return nil
	}

	now := time.Now()
	invitation.RevokedAt = &now
	return s.invitationRepo.Update(invitation)
}

func (s *ProjectService) AcceptInvitation(token string, userID int) (*ProjectMember, error) {
	details, err := s.getActiveInvitationDetails(token)
	if err != nil {
		return nil, err
	}

	user, err := s.userRepo.GetByID(userID)
	if err != nil {
		return nil, err
	}
	if user == nil {
		return nil, errors.New("user not found")
	}

	member, err := s.memberRepo.GetByProjectAndUser(details.Project.ID, userID)
	if err != nil {
		return nil, err
	}

	if member == nil {
		member = &ProjectMember{
			ProjectID: details.Project.ID,
			UserID:    userID,
			IsAdmin:   false,
			IsUser:    details.Invitation.IsUser,
			AddedAt:   time.Now(),
			AddedBy:   details.Invitation.CreatedBy,
		}

		if err := s.memberRepo.Create(member); err != nil {
			return nil, err
		}

		s.memberCache.InvalidateProject(details.Project.ID)
		return member, nil
	}

	if !details.Invitation.IsUser && member.IsUser {
		member.IsUser = false
		if err := s.memberRepo.Update(member); err != nil {
			return nil, err
		}
		s.memberCache.InvalidateProject(details.Project.ID)
	}

	return member, nil
}

func (s *ProjectService) getActiveInvitationDetails(token string) (*ProjectInvitationDetails, error) {
	if token == "" {
		return nil, errors.New("invitation token is required")
	}

	invitation, err := s.invitationRepo.GetByTokenHash(hashInvitationToken(token))
	if err != nil {
		return nil, err
	}
	if invitation == nil {
		return nil, errors.New("invitation link not found")
	}
	if !invitation.IsActive(time.Now()) {
		return nil, errors.New("invitation link has expired")
	}

	project, err := s.projectRepo.GetByID(invitation.ProjectID)
	if err != nil {
		return nil, err
	}
	if project == nil {
		return nil, errors.New("project not found")
	}
	if project.IsArchived {
		return nil, errors.New("project is archived")
	}

	return &ProjectInvitationDetails{
		Invitation: invitation,
		Project:    project,
	}, nil
}

func generateInvitationToken() (string, error) {
	raw := make([]byte, 32)
	if _, err := rand.Read(raw); err != nil {
		return "", err
	}

	return base64.RawURLEncoding.EncodeToString(raw), nil
}

func hashInvitationToken(token string) string {
	sum := sha256.Sum256([]byte(token))
	return hex.EncodeToString(sum[:])
}
