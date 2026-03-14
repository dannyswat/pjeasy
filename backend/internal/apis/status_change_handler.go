package apis

import (
	"net/http"
	"strconv"
	"time"

	"github.com/dannyswat/pjeasy/internal/status_changes"
	"github.com/labstack/echo/v4"
)

type StatusChangeHandler struct {
	statusChangeService *status_changes.StatusChangeService
}

func NewStatusChangeHandler(statusChangeService *status_changes.StatusChangeService) *StatusChangeHandler {
	return &StatusChangeHandler{statusChangeService: statusChangeService}
}

type StatusChangeResponse struct {
	ID        int       `json:"id"`
	ProjectID int       `json:"projectId"`
	ItemType  string    `json:"itemType"`
	ItemID    int       `json:"itemId"`
	OldStatus string    `json:"oldStatus"`
	NewStatus string    `json:"newStatus"`
	ChangedBy *int      `json:"changedBy,omitempty"`
	ChangedAt time.Time `json:"changedAt"`
}

func toStatusChangeResponse(change *status_changes.StatusChange) StatusChangeResponse {
	return StatusChangeResponse{
		ID:        change.ID,
		ProjectID: change.ProjectID,
		ItemType:  change.ItemType,
		ItemID:    change.ItemID,
		OldStatus: change.OldStatus,
		NewStatus: change.NewStatus,
		ChangedBy: change.ChangedBy,
		ChangedAt: change.ChangedAt,
	}
}

func (h *StatusChangeHandler) ListByItem(c echo.Context) error {
	userID, err := GetUserIDFromContext(c)
	if err != nil {
		return err
	}

	projectID, err := strconv.Atoi(c.QueryParam("projectId"))
	if err != nil || projectID <= 0 {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid project ID")
	}

	itemID, err := strconv.Atoi(c.QueryParam("itemId"))
	if err != nil || itemID <= 0 {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid item ID")
	}

	itemType := c.QueryParam("itemType")
	if itemType == "" {
		return echo.NewHTTPError(http.StatusBadRequest, "Item type is required")
	}

	changes, err := h.statusChangeService.GetByItem(projectID, itemType, itemID, userID)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}

	response := make([]StatusChangeResponse, len(changes))
	for i := range changes {
		response[i] = toStatusChangeResponse(&changes[i])
	}

	return c.JSON(http.StatusOK, response)
}

func (h *StatusChangeHandler) RegisterRoutes(e *echo.Echo, authMiddleware *AuthMiddleware) {
	statusChanges := e.Group("/api/status-changes", authMiddleware.RequireAuth)
	statusChanges.GET("", h.ListByItem)
}
