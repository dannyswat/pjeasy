package apis

import (
	"net/http"

	"github.com/dannyswat/pjeasy/internal/users"
	"github.com/labstack/echo/v4"
)

type UserHandler struct {
	userService *users.UserService
}

func NewUserHandler(userService *users.UserService) *UserHandler {
	return &UserHandler{
		userService: userService,
	}
}

type RegisterRequest struct {
	LoginID  string `json:"loginId" validate:"required"`
	Name     string `json:"name" validate:"required"`
	Password string `json:"password" validate:"required,complexpassword"`
}

type UserResponse struct {
	ID              int    `json:"id"`
	LoginID         string `json:"loginId"`
	Name            string `json:"name"`
	ProfileImageURL string `json:"profileImageUrl,omitempty"`
}

func (h *UserHandler) Register(c echo.Context) error {
	req := new(RegisterRequest)
	if err := c.Bind(req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid request payload")
	}

	if err := c.Validate(req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}

	user, err := h.userService.RegisterWithPassword(req.LoginID, req.Name, req.Password)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}

	response := &UserResponse{
		ID:              user.ID,
		LoginID:         user.LoginID,
		Name:            user.Name,
		ProfileImageURL: user.ProfileImageURL,
	}

	return c.JSON(http.StatusCreated, response)
}

func (h *UserHandler) Me(c echo.Context) error {
	// Get user ID from context (set by auth middleware)
	userID, ok := c.Get("user_id").(int)
	if !ok {
		return echo.NewHTTPError(http.StatusUnauthorized, "User not authenticated")
	}

	// Get user from service
	user, err := h.userService.GetUserByID(userID)
	if err != nil {
		return echo.NewHTTPError(http.StatusNotFound, "User not found")
	}

	response := &UserResponse{
		ID:              user.ID,
		LoginID:         user.LoginID,
		Name:            user.Name,
		ProfileImageURL: user.ProfileImageURL,
	}

	return c.JSON(http.StatusOK, response)
}

func (h *UserHandler) RegisterRoutes(e *echo.Echo, authMiddleware *AuthMiddleware) {
	e.POST("/api/users/register", h.Register) // No logging for registration (security)
	e.GET("/api/users/me", h.Me, LoggingMiddleware, authMiddleware.RequireAuth)
}
