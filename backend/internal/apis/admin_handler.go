package apis

import (
	"net/http"
	"strconv"
	"time"

	userroles "github.com/dannyswat/pjeasy/internal/user_roles"
	"github.com/labstack/echo/v4"
)

type AdminHandler struct {
	adminService *userroles.SystemAdminService
}

func NewAdminHandler(adminService *userroles.SystemAdminService) *AdminHandler {
	return &AdminHandler{
		adminService: adminService,
	}
}

type AdminResponse struct {
	ID           int          `json:"id"`
	UserID       int          `json:"userId"`
	User         UserResponse `json:"user"`
	CreatedAt    time.Time    `json:"createdAt"`
	ExpiredAfter *time.Time   `json:"expiredAfter,omitempty"`
	IsActive     bool         `json:"isActive"`
}

type AssignAdminRequest struct {
	LoginID      string     `json:"loginId" validate:"required"`
	ExpiredAfter *time.Time `json:"expiredAfter,omitempty"`
}

type UnassignAdminRequest struct {
	UserID int `json:"userId" validate:"required"`
}

// ListAdmins returns all system admins
func (h *AdminHandler) ListAdmins(c echo.Context) error {
	admins, err := h.adminService.GetAllAdmins()
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "Failed to fetch admins")
	}

	response := make([]AdminResponse, 0, len(admins))
	for _, admin := range admins {
		var expiredAfter *time.Time
		if !admin.Admin.ExpiredAfter.IsZero() {
			expiredAfter = &admin.Admin.ExpiredAfter
		}

		response = append(response, AdminResponse{
			ID:     admin.Admin.ID,
			UserID: admin.Admin.UserID,
			User: UserResponse{
				ID:              admin.User.ID,
				LoginID:         admin.User.LoginID,
				Name:            admin.User.Name,
				ProfileImageURL: admin.User.ProfileImageURL,
			},
			CreatedAt:    admin.Admin.CreatedAt,
			ExpiredAfter: expiredAfter,
			IsActive:     admin.Admin.IsActive(),
		})
	}

	return c.JSON(http.StatusOK, response)
}

// AssignAdmin assigns system admin role to a user
func (h *AdminHandler) AssignAdmin(c echo.Context) error {
	req := new(AssignAdminRequest)
	if err := c.Bind(req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid request payload")
	}

	if err := c.Validate(req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}

	admin, err := h.adminService.AssignAdminByLoginID(req.LoginID, req.ExpiredAfter)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}

	var expiredAfter *time.Time
	if !admin.ExpiredAfter.IsZero() {
		expiredAfter = &admin.ExpiredAfter
	}

	response := map[string]interface{}{
		"id":           admin.ID,
		"userId":       admin.UserID,
		"createdAt":    admin.CreatedAt,
		"expiredAfter": expiredAfter,
		"message":      "Admin role assigned successfully",
	}

	return c.JSON(http.StatusCreated, response)
}

// UnassignAdmin removes system admin role from a user
func (h *AdminHandler) UnassignAdmin(c echo.Context) error {
	userIDStr := c.Param("userId")
	userID, err := strconv.Atoi(userIDStr)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid user ID")
	}

	err = h.adminService.UnassignAdmin(userID)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}

	return c.JSON(http.StatusOK, map[string]string{
		"message": "Admin role removed successfully",
	})
}

// CheckAdmin checks if the current user is an admin
func (h *AdminHandler) CheckAdmin(c echo.Context) error {
	userID, err := GetUserIDFromContext(c)
	if err != nil {
		return err
	}

	isAdmin, err := h.adminService.IsUserAdmin(userID)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "Failed to check admin status")
	}

	return c.JSON(http.StatusOK, map[string]bool{
		"isAdmin": isAdmin,
	})
}

func (h *AdminHandler) RegisterRoutes(e *echo.Echo, authMiddleware *AuthMiddleware) {
	// All admin routes require authentication
	adminGroup := e.Group("/api/admins", authMiddleware.RequireAuth)

	// Check admin status (available to all authenticated users)
	adminGroup.GET("/check", h.CheckAdmin)

	// Admin-only routes
	adminOnlyGroup := e.Group("/api/admins", authMiddleware.RequireAuth, authMiddleware.RequireAdmin)
	adminOnlyGroup.GET("", h.ListAdmins)
	adminOnlyGroup.POST("", h.AssignAdmin)
	adminOnlyGroup.DELETE("/:userId", h.UnassignAdmin)
}
