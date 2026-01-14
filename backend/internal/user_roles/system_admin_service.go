package userroles

import (
	"errors"
	"time"

	"github.com/dannyswat/pjeasy/internal/users"
)

type SystemAdminService struct {
	adminRepo *SystemAdminRepository
	userRepo  *users.UserRepository
}

func NewSystemAdminService(adminRepo *SystemAdminRepository, userRepo *users.UserRepository) *SystemAdminService {
	return &SystemAdminService{
		adminRepo: adminRepo,
		userRepo:  userRepo,
	}
}

// AdminWithUser represents a system admin with user details
type AdminWithUser struct {
	Admin SystemAdmin `json:"admin"`
	User  *users.User `json:"user"`
}

// GetAllAdmins returns all system admins with their user details
func (s *SystemAdminService) GetAllAdmins() ([]AdminWithUser, error) {
	admins, err := s.adminRepo.GetAll()
	if err != nil {
		return nil, err
	}

	result := make([]AdminWithUser, 0, len(admins))
	for _, admin := range admins {
		user, err := s.userRepo.GetByID(admin.UserID)
		if err != nil {
			continue // Skip if user not found
		}
		result = append(result, AdminWithUser{
			Admin: admin,
			User:  user,
		})
	}

	return result, nil
}

// GetActiveAdmins returns all active system admins with their user details
func (s *SystemAdminService) GetActiveAdmins() ([]AdminWithUser, error) {
	admins, err := s.adminRepo.GetActive()
	if err != nil {
		return nil, err
	}

	result := make([]AdminWithUser, 0, len(admins))
	for _, admin := range admins {
		user, err := s.userRepo.GetByID(admin.UserID)
		if err != nil {
			continue // Skip if user not found
		}
		result = append(result, AdminWithUser{
			Admin: admin,
			User:  user,
		})
	}

	return result, nil
}

// AssignAdmin assigns system admin role to a user
func (s *SystemAdminService) AssignAdmin(userID int, expiredAfter *time.Time) (*SystemAdmin, error) {
	// Check if user exists
	user, err := s.userRepo.GetByID(userID)
	if err != nil {
		return nil, err
	}
	if user == nil {
		return nil, errors.New("user not found")
	}

	// Check if user is already an admin
	existingAdmin, err := s.adminRepo.GetByUserID(userID)
	if err != nil {
		return nil, err
	}
	if existingAdmin != nil {
		return nil, errors.New("user is already a system admin")
	}

	admin := &SystemAdmin{
		UserID:    userID,
		CreatedAt: time.Now(),
	}

	if expiredAfter != nil {
		admin.ExpiredAfter = *expiredAfter
	}

	err = s.adminRepo.Create(admin)
	if err != nil {
		return nil, err
	}

	return admin, nil
}

// AssignAdminByLoginID assigns system admin role to a user by their login ID
func (s *SystemAdminService) AssignAdminByLoginID(loginID string, expiredAfter *time.Time) (*SystemAdmin, error) {
	// Find user by login ID
	user, err := s.userRepo.GetByLoginID(loginID)
	if err != nil {
		return nil, err
	}
	if user == nil {
		return nil, errors.New("user not found")
	}

	// Use the existing AssignAdmin method
	return s.AssignAdmin(user.ID, expiredAfter)
}

// UnassignAdmin removes system admin role from a user
func (s *SystemAdminService) UnassignAdmin(userID int) error {
	// Check if user is an admin
	existingAdmin, err := s.adminRepo.GetByUserID(userID)
	if err != nil {
		return err
	}
	if existingAdmin == nil {
		return errors.New("user is not a system admin")
	}

	return s.adminRepo.DeleteByUserID(userID)
}

// IsUserAdmin checks if a user has active admin privileges
func (s *SystemAdminService) IsUserAdmin(userID int) (bool, error) {
	return s.adminRepo.IsUserAdmin(userID)
}

// UpdateExpiration updates the expiration time for an admin
func (s *SystemAdminService) UpdateExpiration(userID int, expiredAfter *time.Time) error {
	admin, err := s.adminRepo.GetByUserID(userID)
	if err != nil {
		return err
	}
	if admin == nil {
		return errors.New("user is not a system admin")
	}

	if expiredAfter != nil {
		admin.ExpiredAfter = *expiredAfter
	} else {
		admin.ExpiredAfter = time.Time{} // Zero time for no expiration
	}

	return s.adminRepo.Update(admin)
}
