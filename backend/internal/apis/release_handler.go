package apis

import (
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/dannyswat/pjeasy/internal/releases"
	"github.com/labstack/echo/v4"
)

type ReleaseHandler struct {
	releaseService *releases.ReleaseService
}

func NewReleaseHandler(releaseService *releases.ReleaseService) *ReleaseHandler {
	return &ReleaseHandler{
		releaseService: releaseService,
	}
}

type CreateReleaseRequest struct {
	Version       string                 `json:"version" validate:"required"`
	Description   string                 `json:"description"`
	TargetDate    *string                `json:"targetDate"`
	SelectedItems []ConfirmedItemRequest `json:"selectedItems"`
}

type UpdateReleaseRequest struct {
	Version     string  `json:"version" validate:"required"`
	Description string  `json:"description"`
	TargetDate  *string `json:"targetDate"`
}

type UpdateReleaseStatusRequest struct {
	Status         string                 `json:"status" validate:"required"`
	ConfirmedItems []ConfirmedItemRequest `json:"confirmedItems"`
}

type ConfirmedItemRequest struct {
	ID       int    `json:"id" validate:"required"`
	ItemType string `json:"itemType" validate:"required"`
}

type CompleteReleaseRequest struct {
	ConfirmedItems []ConfirmedItemRequest `json:"confirmedItems"`
}

type ReleaseResponse struct {
	ID          int     `json:"id"`
	Version     string  `json:"version"`
	ProjectID   int     `json:"projectId"`
	Description string  `json:"description"`
	Status      string  `json:"status"`
	TargetDate  *string `json:"targetDate,omitempty"`
	CreatedBy   int     `json:"createdBy"`
	CreatedAt   string  `json:"createdAt"`
	UpdatedAt   string  `json:"updatedAt"`
}

type ReleasesListResponse struct {
	Releases []ReleaseResponse `json:"releases"`
	Total    int64             `json:"total"`
	Page     int               `json:"page"`
	PageSize int               `json:"pageSize"`
}

type ReleaseItemResponse struct {
	ID       int    `json:"id"`
	RefNum   string `json:"refNum"`
	Title    string `json:"title"`
	Status   string `json:"status"`
	ItemType string `json:"itemType"`
}

type ReleaseCandidateItemResponse struct {
	ID       int    `json:"id"`
	RefNum   string `json:"refNum"`
	Title    string `json:"title"`
	Status   string `json:"status"`
	ItemType string `json:"itemType"`
	Linked   bool   `json:"linked"`
}

func toReleaseResponse(release *releases.Release) ReleaseResponse {
	var targetDate *string
	if release.TargetDate != nil {
		formatted := release.TargetDate.Format("2006-01-02")
		targetDate = &formatted
	}

	return ReleaseResponse{
		ID:          release.ID,
		Version:     release.Version,
		ProjectID:   release.ProjectID,
		Description: release.Description,
		Status:      release.Status,
		TargetDate:  targetDate,
		CreatedBy:   release.CreatedBy,
		CreatedAt:   release.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
		UpdatedAt:   release.UpdatedAt.Format("2006-01-02T15:04:05Z07:00"),
	}
}

// CreateRelease creates a new release
func (h *ReleaseHandler) CreateRelease(c echo.Context) error {
	userID, err := GetUserIDFromContext(c)
	if err != nil {
		return err
	}

	projectID, err := strconv.Atoi(c.Param("projectId"))
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid project ID")
	}

	req := new(CreateReleaseRequest)
	if err := c.Bind(req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid request payload")
	}

	if err := c.Validate(req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}

	var targetDate *time.Time
	if req.TargetDate != nil && *req.TargetDate != "" {
		t, err := time.Parse("2006-01-02", *req.TargetDate)
		if err != nil {
			return echo.NewHTTPError(http.StatusBadRequest, "Invalid target date format")
		}
		targetDate = &t
	}

	selectedItems := make([]releases.ConfirmedReleaseItem, 0, len(req.SelectedItems))
	for _, item := range req.SelectedItems {
		selectedItems = append(selectedItems, releases.ConfirmedReleaseItem{ID: item.ID, ItemType: item.ItemType})
	}

	release, err := h.releaseService.CreateRelease(projectID, req.Version, req.Description, targetDate, selectedItems, userID)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}

	return c.JSON(http.StatusCreated, toReleaseResponse(release))
}

