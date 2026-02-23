package apis

import (
	"github.com/dannyswat/pjeasy/internal/user_sessions"
	"github.com/dannyswat/pjeasy/internal/users"
)

func (s *APIServer) SetupUserService() {

	// Initialize repositories
	userRepo := users.NewUserRepository(s.globalUOW)
	credRepo := users.NewUserCredentialRepository(s.globalUOW)
	sessionRepo := user_sessions.NewUserSessionRepository(s.globalUOW)

	// Initialize credential provider
	passwordProvider := &users.PasswordCredential{}

	// Initialize token service from config
	s.tokenService = user_sessions.NewTokenService(
		s.config.Auth.JWTSecret,
		s.config.Auth.GetAccessTokenDuration(),
		s.config.Auth.GetRefreshTokenDuration(),
	)

	// Initialize services
	s.userService = users.NewUserService(s.uowFactory, userRepo, credRepo, passwordProvider)
	s.sessionService = user_sessions.NewSessionService(s.userService, sessionRepo, s.tokenService)
}
