package apis

import (
	"net/http"
	"strconv"
	"time"

	"github.com/dannyswat/pjeasy/internal/features"
	"github.com/labstack/echo/v4"
)

type FeatureHandler struct {
	featureService *features.FeatureService
}

func NewFeatureHandler(featureService *features.FeatureService) *FeatureHandler {
	return &FeatureHandler{
		featureService: featureService,
	}
}

type CreateFeatureRequest struct {
	Title       string  `json:"title" validate:"required"`
	Description string  `json:"description"`
	Priority    string  `json:"priority"`
	AssignedTo  int     `json:"assignedTo"`
	SprintID    int     `json:"sprintId"`
	Points      int     `json:"points"`
	Deadline    *string `json:"deadline"` // ISO 8601 format
	ItemType    string  `json:"itemType"`
	ItemID      *int    `json:"itemId"`
	Tags        string  `json:"tags"`
}

type UpdateFeatureRequest struct {
	Title       string  `json:"title" validate:"required"`
	Description string  `json:"description"`
	Priority    string  `json:"priority"`
	AssignedTo  int     `json:"assignedTo"`
	SprintID    int     `json:"sprintId"`
	Points      int     `json:"points"`
	Deadline    *string `json:"deadline"` // ISO 8601 format
	Tags        string  `json:"tags"`
}

type UpdateFeatureStatusRequest struct {
	Status string `json:"status" validate:"required"`
}

type UpdateFeatureAssigneeRequest struct {
	AssignedTo int `json:"assignedTo" validate:"required"`
}

type FeatureResponse struct {
	ID          int     `json:"id"`
	RefNum      string  `json:"refNum"`
	ProjectID   int     `json:"projectId"`
	Title       string  `json:"title"`
	Description string  `json:"description"`
	Status      string  `json:"status"`
	Priority    string  `json:"priority"`
	AssignedTo  int     `json:"assignedTo,omitempty"`
	SprintID    int     `json:"sprintId,omitempty"`
	Points      int     `json:"points"`
	Deadline    *string `json:"deadline,omitempty"`
	ItemType    string  `json:"itemType,omitempty"`
	ItemID      *int    `json:"itemId,omitempty"`
	Tags        string  `json:"tags,omitempty"`
	CreatedBy   int     `json:"createdBy"`
	CreatedAt   string  `json:"createdAt"`
	UpdatedAt   string  `json:"updatedAt"`
}

type FeaturesListResponse struct {
	Features []FeatureResponse `json:"features"`
	Total    int64             `json:"total"`
	Page     int               `json:"page"`
	PageSize int               `json:"pageSize"`
}

// toFeatureResponse converts a feature model to response
func toFeatureResponse(feature *features.Feature) FeatureResponse {
	var deadline *string
	if feature.Deadline != nil {
		formatted := feature.Deadline.Format("2006-01-02T15:04:05Z07:00")
		deadline = &formatted
	}

	return FeatureResponse{
		ID:          feature.ID,
		RefNum:      feature.RefNum,
		ProjectID:   feature.ProjectID,
		Title:       feature.Title,
		Description: feature.Description,
		Status:      feature.Status,
		Priority:    feature.Priority,
		AssignedTo:  feature.AssignedTo,
		SprintID:    feature.SprintID,
		Points:      feature.Points,
		Deadline:    deadline,
		ItemType:    feature.ItemType,
		ItemID:      feature.ItemID,
		Tags:        feature.Tags,
		CreatedBy:   feature.CreatedBy,
		CreatedAt:   feature.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
		UpdatedAt:   feature.UpdatedAt.Format("2006-01-02T15:04:05Z07:00"),
	}
}

// parseDeadline parses a deadline string to time.Time
func parseDeadline(deadlineStr *string) (*time.Time, error) {
	if deadlineStr == nil || *deadlineStr == "" {
		return nil, nil
	}

	// Try parsing with different formats
	formats := []string{
		"2006-01-02T15:04:05Z07:00",
		"2006-01-02T15:04:05Z",
		"2006-01-02",
	}

	for _, format := range formats {
		if t, err := time.Parse(format, *deadlineStr); err == nil {
			return &t, nil
		}
	}

	return nil, echo.NewHTTPError(http.StatusBadRequest, "Invalid deadline format")
}

// CreateFeature creates a new feature
func (h *FeatureHandler) CreateFeature(c echo.Context) error {
	userID, err := GetUserIDFromContext(c)
	if err != nil {
		return err
	}

	projectID, err := strconv.Atoi(c.Param("projectId"))
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid project ID")
	}

	req := new(CreateFeatureRequest)
	if err := c.Bind(req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid request payload")
	}

	if err := c.Validate(req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}

	deadline, err := parseDeadline(req.Deadline)
	if err != nil {
		return err
	}

	feature, err := h.featureService.CreateFeature(projectID, req.Title, req.Description, req.Priority, req.AssignedTo, req.SprintID, req.Points, deadline, req.ItemType, req.ItemID, req.Tags, userID)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}

	response := toFeatureResponse(feature)
	return c.JSON(http.StatusCreated, response)
}

// UpdateFeature updates a feature
func (h *FeatureHandler) UpdateFeature(c echo.Context) error {
	userID, err := GetUserIDFromContext(c)
	if err != nil {
		return err
	}

	featureID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid feature ID")
	}

	req := new(UpdateFeatureRequest)
	if err := c.Bind(req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid request payload")
	}

	if err := c.Validate(req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}

	deadline, err := parseDeadline(req.Deadline)
	if err != nil {
		return err
	}

	feature, err := h.featureService.UpdateFeature(featureID, req.Title, req.Description, req.Priority, req.AssignedTo, req.SprintID, req.Points, deadline, req.Tags, userID)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}

	response := toFeatureResponse(feature)
	return c.JSON(http.StatusOK, response)
}

