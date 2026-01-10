package apis

import (
	"time"

	"github.com/dannyswat/pjeasy/internal/user_sessions"
	"github.com/dannyswat/pjeasy/internal/users"
)

func (s *APIServer) SetupUserService() {

	// Initialize repositories
	userRepo := users.NewUserRepository(s.globalUOW)
	credRepo := users.NewUserCredentialRepository(s.globalUOW)
	sessionRepo := user_sessions.NewUserSessionRepository(s.gorm)

	// Initialize credential provider
	passwordProvider := &users.PasswordCredential{}

	// Initialize token service
	// TODO: Move these to config
	jwtSecret := "your-secret-key-change-this-in-production"
	accessTokenDuration := 15 * time.Minute
	refreshTokenDuration := 30 * 24 * time.Hour
	s.tokenService = user_sessions.NewTokenService(jwtSecret, accessTokenDuration, refreshTokenDuration)

	// Initialize services
	s.userService = users.NewUserService(s.uowFactory, userRepo, credRepo, passwordProvider)
	s.sessionService = user_sessions.NewSessionService(s.userService, sessionRepo, s.tokenService)
}
