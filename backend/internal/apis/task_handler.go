package apis

import (
	"net/http"
	"strconv"
	"time"

	"github.com/dannyswat/pjeasy/internal/tasks"
	"github.com/labstack/echo/v4"
)

type TaskHandler struct {
	taskService *tasks.TaskService
}

func NewTaskHandler(taskService *tasks.TaskService) *TaskHandler {
	return &TaskHandler{
		taskService: taskService,
	}
}

type CreateTaskRequest struct {
	ProjectID      int     `json:"projectId" validate:"required"`
	Title          string  `json:"title" validate:"required,min=1,max=200"`
	Description    string  `json:"description"`
	Status         string  `json:"status" validate:"omitempty,oneof='Open' 'In Progress' 'On Hold' 'Blocked' 'Completed' 'Closed'"`
	Priority       string  `json:"priority" validate:"omitempty,oneof=Immediate Urgent High Normal Low"`
	EstimatedHours float64 `json:"estimatedHours" validate:"gte=0"`
	AssigneeID     *int    `json:"assigneeId"`
	Deadline       *string `json:"deadline"`
	SprintID       *int    `json:"sprintId"`
	ItemType       string  `json:"itemType"`
	ItemID         *int    `json:"itemId"`
	Tags           string  `json:"tags"`
}

type UpdateTaskRequest struct {
	Title          string  `json:"title" validate:"required,min=1,max=200"`
	Description    string  `json:"description"`
	Priority       string  `json:"priority" validate:"omitempty,oneof=Immediate Urgent High Normal Low"`
	EstimatedHours float64 `json:"estimatedHours" validate:"gte=0"`
	AssigneeID     *int    `json:"assigneeId"`
	Deadline       *string `json:"deadline"`
	SprintID       *int    `json:"sprintId"`
	Tags           string  `json:"tags"`
}

type UpdateTaskStatusRequest struct {
	Status string `json:"status" validate:"required,oneof='Open' 'In Progress' 'On Hold' 'Blocked' 'Completed' 'Closed'"`
}

type UpdateTaskAssigneeRequest struct {
	AssigneeID *int `json:"assigneeId"`
}

type TaskResponse struct {
	ID int `json:"id"`

	ProjectID      int       `json:"projectId"`
	Title          string    `json:"title"`
	Description    string    `json:"description"`
	Status         string    `json:"status"`
	Priority       string    `json:"priority"`
	EstimatedHours float64   `json:"estimatedHours"`
	AssigneeID     *int      `json:"assigneeId"`
	Deadline       *string   `json:"deadline"`
	SprintID       *int      `json:"sprintId"`
	ItemType       string    `json:"itemType"`
	ItemID         *int      `json:"itemId"`
	Tags           string    `json:"tags"`
	CreatedBy      int       `json:"createdBy"`
	CreatedAt      time.Time `json:"createdAt"`
	UpdatedAt      time.Time `json:"updatedAt"`
}

type TaskListResponse struct {
	Tasks []TaskResponse `json:"tasks"`
	Total int64          `json:"total"`
	Page  int            `json:"page"`
	Size  int            `json:"size"`
}

func toTaskResponse(task *tasks.Task) TaskResponse {
	var deadline *string
	if task.Deadline != nil {
		deadlineStr := task.Deadline.Format("2006-01-02")
		deadline = &deadlineStr
	}

	return TaskResponse{
		ID:             task.ID,
		ProjectID:      task.ProjectID,
		Title:          task.Title,
		Description:    task.Description,
		Status:         task.Status,
		Priority:       task.Priority,
		EstimatedHours: task.EstimatedHours,
		AssigneeID:     task.AssigneeID,
		Deadline:       deadline,
		SprintID:       task.SprintID,
		ItemType:       task.ItemType,
		ItemID:         task.ItemID,
		Tags:           task.Tags,
		CreatedBy:      task.CreatedBy,
		CreatedAt:      task.CreatedAt,
		UpdatedAt:      task.UpdatedAt,
	}
}

