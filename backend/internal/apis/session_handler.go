package apis

import (
	"net/http"
	"strings"
	"time"

	"github.com/dannyswat/pjeasy/internal/projects"
	"github.com/dannyswat/pjeasy/internal/user_sessions"
	"github.com/dannyswat/pjeasy/internal/users"
	"github.com/labstack/echo/v4"
)

type authCookieOptions struct {
	secure   bool
	sameSite http.SameSite
}

type SessionHandler struct {
	userService    *users.UserService
	sessionService *user_sessions.SessionService
	projectService *projects.ProjectService
}

func NewSessionHandler(userService *users.UserService, sessionService *user_sessions.SessionService, projectService *projects.ProjectService) *SessionHandler {
	return &SessionHandler{
		userService:    userService,
		sessionService: sessionService,
		projectService: projectService,
	}
}

type LoginRequest struct {
	LoginID         string `json:"loginId" validate:"required"`
	Password        string `json:"password" validate:"required"`
	InvitationToken string `json:"invitationToken"`
	UseCookie       bool   `json:"useCookie"`
}

type LoginResponse struct {
	User         UserResponse `json:"user"`
	SessionID    string       `json:"sessionId,omitempty"`
	AccessToken  string       `json:"accessToken,omitempty"`
	RefreshToken string       `json:"refreshToken,omitempty"`
}

type RefreshTokenRequest struct {
	SessionID    string `json:"sessionId" validate:"required"`
	RefreshToken string `json:"refreshToken" validate:"required"`
	UseCookie    bool   `json:"useCookie"`
}

type RevokeSessionRequest struct {
	SessionID    string `json:"sessionId" validate:"required"`
	RefreshToken string `json:"refreshToken" validate:"required"`
}

func (h *SessionHandler) Login(c echo.Context) error {
	req := new(LoginRequest)
	if err := c.Bind(req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid request payload")
	}

	if err := c.Validate(req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}

	if req.InvitationToken != "" {
		if _, err := h.projectService.ResolveInvitation(req.InvitationToken); err != nil {
			return echo.NewHTTPError(http.StatusBadRequest, err.Error())
		}
	}

	// Get user agent and IP address
	userAgent := c.Request().UserAgent()
	ipAddress := c.RealIP()

	// Login and create session
	result, err := h.sessionService.Login(req.LoginID, req.Password, userAgent, ipAddress)
	if err != nil {
		return echo.NewHTTPError(http.StatusUnauthorized, "Invalid credentials")
	}

	if req.InvitationToken != "" {
		if _, err := h.projectService.AcceptInvitation(req.InvitationToken, result.User.ID); err != nil {
			_ = h.sessionService.RevokeSession(result.SessionID.String(), result.RefreshToken)
			return echo.NewHTTPError(http.StatusBadRequest, err.Error())
		}
	}

	response := &LoginResponse{
		User: UserResponse{
			ID:              result.User.ID,
			LoginID:         result.User.LoginID,
			Name:            result.User.Name,
			ProfileImageURL: result.User.ProfileImageURL,
		},
		SessionID:    result.SessionID.String(),
		AccessToken:  result.AccessToken,
		RefreshToken: result.RefreshToken,
	}

	if req.UseCookie {
		// Set cookies in addition to the JSON payload so existing token-based
		// clients continue to work.
		h.setAuthCookies(c, result.SessionID.String(), result.AccessToken, result.RefreshToken)
	}

	return c.JSON(http.StatusOK, response)
}

func (h *SessionHandler) RefreshToken(c echo.Context) error {
	req := new(RefreshTokenRequest)
	if err := c.Bind(req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid request payload")
	}

	// If cookie mode is enabled and the caller omitted one of the values,
	// backfill from cookies.
	if req.UseCookie && (req.SessionID == "" || req.RefreshToken == "") {
		sessionCookie, err := c.Cookie("session_id")
		if err == nil && req.SessionID == "" {
			req.SessionID = sessionCookie.Value
		}
		refreshCookie, err := c.Cookie("refresh_token")
		if err == nil && req.RefreshToken == "" {
			req.RefreshToken = refreshCookie.Value
		}
	}

	if err := c.Validate(req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}

	result, err := h.sessionService.RefreshToken(req.SessionID, req.RefreshToken)
	if err != nil {
		return echo.NewHTTPError(http.StatusUnauthorized, err.Error())
	}

	response := &LoginResponse{
		User: UserResponse{
			ID:              result.User.ID,
			LoginID:         result.User.LoginID,
			Name:            result.User.Name,
			ProfileImageURL: result.User.ProfileImageURL,
		},
		SessionID:    result.SessionID.String(),
		AccessToken:  result.AccessToken,
		RefreshToken: result.RefreshToken,
	}

	if req.UseCookie {
		// Update cookies in addition to the JSON payload so existing token-based
		// clients continue to work.
		h.setAuthCookies(c, result.SessionID.String(), result.AccessToken, result.RefreshToken)
	}

	return c.JSON(http.StatusOK, response)
}

