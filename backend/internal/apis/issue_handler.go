package apis

import (
	"net/http"
	"strconv"

	"github.com/dannyswat/pjeasy/internal/issues"
	"github.com/labstack/echo/v4"
)

type IssueHandler struct {
	issueService *issues.IssueService
}

func NewIssueHandler(issueService *issues.IssueService) *IssueHandler {
	return &IssueHandler{
		issueService: issueService,
	}
}

type CreateIssueRequest struct {
	Title       string `json:"title" validate:"required"`
	Description string `json:"description"`
	Priority    string `json:"priority"`
	AssignedTo  int    `json:"assignedTo"`
	SprintID    int    `json:"sprintId"`
	Points      int    `json:"points"`
	Tags        string `json:"tags"`
}

type UpdateIssueRequest struct {
	Title       string `json:"title" validate:"required"`
	Description string `json:"description"`
	Priority    string `json:"priority"`
	AssignedTo  int    `json:"assignedTo"`
	SprintID    int    `json:"sprintId"`
	Points      int    `json:"points"`
	Tags        string `json:"tags"`
}

type UpdateIssueStatusRequest struct {
	Status string `json:"status" validate:"required"`
}

type UpdateIssueAssigneeRequest struct {
	AssignedTo int `json:"assignedTo" validate:"required"`
}

type IssueResponse struct {
	ID          int    `json:"id"`
	RefNum      string `json:"refNum"`
	ProjectID   int    `json:"projectId"`
	Title       string `json:"title"`
	Description string `json:"description"`
	Status      string `json:"status"`
	Priority    string `json:"priority"`
	AssignedTo  int    `json:"assignedTo,omitempty"`
	SprintID    int    `json:"sprintId,omitempty"`
	Points      int    `json:"points"`
	Tags        string `json:"tags,omitempty"`
	CreatedBy   int    `json:"createdBy"`
	CreatedAt   string `json:"createdAt"`
	UpdatedAt   string `json:"updatedAt"`
}

type IssuesListResponse struct {
	Issues   []IssueResponse `json:"issues"`
	Total    int64           `json:"total"`
	Page     int             `json:"page"`
	PageSize int             `json:"pageSize"`
}

// toIssueResponse converts an issue model to response
func toIssueResponse(issue *issues.Issue) IssueResponse {
	return IssueResponse{
		ID:          issue.ID,
		RefNum:      issue.RefNum,
		ProjectID:   issue.ProjectID,
		Title:       issue.Title,
		Description: issue.Description,
		Status:      issue.Status,
		Priority:    issue.Priority,
		AssignedTo:  issue.AssignedTo,
		SprintID:    issue.SprintID,
		Points:      issue.Points,
		Tags:        issue.Tags,
		CreatedBy:   issue.CreatedBy,
		CreatedAt:   issue.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
		UpdatedAt:   issue.UpdatedAt.Format("2006-01-02T15:04:05Z07:00"),
	}
}

// CreateIssue creates a new issue
func (h *IssueHandler) CreateIssue(c echo.Context) error {
	userID, err := GetUserIDFromContext(c)
	if err != nil {
		return err
	}

	projectID, err := strconv.Atoi(c.Param("projectId"))
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid project ID")
	}

	req := new(CreateIssueRequest)
	if err := c.Bind(req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid request payload")
	}

	if err := c.Validate(req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}

	issue, err := h.issueService.CreateIssue(projectID, req.Title, req.Description, req.Priority, req.AssignedTo, req.SprintID, req.Points, req.Tags, userID)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}

	response := toIssueResponse(issue)
	return c.JSON(http.StatusCreated, response)
}

// UpdateIssue updates an issue
func (h *IssueHandler) UpdateIssue(c echo.Context) error {
	userID, err := GetUserIDFromContext(c)
	if err != nil {
		return err
	}

	issueID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid issue ID")
	}

	req := new(UpdateIssueRequest)
	if err := c.Bind(req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid request payload")
	}

	if err := c.Validate(req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}

	issue, err := h.issueService.UpdateIssue(issueID, req.Title, req.Description, req.Priority, req.AssignedTo, req.SprintID, req.Points, req.Tags, userID)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}

	response := toIssueResponse(issue)
	return c.JSON(http.StatusOK, response)
}

