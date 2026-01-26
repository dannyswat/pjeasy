package apis

import (
	"net/http"
	"strconv"
	"time"

	"github.com/dannyswat/pjeasy/internal/sprints"
	"github.com/dannyswat/pjeasy/internal/tasks"
	"github.com/labstack/echo/v4"
)

type SprintHandler struct {
	sprintService *sprints.SprintService
}

func NewSprintHandler(sprintService *sprints.SprintService) *SprintHandler {
	return &SprintHandler{
		sprintService: sprintService,
	}
}

type CreateSprintRequest struct {
	ProjectID   int     `json:"projectId" validate:"required"`
	Name        string  `json:"name" validate:"required,min=1,max=200"`
	Goal        string  `json:"goal"`
	StartDate   *string `json:"startDate"`
	EndDate     *string `json:"endDate"`
	MilestoneID *int    `json:"milestoneId"`
}

type UpdateSprintRequest struct {
	Name        string  `json:"name" validate:"required,min=1,max=200"`
	Goal        string  `json:"goal"`
	StartDate   *string `json:"startDate"`
	EndDate     *string `json:"endDate"`
	MilestoneID *int    `json:"milestoneId"`
}

type CloseSprintRequest struct {
	CreateNewSprint  bool    `json:"createNewSprint"`
	NewSprintName    string  `json:"newSprintName"`
	NewSprintGoal    string  `json:"newSprintGoal"`
	NewSprintEndDate *string `json:"newSprintEndDate"`
}

type AddTaskToSprintRequest struct {
	TaskID int `json:"taskId" validate:"required"`
}

type SprintResponse struct {
	ID          int       `json:"id"`
	ProjectID   int       `json:"projectId"`
	Name        string    `json:"name"`
	Goal        string    `json:"goal"`
	StartDate   *string   `json:"startDate"`
	EndDate     *string   `json:"endDate"`
	MilestoneID *int      `json:"milestoneId"`
	Status      string    `json:"status"`
	CreatedBy   int       `json:"createdBy"`
	CreatedAt   time.Time `json:"createdAt"`
	UpdatedAt   time.Time `json:"updatedAt"`
}

type SprintListResponse struct {
	Sprints []SprintResponse `json:"sprints"`
	Total   int64            `json:"total"`
	Page    int              `json:"page"`
	Size    int              `json:"size"`
}

type CloseSprintResponse struct {
	ClosedSprint *SprintResponse `json:"closedSprint"`
	NewSprint    *SprintResponse `json:"newSprint,omitempty"`
}

type SprintBoardResponse struct {
	Sprint        SprintResponse            `json:"sprint"`
	TasksByStatus map[string][]TaskResponse `json:"tasksByStatus"`
}

type SprintSwimlaneResponse struct {
	Sprint          SprintResponse         `json:"sprint"`
	TasksByAssignee map[int][]TaskResponse `json:"tasksByAssignee"`
	UnassignedTasks []TaskResponse         `json:"unassignedTasks"`
}

func toSprintResponse(sprint *sprints.Sprint) SprintResponse {
	var startDate *string
	if sprint.StartDate != nil {
		startDateStr := sprint.StartDate.Format("2006-01-02")
		startDate = &startDateStr
	}

	var endDate *string
	if sprint.EndDate != nil {
		endDateStr := sprint.EndDate.Format("2006-01-02")
		endDate = &endDateStr
	}

	return SprintResponse{
		ID:          sprint.ID,
		ProjectID:   sprint.ProjectID,
		Name:        sprint.Name,
		Goal:        sprint.Goal,
		StartDate:   startDate,
		EndDate:     endDate,
		MilestoneID: sprint.MilestoneID,
		Status:      sprint.Status,
		CreatedBy:   sprint.CreatedBy,
		CreatedAt:   sprint.CreatedAt,
		UpdatedAt:   sprint.UpdatedAt,
	}
}

func toSprintListResponse(sprintList []sprints.Sprint, total int64, page, size int) SprintListResponse {
	sprintResponses := make([]SprintResponse, len(sprintList))
	for i, sprint := range sprintList {
		sprintResponses[i] = toSprintResponse(&sprint)
	}

	return SprintListResponse{
		Sprints: sprintResponses,
		Total:   total,
		Page:    page,
		Size:    size,
	}
}