func toTaskListResponse(taskList []tasks.Task, total int64, page, size int) TaskListResponse {
	tasks := make([]TaskResponse, len(taskList))
	for i, task := range taskList {
		tasks[i] = toTaskResponse(&task)
	}

	return TaskListResponse{
		Tasks: tasks,
		Total: total,
		Page:  page,
		Size:  size,
	}
}

// CreateTask creates a new task
func (h *TaskHandler) CreateTask(c echo.Context) error {
	req := new(CreateTaskRequest)
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

	var deadline *time.Time
	if req.Deadline != nil && *req.Deadline != "" {
		t, err := time.Parse("2006-01-02", *req.Deadline)
		if err != nil {
			return echo.NewHTTPError(http.StatusBadRequest, "Invalid deadline format")
		}
		deadline = &t
	}

	task, err := h.taskService.CreateTask(
		req.ProjectID,
		req.Title,
		req.Description,
		req.Status,
		req.Priority,
		req.Tags,
		req.EstimatedHours,
		req.AssigneeID,
		deadline,
		req.SprintID,
		req.ItemType,
		req.ItemID,
		userID,
	)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, err.Error())
	}

	return c.JSON(http.StatusCreated, toTaskResponse(task))
}

// UpdateTask updates a task
func (h *TaskHandler) UpdateTask(c echo.Context) error {
	taskID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid task ID")
	}

	req := new(UpdateTaskRequest)
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

	var deadline *time.Time
	if req.Deadline != nil && *req.Deadline != "" {
		t, err := time.Parse("2006-01-02", *req.Deadline)
		if err != nil {
			return echo.NewHTTPError(http.StatusBadRequest, "Invalid deadline format")
		}
		deadline = &t
	}

	task, err := h.taskService.UpdateTask(
		taskID,
		req.Title,
		req.Description,
		req.Priority,
		req.Tags,
		req.EstimatedHours,
		req.AssigneeID,
		deadline,
		req.SprintID,
		userID,
	)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, err.Error())
	}

	return c.JSON(http.StatusOK, toTaskResponse(task))
}

// UpdateTaskStatus updates a task's status
func (h *TaskHandler) UpdateTaskStatus(c echo.Context) error {
	taskID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid task ID")
	}

	req := new(UpdateTaskStatusRequest)
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

	task, err := h.taskService.UpdateTaskStatus(taskID, req.Status, userID)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, err.Error())
	}

	return c.JSON(http.StatusOK, toTaskResponse(task))
}

// UpdateTaskAssignee updates a task's assignee
func (h *TaskHandler) UpdateTaskAssignee(c echo.Context) error {
	taskID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid task ID")
	}

	req := new(UpdateTaskAssigneeRequest)
	if err := c.Bind(req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid request")
	}

	userID, err := GetUserIDFromContext(c)
	if err != nil {
		return err
	}

	task, err := h.taskService.UpdateTaskAssignee(taskID, req.AssigneeID, userID)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, err.Error())
	}

	return c.JSON(http.StatusOK, toTaskResponse(task))
}

// DeleteTask deletes a task
func (h *TaskHandler) DeleteTask(c echo.Context) error {
	taskID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid task ID")
	}

	userID, err := GetUserIDFromContext(c)
	if err != nil {
		return err
	}

	if err := h.taskService.DeleteTask(taskID, userID); err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, err.Error())
	}

	return c.NoContent(http.StatusNoContent)
}

// GetTask retrieves a single task
func (h *TaskHandler) GetTask(c echo.Context) error {
	taskID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid task ID")
	}

	userID, err := GetUserIDFromContext(c)
	if err != nil {
		return err
	}

	task, err := h.taskService.GetTask(taskID, userID)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, err.Error())
	}

	return c.JSON(http.StatusOK, toTaskResponse(task))
}

