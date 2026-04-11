package apis

import (
	"net/http"
	"strconv"
	"time"

	"github.com/dannyswat/pjeasy/internal/status_changes"
	"github.com/labstack/echo/v4"
)

type StatusFlowHandler struct {
	statusChangeService *status_changes.StatusChangeService
}

func NewStatusFlowHandler(statusChangeService *status_changes.StatusChangeService) *StatusFlowHandler {
	return &StatusFlowHandler{statusChangeService: statusChangeService}
}

type CreateStatusFlowRequest struct {
	ItemType   string   `json:"itemType" validate:"required"`
	FromStatus *string  `json:"fromStatus"`
	ToStatuses []string `json:"toStatuses" validate:"required,min=1"`
	Disabled   bool     `json:"disabled"`
}

type UpdateStatusFlowRequest struct {
	ItemType   string   `json:"itemType" validate:"required"`
	FromStatus *string  `json:"fromStatus"`
	ToStatuses []string `json:"toStatuses" validate:"required,min=1"`
	Disabled   bool     `json:"disabled"`
}

type StatusFlowResponse struct {
	ID         int       `json:"id"`
	ProjectID  int       `json:"projectId"`
	ItemType   string    `json:"itemType"`
	FromStatus *string   `json:"fromStatus,omitempty"`
	ToStatuses []string  `json:"toStatuses"`
	Disabled   bool      `json:"disabled"`
	CreatedAt  time.Time `json:"createdAt"`
	UpdatedAt  time.Time `json:"updatedAt"`
}

func toStatusFlowResponse(flow *status_changes.StatusFlow) StatusFlowResponse {
	toStatuses := make([]string, len(flow.ToStatuses))
	copy(toStatuses, flow.ToStatuses)

	return StatusFlowResponse{
		ID:         flow.ID,
		ProjectID:  flow.ProjectID,
		ItemType:   flow.ItemType,
		FromStatus: flow.FromStatus,
		ToStatuses: toStatuses,
		Disabled:   flow.Disabled,
		CreatedAt:  flow.CreatedAt,
		UpdatedAt:  flow.UpdatedAt,
	}
}

func (h *StatusFlowHandler) ListStatusFlows(c echo.Context) error {
	userID, err := GetUserIDFromContext(c)
	if err != nil {
		return err
	}

	projectID, err := strconv.Atoi(c.Param("projectId"))
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid project ID")
	}

	flows, err := h.statusChangeService.ListStatusFlows(projectID, userID)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}

	response := make([]StatusFlowResponse, len(flows))
	for i := range flows {
		response[i] = toStatusFlowResponse(&flows[i])
	}

	return c.JSON(http.StatusOK, response)
}

func (h *StatusFlowHandler) CreateStatusFlow(c echo.Context) error {
	userID, err := GetUserIDFromContext(c)
	if err != nil {
		return err
	}

	projectID, err := strconv.Atoi(c.Param("projectId"))
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid project ID")
	}

	req := new(CreateStatusFlowRequest)
	if err := c.Bind(req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid request payload")
	}
	if err := c.Validate(req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}

	flow, err := h.statusChangeService.CreateStatusFlow(projectID, req.ItemType, req.FromStatus, req.ToStatuses, req.Disabled, userID)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}

	return c.JSON(http.StatusCreated, toStatusFlowResponse(flow))
}

func (h *StatusFlowHandler) UpdateStatusFlow(c echo.Context) error {
	userID, err := GetUserIDFromContext(c)
	if err != nil {
		return err
	}

	projectID, err := strconv.Atoi(c.Param("projectId"))
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid project ID")
	}

	flowID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid status flow ID")
	}

	req := new(UpdateStatusFlowRequest)
	if err := c.Bind(req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid request payload")
	}
	if err := c.Validate(req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}

	flow, err := h.statusChangeService.UpdateStatusFlow(projectID, flowID, req.ItemType, req.FromStatus, req.ToStatuses, req.Disabled, userID)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}

	return c.JSON(http.StatusOK, toStatusFlowResponse(flow))
}

func (h *StatusFlowHandler) DeleteStatusFlow(c echo.Context) error {
	userID, err := GetUserIDFromContext(c)
	if err != nil {
		return err
	}

	projectID, err := strconv.Atoi(c.Param("projectId"))
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid project ID")
	}

	flowID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid status flow ID")
	}

	if err := h.statusChangeService.DeleteStatusFlow(projectID, flowID, userID); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}

	return c.NoContent(http.StatusNoContent)
}

func (h *StatusFlowHandler) RegisterRoutes(e *echo.Echo, authMiddleware *AuthMiddleware, projectMiddleware *ProjectMiddleware) {
	statusFlows := e.Group("/api/projects/:projectId/status-flows", authMiddleware.RequireAuth, projectMiddleware.RequireProjectMember)
	statusFlows.GET("", h.ListStatusFlows)
	statusFlows.POST("", h.CreateStatusFlow)
	statusFlows.PUT("/:id", h.UpdateStatusFlow)
	statusFlows.DELETE("/:id", h.DeleteStatusFlow)
}