func (h *SessionHandler) RevokeSession(c echo.Context) error {
	req := new(RevokeSessionRequest)

	// Try to get from cookies first
	sessionCookie, sessionErr := c.Cookie("session_id")
	refreshCookie, refreshErr := c.Cookie("refresh_token")

	if sessionErr == nil && refreshErr == nil {
		req.SessionID = sessionCookie.Value
		req.RefreshToken = refreshCookie.Value
	} else {
		// If not in cookies, try body
		if err := c.Bind(req); err != nil {
			return echo.NewHTTPError(http.StatusBadRequest, "Invalid request payload")
		}
	}

	if err := c.Validate(req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}

	err := h.sessionService.RevokeSession(req.SessionID, req.RefreshToken)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "Failed to revoke session")
	}

	// Clear cookies if they exist
	h.clearAuthCookies(c)

	return c.JSON(http.StatusOK, map[string]string{"message": "Session revoked successfully"})
}

func (h *SessionHandler) RevokeAllSessions(c echo.Context) error {
	// TODO: Get userID from authenticated context
	// For now, we'll expect it in the request
	userID, err := GetUserIDFromContext(c)
	if err != nil {
		return err
	}

	err = h.sessionService.RevokeAllUserSessions(userID)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "Failed to revoke sessions")
	}

	// Clear cookies if they exist
	h.clearAuthCookies(c)

	return c.JSON(http.StatusOK, map[string]string{"message": "All sessions revoked successfully"})
}

func resolveAuthCookieOptions(c echo.Context) authCookieOptions {
	request := c.Request()
	secure := request.TLS != nil
	if !secure {
		forwardedProto := request.Header.Get(echo.HeaderXForwardedProto)
		secure = strings.EqualFold(forwardedProto, "https")
	}

	return authCookieOptions{
		secure:   secure,
		sameSite: http.SameSiteStrictMode,
	}
}

func (h *SessionHandler) setAuthCookies(c echo.Context, sessionID, accessToken, refreshToken string) {
	options := resolveAuthCookieOptions(c)

	// Session ID cookie (7 days)
	c.SetCookie(&http.Cookie{
		Name:     "session_id",
		Value:    sessionID,
		Path:     "/",
		HttpOnly: true,
		Secure:   options.secure,
		SameSite: options.sameSite,
		MaxAge:   7 * 24 * 60 * 60, // 7 days
	})

	// Access token cookie (15 minutes)
	c.SetCookie(&http.Cookie{
		Name:     "access_token",
		Value:    accessToken,
		Path:     "/",
		HttpOnly: true,
		Secure:   options.secure,
		SameSite: options.sameSite,
		MaxAge:   15 * 60, // 15 minutes
	})

	// Refresh token cookie (7 days)
	c.SetCookie(&http.Cookie{
		Name:     "refresh_token",
		Value:    refreshToken,
		Path:     "/",
		HttpOnly: true,
		Secure:   options.secure,
		SameSite: options.sameSite,
		MaxAge:   7 * 24 * 60 * 60, // 7 days
	})
}

func (h *SessionHandler) clearAuthCookies(c echo.Context) {
	options := resolveAuthCookieOptions(c)

	// Clear all auth cookies by setting them with negative MaxAge
	cookies := []string{"session_id", "access_token", "refresh_token"}
	for _, name := range cookies {
		c.SetCookie(&http.Cookie{
			Name:     name,
			Value:    "",
			Path:     "/",
			HttpOnly: true,
			Secure:   options.secure,
			SameSite: options.sameSite,
			MaxAge:   -1,
			Expires:  time.Unix(0, 0),
		})
	}
}

func (h *SessionHandler) RegisterRoutes(e *echo.Echo) {
	e.POST("/api/auth/login", h.Login)
	e.POST("/api/auth/refresh-token", h.RefreshToken)
	e.POST("/api/auth/revoke-session", h.RevokeSession)
	e.POST("/api/auth/revoke-all-sessions", h.RevokeAllSessions)
}
