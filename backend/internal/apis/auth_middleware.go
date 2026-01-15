package apis

import (
	"net/http"
	"strconv"
	"strings"

	"github.com/dannyswat/pjeasy/internal/projects"
	userroles "github.com/dannyswat/pjeasy/internal/user_roles"
	"github.com/dannyswat/pjeasy/internal/user_sessions"
	"github.com/labstack/echo/v4"
)

type AuthMiddleware struct {
	tokenService *user_sessions.TokenService
	adminService *userroles.SystemAdminService
}

func NewAuthMiddleware(tokenService *user_sessions.TokenService, adminService *userroles.SystemAdminService) *AuthMiddleware {
	return &AuthMiddleware{
		tokenService: tokenService,
		adminService: adminService,
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

// RequireAdmin middleware ensures the user is a system admin
func (m *AuthMiddleware) RequireAdmin(next echo.HandlerFunc) echo.HandlerFunc {
	return func(c echo.Context) error {
		// First ensure user is authenticated
		userID, ok := c.Get("user_id").(int)
		if !ok {
			return echo.NewHTTPError(http.StatusUnauthorized, "User not authenticated")
		}

		// Check if user is an admin
		isAdmin, err := m.adminService.IsUserAdmin(userID)
		if err != nil {
			return echo.NewHTTPError(http.StatusInternalServerError, "Failed to verify admin status")
		}

		if !isAdmin {
			return echo.NewHTTPError(http.StatusForbidden, "Admin access required")
		}

		return next(c)
	}
}

// ProjectMiddleware handles project-level authorization
type ProjectMiddleware struct {
	memberCache *projects.ProjectMemberCache
}

func NewProjectMiddleware(memberCache *projects.ProjectMemberCache) *ProjectMiddleware {
	return &ProjectMiddleware{
		memberCache: memberCache,
	}
}

// RequireProjectMember ensures the user is a member of the project
func (m *ProjectMiddleware) RequireProjectMember(next echo.HandlerFunc) echo.HandlerFunc {
	return func(c echo.Context) error {
		userID, ok := c.Get("user_id").(int)
		if !ok {
			return echo.NewHTTPError(http.StatusUnauthorized, "User not authenticated")
		}

		projectIDStr := c.Param("projectId")
		if projectIDStr == "" {
			projectIDStr = c.Param("id")
		}

		projectID, err := strconv.Atoi(projectIDStr)
		if err != nil {
			return echo.NewHTTPError(http.StatusBadRequest, "Invalid project ID")
		}

		isMember, err := m.memberCache.IsUserMember(projectID, userID)

		if !isMember {
			return echo.NewHTTPError(http.StatusForbidden, "Project membership required")
		}

		c.Set("project_id", projectID)
		return next(c)
	}
}

// RequireProjectAdmin ensures the user is an admin of the project
func (m *ProjectMiddleware) RequireProjectAdmin(next echo.HandlerFunc) echo.HandlerFunc {
	return func(c echo.Context) error {
		userID, ok := c.Get("user_id").(int)
		if !ok {
			return echo.NewHTTPError(http.StatusUnauthorized, "User not authenticated")
		}

		projectIDStr := c.Param("projectId")
		if projectIDStr == "" {
			projectIDStr = c.Param("id")
		}

		projectID, err := strconv.Atoi(projectIDStr)
		if err != nil {
			return echo.NewHTTPError(http.StatusBadRequest, "Invalid project ID")
		}

		isAdmin, err := m.memberCache.IsUserAdmin(projectID, userID)

		if !isAdmin {
			return echo.NewHTTPError(http.StatusForbidden, "Project admin access required")
		}

		c.Set("project_id", projectID)
		return next(c)
	}
}
