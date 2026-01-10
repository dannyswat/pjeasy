package user_sessions

import (
	"errors"
	"time"

	"github.com/dannyswat/pjeasy/internal/users"
	"github.com/google/uuid"
)

type SessionService struct {
	userService  *users.UserService
	sessionRepo  *UserSessionRepository
	tokenService *TokenService
}

type LoginResult struct {
	SessionID    uuid.UUID
	User         *users.User
	AccessToken  string
	RefreshToken string
}

func NewSessionService(userService *users.UserService, sessionRepo *UserSessionRepository, tokenService *TokenService) *SessionService {
	return &SessionService{
		userService:  userService,
		sessionRepo:  sessionRepo,
		tokenService: tokenService,
	}
}

func (s *SessionService) Login(loginID, password, userAgent, ipAddress string) (*LoginResult, error) {
	// Authenticate user
	user, err := s.userService.AuthenticateWithPassword(loginID, password)
	if err != nil {
		return nil, err
	}

	// Generate access token
	accessToken, err := s.tokenService.GenerateAccessToken(user.ID, user.LoginID)
	if err != nil {
		return nil, err
	}

	// Generate refresh token
	refreshToken, err := s.tokenService.GenerateRefreshToken()
	if err != nil {
		return nil, err
	}

	// Hash the refresh token
	tokenHash := s.tokenService.HashRefreshToken(refreshToken)

	// Create session with UUID
	session := &UserSession{
		UserID:           user.ID,
		RefreshTokenHash: tokenHash,
		ExpiresAt:        time.Now().Add(s.tokenService.GetRefreshTokenDuration()),
		UserAgent:        userAgent,
		IPAddress:        ipAddress,
	}

	// Save session to get the UUID
	err = s.sessionRepo.Create(session)
	if err != nil {
		return nil, err
	}

	return &LoginResult{
		SessionID:    session.ID,
		User:         user,
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
	}, nil
}

func (s *SessionService) RefreshToken(sessionIDStr string, refreshToken string) (*LoginResult, error) {
	// Parse session ID
	sessionID, err := uuid.Parse(sessionIDStr)
	if err != nil {
		return nil, errors.New("invalid session ID")
	}

	// Get session by ID
	session, err := s.sessionRepo.GetByID(sessionID)
	if err != nil {
		return nil, err
	}

	if session == nil {
		return nil, errors.New("invalid session")
	}

	// Validate session status
	if !session.IsValid() {
		return nil, errors.New("session expired or revoked")
	}

	// Validate token hash matches
	if !s.tokenService.ValidateRefreshToken(refreshToken, session.RefreshTokenHash) {
		return nil, errors.New("invalid refresh token")
	}

	// Get user
	user, err := s.userService.GetUserByID(session.UserID)
	if err != nil {
		return nil, err
	}

	if user == nil {
		return nil, errors.New("user not found")
	}

	// Generate new access token
	accessToken, err := s.tokenService.GenerateAccessToken(user.ID, user.LoginID)
	if err != nil {
		return nil, err
	}

	// Update last refreshed time
	now := time.Now()
	session.LastRefreshedAt = &now
	err = s.sessionRepo.Update(session)
	if err != nil {
		return nil, err
	}

	// Return same session and refresh token
	return &LoginResult{
		SessionID:    session.ID,
		User:         user,
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
	}, nil
}

func (s *SessionService) RevokeSession(sessionIDStr string, refreshToken string) error {
	// Parse session ID
	sessionID, err := uuid.Parse(sessionIDStr)
	if err != nil {
		return errors.New("invalid session ID")
	}

	// Get session to validate token
	session, err := s.sessionRepo.GetByID(sessionID)
	if err != nil {
		return err
	}

	if session == nil {
		return errors.New("session not found")
	}

	// Validate token hash matches
	if !s.tokenService.ValidateRefreshToken(refreshToken, session.RefreshTokenHash) {
		return errors.New("invalid refresh token")
	}

	return s.sessionRepo.Revoke(sessionID)
}

func (s *SessionService) RevokeAllUserSessions(userID int) error {
	return s.sessionRepo.RevokeAllByUserID(userID)
}

func (s *SessionService) GetUserSessions(userID int) ([]*UserSession, error) {
	return s.sessionRepo.GetByUserID(userID)
}