// UpdateIssueStatus updates an issue's status
func (h *IssueHandler) UpdateIssueStatus(c echo.Context) error {
	userID, err := GetUserIDFromContext(c)
	if err != nil {
		return err
	}

	issueID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid issue ID")
	}

	req := new(UpdateIssueStatusRequest)
	if err := c.Bind(req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid request payload")
	}

	if err := c.Validate(req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}

	issue, err := h.issueService.UpdateIssueStatus(issueID, req.Status, userID)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}

	response := toIssueResponse(issue)
	return c.JSON(http.StatusOK, response)
}

// UpdateIssueAssignee updates an issue's assignee
func (h *IssueHandler) UpdateIssueAssignee(c echo.Context) error {
	userID, err := GetUserIDFromContext(c)
	if err != nil {
		return err
	}

	issueID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid issue ID")
	}

	req := new(UpdateIssueAssigneeRequest)
	if err := c.Bind(req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid request payload")
	}

	if err := c.Validate(req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}

	issue, err := h.issueService.UpdateIssueAssignee(issueID, req.AssignedTo, userID)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}

	response := toIssueResponse(issue)
	return c.JSON(http.StatusOK, response)
}

// DeleteIssue deletes an issue
func (h *IssueHandler) DeleteIssue(c echo.Context) error {
	userID, err := GetUserIDFromContext(c)
	if err != nil {
		return err
	}

	issueID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid issue ID")
	}

	if err := h.issueService.DeleteIssue(issueID, userID); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}

	return c.JSON(http.StatusOK, map[string]string{"message": "Issue deleted successfully"})
}

// GetIssue retrieves a single issue
func (h *IssueHandler) GetIssue(c echo.Context) error {
	userID, err := GetUserIDFromContext(c)
	if err != nil {
		return err
	}

	issueID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid issue ID")
	}

	issue, err := h.issueService.GetIssue(issueID, userID)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}

	response := toIssueResponse(issue)
	return c.JSON(http.StatusOK, response)
}

// GetProjectIssues retrieves all issues for a project
func (h *IssueHandler) GetProjectIssues(c echo.Context) error {
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

	issueList, total, err := h.issueService.GetProjectIssues(projectID, status, priority, page, pageSize, userID)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}

	issuesResp := make([]IssueResponse, len(issueList))
	for i, issue := range issueList {
		issuesResp[i] = toIssueResponse(&issue)
	}

	response := IssuesListResponse{
		Issues:   issuesResp,
		Total:    total,
		Page:     page,
		PageSize: pageSize,
	}

	return c.JSON(http.StatusOK, response)
}

// GetMyIssues retrieves all issues assigned to the current user
func (h *IssueHandler) GetMyIssues(c echo.Context) error {
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

	issueList, total, err := h.issueService.GetMyIssues(projectID, userID, page, pageSize)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}

	issuesResp := make([]IssueResponse, len(issueList))
	for i, issue := range issueList {
		issuesResp[i] = toIssueResponse(&issue)
	}

	response := IssuesListResponse{
		Issues:   issuesResp,
		Total:    total,
		Page:     page,
		PageSize: pageSize,
	}

	return c.JSON(http.StatusOK, response)
}

// RegisterRoutes registers the issue routes
func (h *IssueHandler) RegisterRoutes(e *echo.Echo, authMiddleware *AuthMiddleware, projectMiddleware *ProjectMiddleware) {
	issuesGroup := e.Group("/api/projects/:projectId/issues", authMiddleware.RequireAuth, projectMiddleware.RequireProjectMember)

	issuesGroup.POST("", h.CreateIssue)
	issuesGroup.GET("", h.GetProjectIssues)
	issuesGroup.GET("/my-issues", h.GetMyIssues)

	issueItem := e.Group("/api/issues/:id", authMiddleware.RequireAuth)

	issueItem.GET("", h.GetIssue)
	issueItem.PUT("", h.UpdateIssue)
	issueItem.PATCH("/status", h.UpdateIssueStatus)
	issueItem.PATCH("/assignee", h.UpdateIssueAssignee)
	issueItem.DELETE("", h.DeleteIssue)
}
