package apis

import (
	"net/http"
	"time"

	"github.com/dannyswat/pjeasy/internal/user_sessions"
	"github.com/dannyswat/pjeasy/internal/users"
	"github.com/labstack/echo/v4"
)

type SessionHandler struct {
	userService    *users.UserService
	sessionService *user_sessions.SessionService
}

func NewSessionHandler(userService *users.UserService, sessionService *user_sessions.SessionService) *SessionHandler {
	return &SessionHandler{
		userService:    userService,
		sessionService: sessionService,
	}
}

type LoginRequest struct {
	LoginID   string `json:"loginId" validate:"required"`
	Password  string `json:"password" validate:"required"`
	UseCookie bool   `json:"useCookie"`
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

	// Get user agent and IP address
	userAgent := c.Request().UserAgent()
	ipAddress := c.RealIP()

	// Login and create session
	result, err := h.sessionService.Login(req.LoginID, req.Password, userAgent, ipAddress)
	if err != nil {
		return echo.NewHTTPError(http.StatusUnauthorized, "Invalid credentials")
	}

	response := &LoginResponse{
		User: UserResponse{
			ID:              result.User.ID,
			LoginID:         result.User.LoginID,
			Name:            result.User.Name,
			ProfileImageURL: result.User.ProfileImageURL,
		},
	}

	if req.UseCookie {
		// Set cookies for better security
		h.setAuthCookies(c, result.SessionID.String(), result.AccessToken, result.RefreshToken)
	} else {
		// Return tokens in response
		response.SessionID = result.SessionID.String()
		response.AccessToken = result.AccessToken
		response.RefreshToken = result.RefreshToken
	}

	return c.JSON(http.StatusOK, response)
}

func (h *SessionHandler) RefreshToken(c echo.Context) error {
	req := new(RefreshTokenRequest)

	// Try to get from cookies first if UseCookie is requested
	if req.UseCookie {
		sessionCookie, err := c.Cookie("session_id")
		if err == nil {
			req.SessionID = sessionCookie.Value
		}
		refreshCookie, err := c.Cookie("refresh_token")
		if err == nil {
			req.RefreshToken = refreshCookie.Value
		}
	}

	// If not in cookies, try body
	if req.SessionID == "" || req.RefreshToken == "" {
		if err := c.Bind(req); err != nil {
			return echo.NewHTTPError(http.StatusBadRequest, "Invalid request payload")
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
	}

	if req.UseCookie {
		// Update cookies
		h.setAuthCookies(c, result.SessionID.String(), result.AccessToken, result.RefreshToken)
	} else {
		// Return tokens in response
		response.SessionID = result.SessionID.String()
		response.AccessToken = result.AccessToken
		response.RefreshToken = result.RefreshToken
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
	userID := c.Get("user_id").(int)

	err := h.sessionService.RevokeAllUserSessions(userID)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "Failed to revoke sessions")
	}

	// Clear cookies if they exist
	h.clearAuthCookies(c)

	return c.JSON(http.StatusOK, map[string]string{"message": "All sessions revoked successfully"})
}

func (h *SessionHandler) setAuthCookies(c echo.Context, sessionID, accessToken, refreshToken string) {
	// Session ID cookie (7 days)
	c.SetCookie(&http.Cookie{
		Name:     "session_id",
		Value:    sessionID,
		Path:     "/",
		HttpOnly: true,
		Secure:   true, // Set to true in production with HTTPS
		SameSite: http.SameSiteStrictMode,
		MaxAge:   7 * 24 * 60 * 60, // 7 days
	})

	// Access token cookie (15 minutes)
	c.SetCookie(&http.Cookie{
		Name:     "access_token",
		Value:    accessToken,
		Path:     "/",
		HttpOnly: true,
		Secure:   true,
		SameSite: http.SameSiteStrictMode,
		MaxAge:   15 * 60, // 15 minutes
	})

	// Refresh token cookie (7 days)
	c.SetCookie(&http.Cookie{
		Name:     "refresh_token",
		Value:    refreshToken,
		Path:     "/",
		HttpOnly: true,
		Secure:   true,
		SameSite: http.SameSiteStrictMode,
		MaxAge:   7 * 24 * 60 * 60, // 7 days
	})
}

func (h *SessionHandler) clearAuthCookies(c echo.Context) {
	// Clear all auth cookies by setting them with negative MaxAge
	cookies := []string{"session_id", "access_token", "refresh_token"}
	for _, name := range cookies {
		c.SetCookie(&http.Cookie{
			Name:     name,
			Value:    "",
			Path:     "/",
			HttpOnly: true,
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