// UpdateFeatureStatus updates a feature's status
func (h *FeatureHandler) UpdateFeatureStatus(c echo.Context) error {
	userID, err := GetUserIDFromContext(c)
	if err != nil {
		return err
	}

	featureID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid feature ID")
	}

	req := new(UpdateFeatureStatusRequest)
	if err := c.Bind(req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid request payload")
	}

	if err := c.Validate(req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}

	feature, err := h.featureService.UpdateFeatureStatus(featureID, req.Status, userID)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}

	response := toFeatureResponse(feature)
	return c.JSON(http.StatusOK, response)
}

// UpdateFeatureAssignee updates a feature's assignee
func (h *FeatureHandler) UpdateFeatureAssignee(c echo.Context) error {
	userID, err := GetUserIDFromContext(c)
	if err != nil {
		return err
	}

	featureID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid feature ID")
	}

	req := new(UpdateFeatureAssigneeRequest)
	if err := c.Bind(req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid request payload")
	}

	if err := c.Validate(req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}

	feature, err := h.featureService.UpdateFeatureAssignee(featureID, req.AssignedTo, userID)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}

	response := toFeatureResponse(feature)
	return c.JSON(http.StatusOK, response)
}

// DeleteFeature deletes a feature
func (h *FeatureHandler) DeleteFeature(c echo.Context) error {
	userID, err := GetUserIDFromContext(c)
	if err != nil {
		return err
	}

	featureID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid feature ID")
	}

	if err := h.featureService.DeleteFeature(featureID, userID); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}

	return c.JSON(http.StatusOK, map[string]string{"message": "Feature deleted successfully"})
}

// GetFeature retrieves a single feature
func (h *FeatureHandler) GetFeature(c echo.Context) error {
	userID, err := GetUserIDFromContext(c)
	if err != nil {
		return err
	}

	featureID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid feature ID")
	}

	feature, err := h.featureService.GetFeature(featureID, userID)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}

	response := toFeatureResponse(feature)
	return c.JSON(http.StatusOK, response)
}

// GetProjectFeatures retrieves all features for a project
func (h *FeatureHandler) GetProjectFeatures(c echo.Context) error {
	userID, err := GetUserIDFromContext(c)
	if err != nil {
		return err
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
	priority := c.QueryParam("priority")

	featureList, total, err := h.featureService.GetProjectFeatures(projectID, status, priority, page, pageSize, userID)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}

	featuresResp := make([]FeatureResponse, len(featureList))
	for i, feature := range featureList {
		featuresResp[i] = toFeatureResponse(&feature)
	}

	response := FeaturesListResponse{
		Features: featuresResp,
		Total:    total,
		Page:     page,
		PageSize: pageSize,
	}

	return c.JSON(http.StatusOK, response)
}

// GetMyFeatures retrieves features assigned to the current user
func (h *FeatureHandler) GetMyFeatures(c echo.Context) error {
	userID, err := GetUserIDFromContext(c)
	if err != nil {
		return err
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

	featureList, total, err := h.featureService.GetMyFeatures(projectID, page, pageSize, userID)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}

	featuresResp := make([]FeatureResponse, len(featureList))
	for i, feature := range featureList {
		featuresResp[i] = toFeatureResponse(&feature)
	}

	response := FeaturesListResponse{
		Features: featuresResp,
		Total:    total,
		Page:     page,
		PageSize: pageSize,
	}

	return c.JSON(http.StatusOK, response)
}

// GetFeaturesByItemReference retrieves features related to a specific item
func (h *FeatureHandler) GetFeaturesByItemReference(c echo.Context) error {
	userID, err := GetUserIDFromContext(c)
	if err != nil {
		return err
	}

	projectID, err := strconv.Atoi(c.Param("projectId"))
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid project ID")
	}

	itemType := c.QueryParam("itemType")
	if itemType == "" {
		return echo.NewHTTPError(http.StatusBadRequest, "itemType is required")
	}

	itemID, err := strconv.Atoi(c.QueryParam("itemId"))
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid itemId")
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

	featureList, total, err := h.featureService.GetFeaturesByItemReference(projectID, itemType, itemID, page, pageSize, userID)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, err.Error())
	}

	featuresResp := make([]FeatureResponse, len(featureList))
	for i, feature := range featureList {
		featuresResp[i] = toFeatureResponse(&feature)
	}

	response := FeaturesListResponse{
		Features: featuresResp,
		Total:    total,
		Page:     page,
		PageSize: pageSize,
	}

	return c.JSON(http.StatusOK, response)
}

// RegisterRoutes registers feature-related routes
func (h *FeatureHandler) RegisterRoutes(e *echo.Echo, authMiddleware *AuthMiddleware, projectMiddleware *ProjectMiddleware) {
	featuresGroup := e.Group("/api/projects/:projectId/features", authMiddleware.RequireAuth, projectMiddleware.RequireProjectMember)

	featuresGroup.POST("", h.CreateFeature)
	featuresGroup.GET("", h.GetProjectFeatures)
	featuresGroup.GET("/my-features", h.GetMyFeatures)
	featuresGroup.GET("/by-item", h.GetFeaturesByItemReference)

	featureItem := e.Group("/api/features/:id", authMiddleware.RequireAuth)

	featureItem.GET("", h.GetFeature)
	featureItem.PUT("", h.UpdateFeature)
	featureItem.PATCH("/status", h.UpdateFeatureStatus)
	featureItem.PATCH("/assignee", h.UpdateFeatureAssignee)
	featureItem.DELETE("", h.DeleteFeature)
}