// GetProjectTasks retrieves tasks for a project
func (h *TaskHandler) GetProjectTasks(c echo.Context) error {
	projectID, err := strconv.Atoi(c.Param("projectId"))
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid project ID")
	}

	page := 1
	if p := c.QueryParam("page"); p != "" {
		page, err = strconv.Atoi(p)
		if err != nil || page < 1 {
			return echo.NewHTTPError(http.StatusBadRequest, "Invalid page number")
		}
	}

	pageSize := 20
	if ps := c.QueryParam("pageSize"); ps != "" {
		pageSize, err = strconv.Atoi(ps)
		if err != nil || pageSize < 1 || pageSize > 100 {
			return echo.NewHTTPError(http.StatusBadRequest, "Invalid page size")
		}
	}

	status := c.QueryParam("status")

	userID, err := GetUserIDFromContext(c)
	if err != nil {
		return err
	}

	taskList, total, err := h.taskService.GetProjectTasks(projectID, status, page, pageSize, userID)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, err.Error())
	}

	return c.JSON(http.StatusOK, toTaskListResponse(taskList, total, page, pageSize))
}

// GetMyTasks retrieves tasks assigned to the current user
func (h *TaskHandler) GetMyTasks(c echo.Context) error {
	page := 1
	var err error
	if p := c.QueryParam("page"); p != "" {
		page, err = strconv.Atoi(p)
		if err != nil || page < 1 {
			return echo.NewHTTPError(http.StatusBadRequest, "Invalid page number")
		}
	}

	pageSize := 20
	if ps := c.QueryParam("pageSize"); ps != "" {
		pageSize, err = strconv.Atoi(ps)
		if err != nil || pageSize < 1 || pageSize > 100 {
			return echo.NewHTTPError(http.StatusBadRequest, "Invalid page size")
		}
	}

	userID, err := GetUserIDFromContext(c)
	if err != nil {
		return err
	}

	taskList, total, err := h.taskService.GetMyTasks(page, pageSize, userID)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, err.Error())
	}

	return c.JSON(http.StatusOK, toTaskListResponse(taskList, total, page, pageSize))
}

// GetTasksByItemReference retrieves tasks linked to a specific item (e.g., idea)
func (h *TaskHandler) GetTasksByItemReference(c echo.Context) error {
	projectID, err := strconv.Atoi(c.Param("projectId"))
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid project ID")
	}

	itemType := c.QueryParam("itemType")
	if itemType == "" {
		return echo.NewHTTPError(http.StatusBadRequest, "itemType is required")
	}

	itemIDStr := c.QueryParam("itemId")
	if itemIDStr == "" {
		return echo.NewHTTPError(http.StatusBadRequest, "itemId is required")
	}

	itemID, err := strconv.Atoi(itemIDStr)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid item ID")
	}

	page := 1
	if p := c.QueryParam("page"); p != "" {
		page, err = strconv.Atoi(p)
		if err != nil || page < 1 {
			return echo.NewHTTPError(http.StatusBadRequest, "Invalid page number")
		}
	}

	pageSize := 20
	if ps := c.QueryParam("pageSize"); ps != "" {
		pageSize, err = strconv.Atoi(ps)
		if err != nil || pageSize < 1 || pageSize > 100 {
			return echo.NewHTTPError(http.StatusBadRequest, "Invalid page size")
		}
	}

	userID, err := GetUserIDFromContext(c)
	if err != nil {
		return err
	}

	taskList, total, err := h.taskService.GetTasksByItemReference(projectID, itemType, itemID, page, pageSize, userID)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, err.Error())
	}

	return c.JSON(http.StatusOK, toTaskListResponse(taskList, total, page, pageSize))
}

// RegisterRoutes registers task-related routes
func (h *TaskHandler) RegisterRoutes(e *echo.Echo, authMiddleware *AuthMiddleware, projectMiddleware *ProjectMiddleware) {
	tasks := e.Group("/api/projects/:projectId/tasks", authMiddleware.RequireAuth, projectMiddleware.RequireProjectMember)

	tasks.POST("", h.CreateTask)
	tasks.GET("", h.GetProjectTasks)
	tasks.GET("/by-item", h.GetTasksByItemReference)

	taskItem := e.Group("/api/tasks/:id", authMiddleware.RequireAuth)

	taskItem.GET("", h.GetTask)
	taskItem.PUT("", h.UpdateTask)
	taskItem.PATCH("/status", h.UpdateTaskStatus)
	taskItem.PATCH("/assignee", h.UpdateTaskAssignee)
	taskItem.DELETE("", h.DeleteTask)

	// My tasks endpoint
	e.GET("/api/tasks/my", h.GetMyTasks, authMiddleware.RequireAuth)
}
