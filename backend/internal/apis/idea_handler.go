package apis

import (
	"net/http"
	"strconv"

	"github.com/dannyswat/pjeasy/internal/ideas"
	"github.com/labstack/echo/v4"
)

type IdeaHandler struct {
	ideaService *ideas.IdeaService
}

func NewIdeaHandler(ideaService *ideas.IdeaService) *IdeaHandler {
	return &IdeaHandler{
		ideaService: ideaService,
	}
}

type CreateIdeaRequest struct {
	Title       string `json:"title" validate:"required"`
	Description string `json:"description"`
	Tags        string `json:"tags"`
}

type UpdateIdeaRequest struct {
	Title       string `json:"title" validate:"required"`
	Description string `json:"description"`
	Tags        string `json:"tags"`
}

type UpdateIdeaStatusRequest struct {
	Status string `json:"status" validate:"required"`
}

type IdeaResponse struct {
	ID          int    `json:"id"`
	ProjectID   int    `json:"projectId"`
	Title       string `json:"title"`
	Description string `json:"description"`
	Status      string `json:"status"`
	Tags        string `json:"tags,omitempty"`
	CreatedBy   int    `json:"createdBy"`
	CreatedAt   string `json:"createdAt"`
	UpdatedAt   string `json:"updatedAt"`
}

type IdeasListResponse struct {
	Ideas    []IdeaResponse `json:"ideas"`
	Total    int64          `json:"total"`
	Page     int            `json:"page"`
	PageSize int            `json:"pageSize"`
}

// toIdeaResponse converts an idea model to response
func toIdeaResponse(idea *ideas.Idea) IdeaResponse {
	return IdeaResponse{
		ID:          idea.ID,
		ProjectID:   idea.ProjectID,
		Title:       idea.Title,
		Description: idea.Description,
		Status:      idea.Status,
		Tags:        idea.Tags,
		CreatedBy:   idea.CreatedBy,
		CreatedAt:   idea.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
		UpdatedAt:   idea.UpdatedAt.Format("2006-01-02T15:04:05Z07:00"),
	}
}

// CreateIdea creates a new idea
func (h *IdeaHandler) CreateIdea(c echo.Context) error {
	userID, ok := c.Get("user_id").(int)
	if !ok {
		return echo.NewHTTPError(http.StatusUnauthorized, "User not authenticated")
	}

	projectID, err := strconv.Atoi(c.Param("projectId"))
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid project ID")
	}

	req := new(CreateIdeaRequest)
	if err := c.Bind(req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid request payload")
	}

	if err := c.Validate(req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}

	idea, err := h.ideaService.CreateIdea(projectID, req.Title, req.Description, req.Tags, userID)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}

	response := toIdeaResponse(idea)
	return c.JSON(http.StatusCreated, response)
}

// UpdateIdea updates an idea
func (h *IdeaHandler) UpdateIdea(c echo.Context) error {
	userID, ok := c.Get("user_id").(int)
	if !ok {
		return echo.NewHTTPError(http.StatusUnauthorized, "User not authenticated")
	}

	ideaID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid idea ID")
	}

	req := new(UpdateIdeaRequest)
	if err := c.Bind(req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid request payload")
	}

	if err := c.Validate(req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}

	idea, err := h.ideaService.UpdateIdea(ideaID, req.Title, req.Description, req.Tags, userID)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}

	response := toIdeaResponse(idea)
	return c.JSON(http.StatusOK, response)
}

// UpdateIdeaStatus updates an idea's status
func (h *IdeaHandler) UpdateIdeaStatus(c echo.Context) error {
	userID, ok := c.Get("user_id").(int)
	if !ok {
		return echo.NewHTTPError(http.StatusUnauthorized, "User not authenticated")
	}

	ideaID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid idea ID")
	}

	req := new(UpdateIdeaStatusRequest)
	if err := c.Bind(req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid request payload")
	}

	if err := c.Validate(req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}

	idea, err := h.ideaService.UpdateIdeaStatus(ideaID, req.Status, userID)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}

	response := toIdeaResponse(idea)
	return c.JSON(http.StatusOK, response)
}

// DeleteIdea deletes an idea
func (h *IdeaHandler) DeleteIdea(c echo.Context) error {
	userID, ok := c.Get("user_id").(int)
	if !ok {
		return echo.NewHTTPError(http.StatusUnauthorized, "User not authenticated")
	}

	ideaID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid idea ID")
	}

	if err := h.ideaService.DeleteIdea(ideaID, userID); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}

	return c.JSON(http.StatusOK, map[string]string{"message": "Idea deleted successfully"})
}

// GetIdea retrieves a single idea
func (h *IdeaHandler) GetIdea(c echo.Context) error {
	userID, ok := c.Get("user_id").(int)
	if !ok {
		return echo.NewHTTPError(http.StatusUnauthorized, "User not authenticated")
	}

	ideaID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid idea ID")
	}

	idea, err := h.ideaService.GetIdea(ideaID, userID)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}

	response := toIdeaResponse(idea)
	return c.JSON(http.StatusOK, response)
}

// GetProjectIdeas retrieves all ideas for a project
func (h *IdeaHandler) GetProjectIdeas(c echo.Context) error {
	userID, ok := c.Get("user_id").(int)
	if !ok {
		return echo.NewHTTPError(http.StatusUnauthorized, "User not authenticated")
	}

	projectID, err := strconv.Atoi(c.Param("projectId"))
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid project ID")
	}

	// Parse query parameters
	page, err := strconv.Atoi(c.QueryParam("page"))
	if err != nil || page < 1 {
		page = 1
	}

	pageSize, err := strconv.Atoi(c.QueryParam("pageSize"))
	if err != nil || pageSize < 1 {
		pageSize = 20
	}

	status := c.QueryParam("status")

	ideaList, total, err := h.ideaService.GetProjectIdeas(projectID, status, page, pageSize, userID)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}

	ideas := make([]IdeaResponse, len(ideaList))
	for i, idea := range ideaList {
		ideas[i] = toIdeaResponse(&idea)
	}

	response := IdeasListResponse{
		Ideas:    ideas,
		Total:    total,
		Page:     page,
		PageSize: pageSize,
	}

	return c.JSON(http.StatusOK, response)
}

// RegisterRoutes registers the idea routes
func (h *IdeaHandler) RegisterRoutes(e *echo.Echo, authMiddleware *AuthMiddleware, projectMiddleware *ProjectMiddleware) {
	ideas := e.Group("/api/projects/:projectId/ideas", LoggingMiddleware, authMiddleware.RequireAuth, projectMiddleware.RequireProjectMember)

	ideas.POST("", h.CreateIdea)
	ideas.GET("", h.GetProjectIdeas)

	ideaItem := e.Group("/api/ideas/:id", LoggingMiddleware, authMiddleware.RequireAuth)

	ideaItem.GET("", h.GetIdea)
	ideaItem.PUT("", h.UpdateIdea)
	ideaItem.PATCH("/status", h.UpdateIdeaStatus)
	ideaItem.DELETE("", h.DeleteIdea)
}