func tasksToTaskResponses(taskList []tasks.Task) []TaskResponse {
	taskResponses := make([]TaskResponse, len(taskList))
	for i, task := range taskList {
		taskResponses[i] = toTaskResponse(&task)
	}
	return taskResponses
}

// RegisterRoutes registers sprint routes
func (h *SprintHandler) RegisterRoutes(e *echo.Echo, authMiddleware *AuthMiddleware, projectMiddleware *ProjectMiddleware) {
	sprintGroup := e.Group("/api/sprints", authMiddleware.RequireAuth)
	sprintGroup.POST("", h.CreateSprint)
	sprintGroup.GET("", h.GetProjectSprints)
	sprintGroup.GET("/active", h.GetActiveSprint)
	sprintGroup.GET("/:id", h.GetSprint)
	sprintGroup.PUT("/:id", h.UpdateSprint)
	sprintGroup.DELETE("/:id", h.DeleteSprint)
	sprintGroup.POST("/:id/start", h.StartSprint)
	sprintGroup.POST("/:id/close", h.CloseSprint)
	sprintGroup.GET("/:id/tasks", h.GetSprintTasks)
	sprintGroup.POST("/:id/tasks", h.AddTaskToSprint)
	sprintGroup.DELETE("/:id/tasks/:taskId", h.RemoveTaskFromSprint)
	sprintGroup.GET("/:id/board", h.GetSprintBoard)
	sprintGroup.GET("/:id/swimlane", h.GetSprintSwimlane)
}

// CreateSprint creates a new sprint
func (h *SprintHandler) CreateSprint(c echo.Context) error {
	req := new(CreateSprintRequest)
	if err := c.Bind(req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid request")
	}

	if err := c.Validate(req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}

	userID, err := GetUserIDFromContext(c)
	if err != nil {
		return err
	}

	var startDate *time.Time
	if req.StartDate != nil && *req.StartDate != "" {
		t, err := time.Parse("2006-01-02", *req.StartDate)
		if err != nil {
			return echo.NewHTTPError(http.StatusBadRequest, "Invalid start date format")
		}
		startDate = &t
	}

	var endDate *time.Time
	if req.EndDate != nil && *req.EndDate != "" {
		t, err := time.Parse("2006-01-02", *req.EndDate)
		if err != nil {
			return echo.NewHTTPError(http.StatusBadRequest, "Invalid end date format")
		}
		endDate = &t
	}

	sprint, err := h.sprintService.CreateSprint(
		req.ProjectID,
		req.Name,
		req.Goal,
		startDate,
		endDate,
		req.MilestoneID,
		userID,
	)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, err.Error())
	}

	return c.JSON(http.StatusCreated, toSprintResponse(sprint))
}

// UpdateSprint updates a sprint
func (h *SprintHandler) UpdateSprint(c echo.Context) error {
	sprintID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid sprint ID")
	}

	req := new(UpdateSprintRequest)
	if err := c.Bind(req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid request")
	}

	if err := c.Validate(req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}

	userID, err := GetUserIDFromContext(c)
	if err != nil {
		return err
	}

	var startDate *time.Time
	if req.StartDate != nil && *req.StartDate != "" {
		t, err := time.Parse("2006-01-02", *req.StartDate)
		if err != nil {
			return echo.NewHTTPError(http.StatusBadRequest, "Invalid start date format")
		}
		startDate = &t
	}

	var endDate *time.Time
	if req.EndDate != nil && *req.EndDate != "" {
		t, err := time.Parse("2006-01-02", *req.EndDate)
		if err != nil {
			return echo.NewHTTPError(http.StatusBadRequest, "Invalid end date format")
		}
		endDate = &t
	}

	sprint, err := h.sprintService.UpdateSprint(
		sprintID,
		req.Name,
		req.Goal,
		startDate,
		endDate,
		req.MilestoneID,
		userID,
	)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, err.Error())
	}

	return c.JSON(http.StatusOK, toSprintResponse(sprint))
}

