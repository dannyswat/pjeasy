package users

import (
	"errors"
	"time"

	"github.com/dannyswat/pjeasy/internal/repositories"
)

type UserService struct {
	uowFactory       *repositories.UnitOfWorkFactory
	repo             *UserRepository
	credRepo         *UserCredentialRepository
	passwordProvider CredentialProvider
}

func NewUserService(uowFactory *repositories.UnitOfWorkFactory, repo *UserRepository, credRepo *UserCredentialRepository, passwordProvider CredentialProvider) *UserService {
	return &UserService{
		uowFactory:       uowFactory,
		repo:             repo,
		credRepo:         credRepo,
		passwordProvider: passwordProvider,
	}
}

func (s *UserService) RegisterWithPassword(loginID, name, password string) (*User, error) {
	// Check if user already exists
	existingUser, err := s.repo.GetByLoginID(loginID)
	if err != nil {
		return nil, err
	}
	if existingUser != nil {
		return nil, errors.New("user with this login ID already exists")
	}

	user := &User{
		LoginID:   loginID,
		Name:      name,
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}

	uow := s.uowFactory.NewUnitOfWork()
	userRepo := NewUserRepository(uow)
	credRepo := NewUserCredentialRepository(uow)

	uow.BeginTransaction()
	defer uow.RollbackTransactionIfError()
	err = userRepo.Create(user)
	if err != nil {
		return nil, err
	}

	hashedPassword, err := s.passwordProvider.GenerateSecretValue(password)
	if err != nil {
		return nil, err
	}

	// Create user credential
	credential := &UserCredential{
		UserID:             user.ID,
		Type:               s.passwordProvider.GetType(),
		SecretValue:        hashedPassword,
		LastSecretChangeAt: time.Now(),
	}

	err = credRepo.Create(credential)
	if err != nil {
		return nil, err
	}

	err = uow.CommitTransaction()
	if err != nil {
		return nil, err
	}

	return user, nil
}

func (s *UserService) AuthenticateWithPassword(loginID, password string) (*User, error) {
	// Find user by login ID
	user, err := s.repo.GetByLoginID(loginID)
	if err != nil {
		return nil, err
	}
	if user == nil {
		return nil, errors.New("invalid credentials")
	}

	// Get user credential
	credential, err := s.credRepo.GetByUserIDAndType(user.ID, s.passwordProvider.GetType())
	if err != nil {
		return nil, err
	}
	if credential == nil {
		return nil, errors.New("invalid credentials")
	}

	// Validate password
	valid, err := s.passwordProvider.Validate(password, credential.SecretValue)
	if err != nil {
		return nil, err
	}
	if !valid {
		return nil, errors.New("invalid credentials")
	}

	return user, nil
}
