package apis

import (
	"net/http"
	"strconv"

	"github.com/dannyswat/pjeasy/internal/features"
	"github.com/dannyswat/pjeasy/internal/issues"
	"github.com/dannyswat/pjeasy/internal/projects"
	"github.com/dannyswat/pjeasy/internal/service_tickets"
	"github.com/dannyswat/pjeasy/internal/sprints"
	"github.com/dannyswat/pjeasy/internal/tasks"
	"github.com/labstack/echo/v4"
)

type DashboardHandler struct {
	projectService       *projects.ProjectService
	taskService          *tasks.TaskService
	issueService         *issues.IssueService
	featureService       *features.FeatureService
	serviceTicketService *service_tickets.ServiceTicketService
	sprintService        *sprints.SprintService
}

func NewDashboardHandler(
	projectService *projects.ProjectService,
	taskService *tasks.TaskService,
	issueService *issues.IssueService,
	featureService *features.FeatureService,
	serviceTicketService *service_tickets.ServiceTicketService,
	sprintService *sprints.SprintService,
) *DashboardHandler {
	return &DashboardHandler{
		projectService:       projectService,
		taskService:          taskService,
		issueService:         issueService,
		featureService:       featureService,
		serviceTicketService: serviceTicketService,
		sprintService:        sprintService,
	}
}

// MemberDashboardResponse represents the member dashboard data
type MemberDashboardResponse struct {
	Tasks    []TaskResponse    `json:"tasks"`
	Issues   []IssueResponse   `json:"issues"`
	Features []FeatureResponse `json:"features"`
}

// ManagerDashboardResponse represents the manager dashboard data
type ManagerDashboardResponse struct {
	SprintTaskStats    *SprintTaskStats    `json:"sprintTaskStats"`
	ServiceTicketStats *ServiceTicketStats `json:"serviceTicketStats"`
	IsManager          bool                `json:"isManager"`
}

// SprintTaskStats represents task statistics for the active sprint
type SprintTaskStats struct {
	SprintID      int            `json:"sprintId"`
	SprintName    string         `json:"sprintName"`
	TasksByStatus map[string]int `json:"tasksByStatus"`
	TotalTasks    int            `json:"totalTasks"`
}

// ServiceTicketStats represents service ticket statistics
type ServiceTicketStats struct {
	NewCount  int `json:"newCount"`
	OpenCount int `json:"openCount"`
}

// RegisterRoutes registers dashboard routes
func (h *DashboardHandler) RegisterRoutes(e *echo.Echo, authMiddleware *AuthMiddleware, projectMiddleware *ProjectMiddleware) {
	dashboardGroup := e.Group("/api/projects/:projectId/dashboard", authMiddleware.RequireAuth, projectMiddleware.RequireProjectMember)
	dashboardGroup.GET("/member", h.GetMemberDashboard)
	dashboardGroup.GET("/manager", h.GetManagerDashboard)
}

// GetMemberDashboard returns dashboard data for team members
func (h *DashboardHandler) GetMemberDashboard(c echo.Context) error {
	projectID, err := strconv.Atoi(c.Param("projectId"))
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid project ID")
	}

	userID, err := GetUserIDFromContext(c)
	if err != nil {
		return err
	}

	// Get assigned tasks sorted by deadline (closest first)
	assignedTasks, err := h.taskService.GetTasksByAssigneeOrderByDeadline(projectID, userID, 10)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "Failed to fetch assigned tasks")
	}

	// Get assigned issues
	assignedIssues, err := h.issueService.GetIssuesByAssignee(projectID, userID, 10)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "Failed to fetch assigned issues")
	}

	// Get assigned features
	assignedFeatures, err := h.featureService.GetFeaturesByAssignee(projectID, userID, 10)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "Failed to fetch assigned features")
	}

	// Convert to responses
	taskResponses := make([]TaskResponse, len(assignedTasks))
	for i, task := range assignedTasks {
		taskResponses[i] = toTaskResponse(&task)
	}

	issueResponses := make([]IssueResponse, len(assignedIssues))
	for i, issue := range assignedIssues {
		issueResponses[i] = toIssueResponse(&issue)
	}

	featureResponses := make([]FeatureResponse, len(assignedFeatures))
	for i, feature := range assignedFeatures {
		featureResponses[i] = toFeatureResponse(&feature)
	}

	return c.JSON(http.StatusOK, MemberDashboardResponse{
		Tasks:    taskResponses,
		Issues:   issueResponses,
		Features: featureResponses,
	})
}

// GetManagerDashboard returns dashboard data for managers
func (h *DashboardHandler) GetManagerDashboard(c echo.Context) error {
	projectID, err := strconv.Atoi(c.Param("projectId"))
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid project ID")
	}

	userID, err := GetUserIDFromContext(c)
	if err != nil {
		return err
	}

	// Check if user is a manager (admin)
	isManager, err := h.projectService.IsUserProjectAdmin(projectID, userID)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "Failed to check user role")
	}

	var sprintStats *SprintTaskStats
	var ticketStats *ServiceTicketStats

	// Get sprint task statistics
	activeSprint, err := h.sprintService.GetActiveSprint(projectID, userID)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "Failed to fetch active sprint")
	}

	if activeSprint != nil {
		tasksByStatus, err := h.sprintService.GetSprintTasksByStatus(activeSprint.ID, userID)
		if err != nil {
			return echo.NewHTTPError(http.StatusInternalServerError, "Failed to fetch sprint tasks")
		}

		statusCounts := make(map[string]int)
		totalTasks := 0
		for status, taskList := range tasksByStatus {
			statusCounts[status] = len(taskList)
			totalTasks += len(taskList)
		}

		sprintStats = &SprintTaskStats{
			SprintID:      activeSprint.ID,
			SprintName:    activeSprint.Name,
			TasksByStatus: statusCounts,
			TotalTasks:    totalTasks,
		}
	}

	// Get service ticket statistics
	newCount, err := h.serviceTicketService.CountByStatus(projectID, "New")
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "Failed to count new tickets")
	}

	openCount, err := h.serviceTicketService.CountByStatus(projectID, "Open")
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "Failed to count open tickets")
	}

	ticketStats = &ServiceTicketStats{
		NewCount:  newCount,
		OpenCount: openCount,
	}

	return c.JSON(http.StatusOK, ManagerDashboardResponse{
		SprintTaskStats:    sprintStats,
		ServiceTicketStats: ticketStats,
		IsManager:          isManager,
	})
}
