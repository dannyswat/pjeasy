package projects

import (
	"gorm.io/gorm"
)

type ProjectMemberRepository struct {
	db *gorm.DB
}

func NewProjectMemberRepository(db *gorm.DB) *ProjectMemberRepository {
	return &ProjectMemberRepository{db: db}
}

// Create adds a member to a project
func (r *ProjectMemberRepository) Create(member *ProjectMember) error {
	return r.db.Create(member).Error
}

// GetByProjectID returns all members of a project
func (r *ProjectMemberRepository) GetByProjectID(projectID int) ([]ProjectMember, error) {
	var members []ProjectMember
	err := r.db.Where("project_id = ?", projectID).
		Order("added_at ASC").
		Find(&members).Error
	return members, err
}

// GetByProjectAndUser finds a specific membership
func (r *ProjectMemberRepository) GetByProjectAndUser(projectID, userID int) (*ProjectMember, error) {
	var member ProjectMember
	err := r.db.Where("project_id = ? AND user_id = ?", projectID, userID).
		First(&member).Error
	if err == gorm.ErrRecordNotFound {
		return nil, nil
	}
	return &member, err
}

// Update updates a project member
func (r *ProjectMemberRepository) Update(member *ProjectMember) error {
	return r.db.Save(member).Error
}

// Delete removes a member from a project
func (r *ProjectMemberRepository) Delete(projectID, userID int) error {
	return r.db.Where("project_id = ? AND user_id = ?", projectID, userID).
		Delete(&ProjectMember{}).Error
}

// DeleteAllByProject removes all members from a project
func (r *ProjectMemberRepository) DeleteAllByProject(projectID int) error {
	return r.db.Where("project_id = ?", projectID).
		Delete(&ProjectMember{}).Error
}

// IsUserMember checks if a user is a member of a project
func (r *ProjectMemberRepository) IsUserMember(projectID, userID int) (bool, error) {
	var count int64
	err := r.db.Model(&ProjectMember{}).
		Where("project_id = ? AND user_id = ?", projectID, userID).
		Count(&count).Error
	return count > 0, err
}

// IsUserAdmin checks if a user is an admin of a project
func (r *ProjectMemberRepository) IsUserAdmin(projectID, userID int) (bool, error) {
	var count int64
	err := r.db.Model(&ProjectMember{}).
		Where("project_id = ? AND user_id = ? AND is_admin = ?", projectID, userID, true).
		Count(&count).Error
	return count > 0, err
}

// GetUserIDsByProject returns all user IDs in a project
func (r *ProjectMemberRepository) GetUserIDsByProject(projectID int) ([]int, error) {
	var userIDs []int
	err := r.db.Model(&ProjectMember{}).
		Where("project_id = ?", projectID).
		Pluck("user_id", &userIDs).Error
	return userIDs, err
}