// StartSprint starts a sprint
func (h *SprintHandler) StartSprint(c echo.Context) error {
	sprintID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid sprint ID")
	}

	userID, err := GetUserIDFromContext(c)
	if err != nil {
		return err
	}

	sprint, err := h.sprintService.StartSprint(sprintID, userID)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, err.Error())
	}

	return c.JSON(http.StatusOK, toSprintResponse(sprint))
}

// CloseSprint closes a sprint
func (h *SprintHandler) CloseSprint(c echo.Context) error {
	sprintID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid sprint ID")
	}

	req := new(CloseSprintRequest)
	if err := c.Bind(req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid request")
	}

	userID, err := GetUserIDFromContext(c)
	if err != nil {
		return err
	}

	var newSprintEndDate *time.Time
	if req.NewSprintEndDate != nil && *req.NewSprintEndDate != "" {
		t, err := time.Parse("2006-01-02", *req.NewSprintEndDate)
		if err != nil {
			return echo.NewHTTPError(http.StatusBadRequest, "Invalid new sprint end date format")
		}
		newSprintEndDate = &t
	}

	closedSprint, newSprint, err := h.sprintService.CloseSprint(
		sprintID,
		req.CreateNewSprint,
		req.NewSprintName,
		req.NewSprintGoal,
		newSprintEndDate,
		userID,
	)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, err.Error())
	}

	response := CloseSprintResponse{
		ClosedSprint: nil,
	}
	if closedSprint != nil {
		closedSprintResp := toSprintResponse(closedSprint)
		response.ClosedSprint = &closedSprintResp
	}
	if newSprint != nil {
		newSprintResp := toSprintResponse(newSprint)
		response.NewSprint = &newSprintResp
	}

	return c.JSON(http.StatusOK, response)
}

// DeleteSprint deletes a sprint
func (h *SprintHandler) DeleteSprint(c echo.Context) error {
	sprintID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid sprint ID")
	}

	userID, err := GetUserIDFromContext(c)
	if err != nil {
		return err
	}

	if err := h.sprintService.DeleteSprint(sprintID, userID); err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, err.Error())
	}

	return c.NoContent(http.StatusNoContent)
}

// GetSprint retrieves a single sprint
func (h *SprintHandler) GetSprint(c echo.Context) error {
	sprintID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid sprint ID")
	}

	userID, err := GetUserIDFromContext(c)
	if err != nil {
		return err
	}

	sprint, err := h.sprintService.GetSprint(sprintID, userID)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, err.Error())
	}

	return c.JSON(http.StatusOK, toSprintResponse(sprint))
}

// GetProjectSprints retrieves all sprints for a project
func (h *SprintHandler) GetProjectSprints(c echo.Context) error {
	projectIDStr := c.QueryParam("projectId")
	if projectIDStr == "" {
		return echo.NewHTTPError(http.StatusBadRequest, "projectId is required")
	}

	projectID, err := strconv.Atoi(projectIDStr)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid project ID")
	}

	page, _ := strconv.Atoi(c.QueryParam("page"))
	if page < 1 {
		page = 1
	}

	pageSize, _ := strconv.Atoi(c.QueryParam("pageSize"))
	if pageSize < 1 || pageSize > 100 {
		pageSize = 20
	}

	userID, err := GetUserIDFromContext(c)
	if err != nil {
		return err
	}

	sprintList, total, err := h.sprintService.GetProjectSprints(projectID, page, pageSize, userID)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, err.Error())
	}

	return c.JSON(http.StatusOK, toSprintListResponse(sprintList, total, page, pageSize))
}

// GetActiveSprint retrieves the active sprint for a project
func (h *SprintHandler) GetActiveSprint(c echo.Context) error {
	projectIDStr := c.QueryParam("projectId")
	if projectIDStr == "" {
		return echo.NewHTTPError(http.StatusBadRequest, "projectId is required")
	}

	projectID, err := strconv.Atoi(projectIDStr)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid project ID")
	}

	userID, err := GetUserIDFromContext(c)
	if err != nil {
		return err
	}

	sprint, err := h.sprintService.GetActiveSprint(projectID, userID)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, err.Error())
	}

	if sprint == nil {
		return c.JSON(http.StatusOK, nil)
	}

	return c.JSON(http.StatusOK, toSprintResponse(sprint))
}

