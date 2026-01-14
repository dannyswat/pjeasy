package projects

import (
	"errors"
	"time"

	"github.com/dannyswat/pjeasy/internal/users"
)

type ProjectService struct {
	projectRepo *ProjectRepository
	memberRepo  *ProjectMemberRepository
	userRepo    *users.UserRepository
}

func NewProjectService(projectRepo *ProjectRepository, memberRepo *ProjectMemberRepository, userRepo *users.UserRepository) *ProjectService {
	return &ProjectService{
		projectRepo: projectRepo,
		memberRepo:  memberRepo,
		userRepo:    userRepo,
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
func (s *ProjectService) AddMemberByLoginID(projectID int, loginID string, isAdmin bool, addedBy int) error {
	// Look up user by login ID
	user, err := s.userRepo.GetByLoginID(loginID)
	if err != nil {
		return err
	}
	if user == nil {
		return errors.New("user not found")
	}

	return s.AddMember(projectID, user.ID, isAdmin, addedBy)
}

func (s *ProjectService) AddMember(projectID, userID int, isAdmin bool, addedBy int) error {
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
		AddedAt:   time.Now(),
		AddedBy:   addedBy,
	}

	return s.memberRepo.Create(member)
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

	return s.memberRepo.Delete(projectID, userID)
}

// UpdateMemberRole updates a member's admin status
func (s *ProjectService) UpdateMemberRole(projectID, userID int, isAdmin bool, updatedBy int) error {
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
	return s.memberRepo.Update(member)
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
