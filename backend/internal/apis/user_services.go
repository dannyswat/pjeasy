package apis

import "github.com/dannyswat/pjeasy/internal/users"

func (s *APIServer) SetupUserService() {

	// Initialize repositories
	userRepo := users.NewUserRepository(s.globalUOW)
	credRepo := users.NewUserCredentialRepository(s.globalUOW)

	// Initialize credential provider
	passwordProvider := &users.PasswordCredential{}

	// Initialize services
	s.userService = users.NewUserService(s.uowFactory, userRepo, credRepo, passwordProvider)
}