// UpdateRelease updates a release
func (h *ReleaseHandler) UpdateRelease(c echo.Context) error {
	userID, err := GetUserIDFromContext(c)
	if err != nil {
		return err
	}

	releaseID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid release ID")
	}

	req := new(UpdateReleaseRequest)
	if err := c.Bind(req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid request payload")
	}

	if err := c.Validate(req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}

	var targetDate *time.Time
	if req.TargetDate != nil && *req.TargetDate != "" {
		t, err := time.Parse("2006-01-02", *req.TargetDate)
		if err != nil {
			return echo.NewHTTPError(http.StatusBadRequest, "Invalid target date format")
		}
		targetDate = &t
	}

	release, err := h.releaseService.UpdateRelease(releaseID, req.Version, req.Description, targetDate, userID)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}

	return c.JSON(http.StatusOK, toReleaseResponse(release))
}

// UpdateReleaseStatus updates a release's status
func (h *ReleaseHandler) UpdateReleaseStatus(c echo.Context) error {
	userID, err := GetUserIDFromContext(c)
	if err != nil {
		return err
	}

	releaseID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid release ID")
	}

	req := new(UpdateReleaseStatusRequest)
	if err := c.Bind(req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid request payload")
	}

	if err := c.Validate(req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}

	var confirmedItems []releases.ConfirmedReleaseItem
	if req.ConfirmedItems != nil {
		confirmedItems = make([]releases.ConfirmedReleaseItem, 0, len(req.ConfirmedItems))
		for _, item := range req.ConfirmedItems {
			confirmedItems = append(confirmedItems, releases.ConfirmedReleaseItem{ID: item.ID, ItemType: item.ItemType})
		}
	}

	release, err := h.releaseService.UpdateReleaseStatus(releaseID, req.Status, confirmedItems, userID)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}

	return c.JSON(http.StatusOK, toReleaseResponse(release))
}

func (h *ReleaseHandler) GetReleaseCandidateItems(c echo.Context) error {
	userID, err := GetUserIDFromContext(c)
	if err != nil {
		return err
	}

	projectID, err := strconv.Atoi(c.Param("projectId"))
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid project ID")
	}

	var releaseID *int
	releaseIDParam := c.QueryParam("releaseId")
	if releaseIDParam != "" {
		parsedReleaseID, err := strconv.Atoi(releaseIDParam)
		if err != nil {
			return echo.NewHTTPError(http.StatusBadRequest, "Invalid release ID")
		}
		releaseID = &parsedReleaseID
	}

	items, err := h.releaseService.GetReleaseCandidateItems(projectID, releaseID, userID)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}

	response := make([]ReleaseCandidateItemResponse, len(items))
	for i, item := range items {
		response[i] = ReleaseCandidateItemResponse{
			ID:       item.ID,
			RefNum:   item.RefNum,
			Title:    item.Title,
			Status:   item.Status,
			ItemType: item.ItemType,
			Linked:   item.Linked,
		}
	}

	return c.JSON(http.StatusOK, response)
}

// CompleteRelease completes a release with confirmed items
func (h *ReleaseHandler) CompleteRelease(c echo.Context) error {
	userID, err := GetUserIDFromContext(c)
	if err != nil {
		return err
	}

	releaseID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid release ID")
	}

	req := new(CompleteReleaseRequest)
	if err := c.Bind(req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid request payload")
	}

	confirmedItems := make([]releases.ConfirmedReleaseItem, 0, len(req.ConfirmedItems))
	for _, item := range req.ConfirmedItems {
		confirmedItems = append(confirmedItems, releases.ConfirmedReleaseItem{
			ID:       item.ID,
			ItemType: item.ItemType,
		})
	}

	release, err := h.releaseService.CompleteRelease(releaseID, confirmedItems, userID)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}

	return c.JSON(http.StatusOK, toReleaseResponse(release))
}

