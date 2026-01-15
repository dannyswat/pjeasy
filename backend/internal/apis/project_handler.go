package apis

import (
	"net/http"
	"strconv"

	"github.com/dannyswat/pjeasy/internal/projects"
	"github.com/labstack/echo/v4"
)

type ProjectHandler struct {
	projectService *projects.ProjectService
}

func NewProjectHandler(projectService *projects.ProjectService) *ProjectHandler {
	return &ProjectHandler{
		projectService: projectService,
	}
}

type CreateProjectRequest struct {
	Name        string `json:"name" validate:"required"`
	Description string `json:"description"`
}

type UpdateProjectRequest struct {
	Name        string `json:"name" validate:"required"`
	Description string `json:"description"`
}

type AddMemberRequest struct {
	LoginID string `json:"loginId" validate:"required"`
	IsAdmin bool   `json:"isAdmin"`
}

type UpdateMemberRoleRequest struct {
	IsAdmin bool `json:"isAdmin"`
}

type ProjectResponse struct {
	ID          int    `json:"id"`
	Name        string `json:"name"`
	Description string `json:"description"`
	IsArchived  bool   `json:"isArchived"`
	CreatedBy   int    `json:"createdBy"`
	CreatedAt   string `json:"createdAt"`
	UpdatedAt   string `json:"updatedAt"`
	ArchivedAt  string `json:"archivedAt,omitempty"`
}

type MemberResponse struct {
	ID        int          `json:"id"`
	ProjectID int          `json:"projectId"`
	UserID    int          `json:"userId"`
	User      UserResponse `json:"user"`
	IsAdmin   bool         `json:"isAdmin"`
	AddedAt   string       `json:"addedAt"`
}

type ProjectWithMembersResponse struct {
	Project ProjectResponse  `json:"project"`
	Members []MemberResponse `json:"members"`
}

// CreateProject creates a new project
func (h *ProjectHandler) CreateProject(c echo.Context) error {
	userID, ok := c.Get("user_id").(int)
	if !ok {
		return echo.NewHTTPError(http.StatusUnauthorized, "User not authenticated")
	}

	req := new(CreateProjectRequest)
	if err := c.Bind(req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid request payload")
	}

	if err := c.Validate(req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}

	project, err := h.projectService.CreateProject(req.Name, req.Description, userID)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}

	response := ProjectResponse{
		ID:          project.ID,
		Name:        project.Name,
		Description: project.Description,
		IsArchived:  project.IsArchived,
		CreatedBy:   project.CreatedBy,
		CreatedAt:   project.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
		UpdatedAt:   project.UpdatedAt.Format("2006-01-02T15:04:05Z07:00"),
	}

	return c.JSON(http.StatusCreated, response)
}

// UpdateProject updates a project
func (h *ProjectHandler) UpdateProject(c echo.Context) error {
	userID, ok := c.Get("user_id").(int)
	if !ok {
		return echo.NewHTTPError(http.StatusUnauthorized, "User not authenticated")
	}

	projectIDStr := c.Param("id")
	projectID, err := strconv.Atoi(projectIDStr)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid project ID")
	}

	req := new(UpdateProjectRequest)
	if err := c.Bind(req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid request payload")
	}

	if err := c.Validate(req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}

	project, err := h.projectService.UpdateProject(projectID, req.Name, req.Description, userID)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}

	response := ProjectResponse{
		ID:          project.ID,
		Name:        project.Name,
		Description: project.Description,
		IsArchived:  project.IsArchived,
		CreatedBy:   project.CreatedBy,
		CreatedAt:   project.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
		UpdatedAt:   project.UpdatedAt.Format("2006-01-02T15:04:05Z07:00"),
	}

	return c.JSON(http.StatusOK, response)
}

// GetProject returns a single project with members
func (h *ProjectHandler) GetProject(c echo.Context) error {
	projectIDStr := c.Param("id")
	projectID, err := strconv.Atoi(projectIDStr)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid project ID")
	}

	projectWithMembers, err := h.projectService.GetProjectWithMembers(projectID)
	if err != nil {
		return echo.NewHTTPError(http.StatusNotFound, err.Error())
	}

	members := make([]MemberResponse, 0, len(projectWithMembers.Members))
	for _, m := range projectWithMembers.Members {
		members = append(members, MemberResponse{
			ID:        m.Member.ID,
			ProjectID: m.Member.ProjectID,
			UserID:    m.Member.UserID,
			User: UserResponse{
				ID:              m.User.ID,
				LoginID:         m.User.LoginID,
				Name:            m.User.Name,
				ProfileImageURL: m.User.ProfileImageURL,
			},
			IsAdmin: m.Member.IsAdmin,
			AddedAt: m.Member.AddedAt.Format("2006-01-02T15:04:05Z07:00"),
		})
	}

	response := ProjectWithMembersResponse{
		Project: ProjectResponse{
			ID:          projectWithMembers.Project.ID,
			Name:        projectWithMembers.Project.Name,
			Description: projectWithMembers.Project.Description,
			IsArchived:  projectWithMembers.Project.IsArchived,
			CreatedBy:   projectWithMembers.Project.CreatedBy,
			CreatedAt:   projectWithMembers.Project.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
			UpdatedAt:   projectWithMembers.Project.UpdatedAt.Format("2006-01-02T15:04:05Z07:00"),
		},
		Members: members,
	}

	if !projectWithMembers.Project.ArchivedAt.IsZero() {
		response.Project.ArchivedAt = projectWithMembers.Project.ArchivedAt.Format("2006-01-02T15:04:05Z07:00")
	}

	return c.JSON(http.StatusOK, response)
}

