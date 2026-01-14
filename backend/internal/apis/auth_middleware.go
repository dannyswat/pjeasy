package apis

import (
	"net/http"
	"strings"

	"github.com/dannyswat/pjeasy/internal/user_sessions"
	"github.com/labstack/echo/v4"
)

type AuthMiddleware struct {
	tokenService *user_sessions.TokenService
}

func NewAuthMiddleware(tokenService *user_sessions.TokenService) *AuthMiddleware {
	return &AuthMiddleware{
		tokenService: tokenService,
	}
}

// RequireAuth middleware validates the access token and sets user info in context
func (m *AuthMiddleware) RequireAuth(next echo.HandlerFunc) echo.HandlerFunc {
	return func(c echo.Context) error {
		// Try to get token from Authorization header first
		authHeader := c.Request().Header.Get("Authorization")
		var token string

		if authHeader != "" {
			// Expected format: "Bearer <token>"
			parts := strings.SplitN(authHeader, " ", 2)
			if len(parts) == 2 && strings.ToLower(parts[0]) == "bearer" {
				token = parts[1]
			}
		}

		// If not in header, try cookie
		if token == "" {
			cookie, err := c.Cookie("access_token")
			if err == nil {
				token = cookie.Value
			}
		}

		// If still no token, return unauthorized
		if token == "" {
			return echo.NewHTTPError(http.StatusUnauthorized, "Missing access token")
		}

		// Validate token
		claims, err := m.tokenService.ValidateAccessToken(token)
		if err != nil {
			return echo.NewHTTPError(http.StatusUnauthorized, "Invalid or expired access token")
		}

		// Set user info in context
		c.Set("user_id", claims.UserID)
		c.Set("login_id", claims.LoginID)

		return next(c)
	}
}