// DeleteRelease deletes a release
func (h *ReleaseHandler) DeleteRelease(c echo.Context) error {
	userID, err := GetUserIDFromContext(c)
	if err != nil {
		return err
	}

	releaseID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid release ID")
	}

	if err := h.releaseService.DeleteRelease(releaseID, userID); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}

	return c.JSON(http.StatusOK, map[string]string{"message": "Release deleted successfully"})
}

// GetRelease retrieves a single release
func (h *ReleaseHandler) GetRelease(c echo.Context) error {
	userID, err := GetUserIDFromContext(c)
	if err != nil {
		return err
	}

	releaseID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid release ID")
	}

	release, err := h.releaseService.GetRelease(releaseID, userID)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}

	return c.JSON(http.StatusOK, toReleaseResponse(release))
}

// GetProjectReleases retrieves all releases for a project
func (h *ReleaseHandler) GetProjectReleases(c echo.Context) error {
	userID, err := GetUserIDFromContext(c)
	if err != nil {
		return err
	}

	projectID, err := strconv.Atoi(c.Param("projectId"))
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid project ID")
	}

	page, err := strconv.Atoi(c.QueryParam("page"))
	if err != nil || page < 1 {
		page = 1
	}

	pageSize, err := strconv.Atoi(c.QueryParam("pageSize"))
	if err != nil || pageSize < 1 {
		pageSize = 20
	}

	statusParam := c.QueryParam("status")
	var statuses []string
	if statusParam != "" {
		statuses = strings.Split(statusParam, ",")
	}

	releaseList, total, err := h.releaseService.GetProjectReleases(projectID, statuses, page, pageSize, userID)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}

	releasesResp := make([]ReleaseResponse, len(releaseList))
	for i, release := range releaseList {
		releasesResp[i] = toReleaseResponse(&release)
	}

	response := ReleasesListResponse{
		Releases: releasesResp,
		Total:    total,
		Page:     page,
		PageSize: pageSize,
	}

	return c.JSON(http.StatusOK, response)
}

// GetReleaseItems retrieves all items linked to a release
func (h *ReleaseHandler) GetReleaseItems(c echo.Context) error {
	userID, err := GetUserIDFromContext(c)
	if err != nil {
		return err
	}

	releaseID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid release ID")
	}

	items, err := h.releaseService.GetReleaseItems(releaseID, userID)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}

	itemResponses := make([]ReleaseItemResponse, len(items))
	for i, item := range items {
		itemResponses[i] = ReleaseItemResponse{
			ID:       item.ID,
			RefNum:   item.RefNum,
			Title:    item.Title,
			Status:   item.Status,
			ItemType: item.ItemType,
		}
	}

	return c.JSON(http.StatusOK, itemResponses)
}

// RegisterRoutes registers release-related routes
func (h *ReleaseHandler) RegisterRoutes(e *echo.Echo, authMiddleware *AuthMiddleware, projectMiddleware *ProjectMiddleware) {
	releasesGroup := e.Group("/api/projects/:projectId/releases", authMiddleware.RequireAuth, projectMiddleware.RequireProjectMember)

	releasesGroup.POST("", h.CreateRelease)
	releasesGroup.GET("", h.GetProjectReleases)
	releasesGroup.GET("/candidates", h.GetReleaseCandidateItems)

	releaseItem := e.Group("/api/releases/:id", authMiddleware.RequireAuth)

	releaseItem.GET("", h.GetRelease)
	releaseItem.PUT("", h.UpdateRelease)
	releaseItem.PATCH("/status", h.UpdateReleaseStatus)
	releaseItem.POST("/complete", h.CompleteRelease)
	releaseItem.GET("/items", h.GetReleaseItems)
	releaseItem.DELETE("", h.DeleteRelease)
}