// ListProjects returns paginated list of projects
func (h *ProjectHandler) ListProjects(c echo.Context) error {
	userID, ok := c.Get("user_id").(int)
	if !ok {
		return echo.NewHTTPError(http.StatusUnauthorized, "User not authenticated")
	}

	page, _ := strconv.Atoi(c.QueryParam("page"))
	if page < 1 {
		page = 1
	}

	pageSize, _ := strconv.Atoi(c.QueryParam("pageSize"))
	if pageSize < 1 || pageSize > 100 {
		pageSize = 20
	}

	includeArchived := c.QueryParam("includeArchived") == "true"

	// Get user's projects
	projectsList, total, err := h.projectService.GetUserProjects(userID, includeArchived, page, pageSize)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "Failed to fetch projects")
	}

	projects := make([]ProjectResponse, 0, len(projectsList))
	for _, p := range projectsList {
		pr := ProjectResponse{
			ID:          p.ID,
			Name:        p.Name,
			Description: p.Description,
			IsArchived:  p.IsArchived,
			CreatedBy:   p.CreatedBy,
			CreatedAt:   p.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
			UpdatedAt:   p.UpdatedAt.Format("2006-01-02T15:04:05Z07:00"),
		}
		if !p.ArchivedAt.IsZero() {
			pr.ArchivedAt = p.ArchivedAt.Format("2006-01-02T15:04:05Z07:00")
		}
		projects = append(projects, pr)
	}

	response := map[string]interface{}{
		"projects": projects,
		"total":    total,
		"page":     page,
		"pageSize": pageSize,
	}

	return c.JSON(http.StatusOK, response)
}

// AddMember adds a member to a project
func (h *ProjectHandler) AddMember(c echo.Context) error {
	userID, ok := c.Get("user_id").(int)
	if !ok {
		return echo.NewHTTPError(http.StatusUnauthorized, "User not authenticated")
	}

	projectIDStr := c.Param("id")
	projectID, err := strconv.Atoi(projectIDStr)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid project ID")
	}

	req := new(AddMemberRequest)
	if err := c.Bind(req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid request payload")
	}

	if err := c.Validate(req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}

	if err := h.projectService.AddMemberByLoginID(projectID, req.LoginID, req.IsAdmin, userID); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}

	return c.JSON(http.StatusCreated, map[string]string{
		"message": "Member added successfully",
	})
}

// RemoveMember removes a member from a project
func (h *ProjectHandler) RemoveMember(c echo.Context) error {
	userID, ok := c.Get("user_id").(int)
	if !ok {
		return echo.NewHTTPError(http.StatusUnauthorized, "User not authenticated")
	}

	projectIDStr := c.Param("id")
	projectID, err := strconv.Atoi(projectIDStr)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid project ID")
	}

	memberIDStr := c.Param("memberId")
	memberID, err := strconv.Atoi(memberIDStr)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid member ID")
	}

	if err := h.projectService.RemoveMember(projectID, memberID, userID); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}

	return c.JSON(http.StatusOK, map[string]string{
		"message": "Member removed successfully",
	})
}

// UpdateMemberRole updates a member's role
func (h *ProjectHandler) UpdateMemberRole(c echo.Context) error {
	userID, ok := c.Get("user_id").(int)
	if !ok {
		return echo.NewHTTPError(http.StatusUnauthorized, "User not authenticated")
	}

	projectIDStr := c.Param("id")
	projectID, err := strconv.Atoi(projectIDStr)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid project ID")
	}

	memberIDStr := c.Param("memberId")
	memberID, err := strconv.Atoi(memberIDStr)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid member ID")
	}

	req := new(UpdateMemberRoleRequest)
	if err := c.Bind(req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid request payload")
	}

	if err := h.projectService.UpdateMemberRole(projectID, memberID, req.IsAdmin, userID); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}

	return c.JSON(http.StatusOK, map[string]string{
		"message": "Member role updated successfully",
	})
}

// ArchiveProject archives a project
func (h *ProjectHandler) ArchiveProject(c echo.Context) error {
	userID, ok := c.Get("user_id").(int)
	if !ok {
		return echo.NewHTTPError(http.StatusUnauthorized, "User not authenticated")
	}

	projectIDStr := c.Param("id")
	projectID, err := strconv.Atoi(projectIDStr)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid project ID")
	}

	if err := h.projectService.ArchiveProject(projectID, userID); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}

	return c.JSON(http.StatusOK, map[string]string{
		"message": "Project archived successfully",
	})
}

// UnarchiveProject unarchives a project
func (h *ProjectHandler) UnarchiveProject(c echo.Context) error {
	userID, ok := c.Get("user_id").(int)
	if !ok {
		return echo.NewHTTPError(http.StatusUnauthorized, "User not authenticated")
	}

	projectIDStr := c.Param("id")
	projectID, err := strconv.Atoi(projectIDStr)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid project ID")
	}

	if err := h.projectService.UnarchiveProject(projectID, userID); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}

	return c.JSON(http.StatusOK, map[string]string{
		"message": "Project unarchived successfully",
	})
}

func (h *ProjectHandler) RegisterRoutes(e *echo.Echo, authMiddleware *AuthMiddleware) {
	projectGroup := e.Group("/api/projects", LoggingMiddleware, authMiddleware.RequireAuth)

	projectGroup.POST("", h.CreateProject)
	projectGroup.GET("", h.ListProjects)
	projectGroup.GET("/:id", h.GetProject)
	projectGroup.PUT("/:id", h.UpdateProject)
	projectGroup.POST("/:id/archive", h.ArchiveProject)
	projectGroup.POST("/:id/unarchive", h.UnarchiveProject)
	projectGroup.POST("/:id/members", h.AddMember)
	projectGroup.DELETE("/:id/members/:memberId", h.RemoveMember)
	projectGroup.PUT("/:id/members/:memberId", h.UpdateMemberRole)
}