// GetSprintTasks retrieves all tasks for a sprint
func (h *SprintHandler) GetSprintTasks(c echo.Context) error {
	sprintID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid sprint ID")
	}

	page, _ := strconv.Atoi(c.QueryParam("page"))
	if page < 1 {
		page = 1
	}

	pageSize, _ := strconv.Atoi(c.QueryParam("pageSize"))
	if pageSize < 1 || pageSize > 100 {
		pageSize = 20
	}

	userID, err := GetUserIDFromContext(c)
	if err != nil {
		return err
	}

	taskList, total, err := h.sprintService.GetSprintTasks(sprintID, page, pageSize, userID)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, err.Error())
	}

	return c.JSON(http.StatusOK, toTaskListResponse(taskList, total, page, pageSize))
}

// AddTaskToSprint adds a task to a sprint
func (h *SprintHandler) AddTaskToSprint(c echo.Context) error {
	sprintID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid sprint ID")
	}

	req := new(AddTaskToSprintRequest)
	if err := c.Bind(req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid request")
	}

	if err := c.Validate(req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}

	userID, err := GetUserIDFromContext(c)
	if err != nil {
		return err
	}

	task, err := h.sprintService.AddTaskToSprint(req.TaskID, sprintID, userID)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, err.Error())
	}

	return c.JSON(http.StatusOK, toTaskResponse(task))
}

// RemoveTaskFromSprint removes a task from a sprint
func (h *SprintHandler) RemoveTaskFromSprint(c echo.Context) error {
	taskID, err := strconv.Atoi(c.Param("taskId"))
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid task ID")
	}

	userID, err := GetUserIDFromContext(c)
	if err != nil {
		return err
	}

	task, err := h.sprintService.RemoveTaskFromSprint(taskID, userID)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, err.Error())
	}

	return c.JSON(http.StatusOK, toTaskResponse(task))
}

// GetSprintBoard retrieves tasks grouped by status for board view
func (h *SprintHandler) GetSprintBoard(c echo.Context) error {
	sprintID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid sprint ID")
	}

	userID, err := GetUserIDFromContext(c)
	if err != nil {
		return err
	}

	sprint, err := h.sprintService.GetSprint(sprintID, userID)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, err.Error())
	}

	tasksByStatus, err := h.sprintService.GetSprintTasksByStatus(sprintID, userID)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, err.Error())
	}

	// Convert tasks to response format
	tasksByStatusResponse := make(map[string][]TaskResponse)
	for status, taskList := range tasksByStatus {
		tasksByStatusResponse[status] = tasksToTaskResponses(taskList)
	}

	return c.JSON(http.StatusOK, SprintBoardResponse{
		Sprint:        toSprintResponse(sprint),
		TasksByStatus: tasksByStatusResponse,
	})
}

// GetSprintSwimlane retrieves tasks grouped by assignee for swimlane view
func (h *SprintHandler) GetSprintSwimlane(c echo.Context) error {
	sprintID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid sprint ID")
	}

	userID, err := GetUserIDFromContext(c)
	if err != nil {
		return err
	}

	sprint, err := h.sprintService.GetSprint(sprintID, userID)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, err.Error())
	}

	tasksByAssignee, unassignedTasks, err := h.sprintService.GetSprintTasksByAssignee(sprintID, userID)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, err.Error())
	}

	// Convert tasks to response format
	tasksByAssigneeResponse := make(map[int][]TaskResponse)
	for assigneeID, taskList := range tasksByAssignee {
		tasksByAssigneeResponse[assigneeID] = tasksToTaskResponses(taskList)
	}

	return c.JSON(http.StatusOK, SprintSwimlaneResponse{
		Sprint:          toSprintResponse(sprint),
		TasksByAssignee: tasksByAssigneeResponse,
		UnassignedTasks: tasksToTaskResponses(unassignedTasks),
	})
}
