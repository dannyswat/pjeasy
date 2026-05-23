package apis

import (
	"net/http"
	"strconv"
	"time"

	"github.com/dannyswat/pjeasy/internal/projects"
	"github.com/dannyswat/pjeasy/internal/sequences"
	"github.com/labstack/echo/v4"
)

type ProjectHandler struct {
	projectService  *projects.ProjectService
	sequenceService *sequences.SequenceService
}

func NewProjectHandler(projectService *projects.ProjectService, sequenceService *sequences.SequenceService) *ProjectHandler {
	return &ProjectHandler{
		projectService:  projectService,
		sequenceService: sequenceService,
	}
}

type CreateProjectRequest struct {
	Name          string `json:"name" validate:"required"`
	Description   string `json:"description"`
	RepositoryURL string `json:"repositoryUrl" validate:"omitempty,httpurl"`
}

type UpdateProjectRequest struct {
	Name          string `json:"name" validate:"required"`
	Description   string `json:"description"`
	RepositoryURL string `json:"repositoryUrl" validate:"omitempty,httpurl"`
}

type AddMemberRequest struct {
	LoginID string `json:"loginId" validate:"required"`
	IsAdmin bool   `json:"isAdmin"`
	IsUser  bool   `json:"isUser"`
}

type UpdateMemberRoleRequest struct {
	IsAdmin bool `json:"isAdmin"`
	IsUser  bool `json:"isUser"`
}

type CreateProjectInvitationRequest struct {
	Role      string `json:"role" validate:"required,oneof=member user"`
	ExpiresAt string `json:"expiresAt"`
}

type ProjectResponse struct {
	ID            int    `json:"id"`
	Name          string `json:"name"`
	Description   string `json:"description"`
	RepositoryURL string `json:"repositoryUrl"`
	IsArchived    bool   `json:"isArchived"`
	CreatedBy     int    `json:"createdBy"`
	CreatedAt     string `json:"createdAt"`
	UpdatedAt     string `json:"updatedAt"`
	ArchivedAt    string `json:"archivedAt,omitempty"`
}

type MemberResponse struct {
	ID        int          `json:"id"`
	ProjectID int          `json:"projectId"`
	UserID    int          `json:"userId"`
	User      UserResponse `json:"user"`
	IsAdmin   bool         `json:"isAdmin"`
	IsUser    bool         `json:"isUser"`
	AddedAt   string       `json:"addedAt"`
}

type ProjectWithMembersResponse struct {
	Project ProjectResponse  `json:"project"`
	Members []MemberResponse `json:"members"`
}

type ProjectInvitationResponse struct {
	ID          int    `json:"id"`
	Token       string `json:"token,omitempty"`
	ProjectID   int    `json:"projectId"`
	ProjectName string `json:"projectName"`
	Role        string `json:"role"`
	ExpiresAt   string `json:"expiresAt,omitempty"`
	CreatedAt   string `json:"createdAt,omitempty"`
	RevokedAt   string `json:"revokedAt,omitempty"`
}

// CreateProject creates a new project
func (h *ProjectHandler) CreateProject(c echo.Context) error {
	userID, err := GetUserIDFromContext(c)
	if err != nil {
		return err
	}

	req := new(CreateProjectRequest)
	if err := c.Bind(req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid request payload")
	}

	if err := c.Validate(req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}

	project, err := h.projectService.CreateProject(req.Name, req.Description, req.RepositoryURL, userID)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}

	if err := h.sequenceService.GenerateProjectSequences(project.ID); err != nil {
		// Non-fatal: log and continue so the project is still returned
		c.Logger().Errorf("failed to generate default sequences for project %d: %v", project.ID, err)
	}

	response := ProjectResponse{
		ID:            project.ID,
		Name:          project.Name,
		Description:   project.Description,
		RepositoryURL: project.RepositoryURL,
		IsArchived:    project.IsArchived,
		CreatedBy:     project.CreatedBy,
		CreatedAt:     project.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
		UpdatedAt:     project.UpdatedAt.Format("2006-01-02T15:04:05Z07:00"),
	}

	return c.JSON(http.StatusCreated, response)
}

// UpdateProject updates a project
func (h *ProjectHandler) UpdateProject(c echo.Context) error {
	userID, err := GetUserIDFromContext(c)
	if err != nil {
		return err
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

	project, err := h.projectService.UpdateProject(projectID, req.Name, req.Description, req.RepositoryURL, userID)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}

	response := ProjectResponse{
		ID:            project.ID,
		Name:          project.Name,
		Description:   project.Description,
		RepositoryURL: project.RepositoryURL,
		IsArchived:    project.IsArchived,
		CreatedBy:     project.CreatedBy,
		CreatedAt:     project.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
		UpdatedAt:     project.UpdatedAt.Format("2006-01-02T15:04:05Z07:00"),
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
			IsUser:  m.Member.IsUser,
			AddedAt: m.Member.AddedAt.Format("2006-01-02T15:04:05Z07:00"),
		})
	}

	response := ProjectWithMembersResponse{
		Project: ProjectResponse{
			ID:            projectWithMembers.Project.ID,
			Name:          projectWithMembers.Project.Name,
			Description:   projectWithMembers.Project.Description,
			RepositoryURL: projectWithMembers.Project.RepositoryURL,
			IsArchived:    projectWithMembers.Project.IsArchived,
			CreatedBy:     projectWithMembers.Project.CreatedBy,
			CreatedAt:     projectWithMembers.Project.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
			UpdatedAt:     projectWithMembers.Project.UpdatedAt.Format("2006-01-02T15:04:05Z07:00"),
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
	userID, err := GetUserIDFromContext(c)
	if err != nil {
		return err
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
			ID:            p.ID,
			Name:          p.Name,
			Description:   p.Description,
			RepositoryURL: p.RepositoryURL,
			IsArchived:    p.IsArchived,
			CreatedBy:     p.CreatedBy,
			CreatedAt:     p.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
			UpdatedAt:     p.UpdatedAt.Format("2006-01-02T15:04:05Z07:00"),
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
	userID, err := GetUserIDFromContext(c)
	if err != nil {
		return err
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

	if err := h.projectService.AddMemberByLoginID(projectID, req.LoginID, req.IsAdmin, req.IsUser, userID); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}

	return c.JSON(http.StatusCreated, map[string]string{
		"message": "Member added successfully",
	})
}

// RemoveMember removes a member from a project
func (h *ProjectHandler) RemoveMember(c echo.Context) error {
	userID, err := GetUserIDFromContext(c)
	if err != nil {
		return err
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

func (h *ProjectHandler) CreateInvitation(c echo.Context) error {
	userID, err := GetUserIDFromContext(c)
	if err != nil {
		return err
	}

	projectID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid project ID")
	}

	req := new(CreateProjectInvitationRequest)
	if err := c.Bind(req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid request payload")
	}

	if err := c.Validate(req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}

	var expiresAt *time.Time
	if req.ExpiresAt != "" {
		parsed, err := time.Parse(time.RFC3339, req.ExpiresAt)
		if err != nil {
			return echo.NewHTTPError(http.StatusBadRequest, "Invalid expiry date")
		}
		expiresAt = &parsed
	}

	invitation, token, err := h.projectService.CreateInvitation(projectID, req.Role == "user", expiresAt, userID)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}

	project, err := h.projectService.GetProject(projectID)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}

	response := ProjectInvitationResponse{
		ID:          invitation.ID,
		Token:       token,
		ProjectID:   projectID,
		ProjectName: project.Name,
		Role:        invitation.Role(),
		CreatedAt:   invitation.CreatedAt.Format(time.RFC3339),
	}

	if invitation.ExpiresAt != nil {
		response.ExpiresAt = invitation.ExpiresAt.Format(time.RFC3339)
	}

	return c.JSON(http.StatusCreated, response)
}

func (h *ProjectHandler) ListInvitations(c echo.Context) error {
	userID, err := GetUserIDFromContext(c)
	if err != nil {
		return err
	}

	projectID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid project ID")
	}

	items, err := h.projectService.ListInvitations(projectID, userID)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}

	responses := make([]ProjectInvitationResponse, 0, len(items))
	for _, item := range items {
		response := ProjectInvitationResponse{
			ID:          item.Invitation.ID,
			Token:       item.Invitation.Token,
			ProjectID:   item.Project.ID,
			ProjectName: item.Project.Name,
			Role:        item.Invitation.Role(),
			CreatedAt:   item.Invitation.CreatedAt.Format(time.RFC3339),
		}

		if item.Invitation.ExpiresAt != nil {
			response.ExpiresAt = item.Invitation.ExpiresAt.Format(time.RFC3339)
		}
		if item.Invitation.RevokedAt != nil {
			response.RevokedAt = item.Invitation.RevokedAt.Format(time.RFC3339)
		}

		responses = append(responses, response)
	}

	return c.JSON(http.StatusOK, map[string][]ProjectInvitationResponse{
		"invitations": responses,
	})
}

func (h *ProjectHandler) GetInvitation(c echo.Context) error {
	details, err := h.projectService.ResolveInvitation(c.Param("token"))
	if err != nil {
		return echo.NewHTTPError(http.StatusNotFound, err.Error())
	}

	response := ProjectInvitationResponse{
		ID:          details.Invitation.ID,
		ProjectID:   details.Project.ID,
		ProjectName: details.Project.Name,
		Role:        details.Invitation.Role(),
		CreatedAt:   details.Invitation.CreatedAt.Format(time.RFC3339),
	}

	if details.Invitation.ExpiresAt != nil {
		response.ExpiresAt = details.Invitation.ExpiresAt.Format(time.RFC3339)
	}

	return c.JSON(http.StatusOK, response)
}

func (h *ProjectHandler) RevokeInvitation(c echo.Context) error {
	userID, err := GetUserIDFromContext(c)
	if err != nil {
		return err
	}

	projectID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid project ID")
	}

	invitationID, err := strconv.Atoi(c.Param("invitationId"))
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid invitation ID")
	}

	if err := h.projectService.RevokeInvitation(projectID, invitationID, userID); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}

	return c.JSON(http.StatusOK, map[string]string{
		"message": "Invitation revoked successfully",
	})
}

func (h *ProjectHandler) AcceptInvitation(c echo.Context) error {
	userID, err := GetUserIDFromContext(c)
	if err != nil {
		return err
	}

	member, err := h.projectService.AcceptInvitation(c.Param("token"), userID)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}

	return c.JSON(http.StatusOK, map[string]interface{}{
		"message":   "Invitation accepted successfully",
		"projectId": member.ProjectID,
	})
}

// UpdateMemberRole updates a member's role
func (h *ProjectHandler) UpdateMemberRole(c echo.Context) error {
	userID, err := GetUserIDFromContext(c)
	if err != nil {
		return err
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

	if err := h.projectService.UpdateMemberRole(projectID, memberID, req.IsAdmin, req.IsUser, userID); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}

	return c.JSON(http.StatusOK, map[string]string{
		"message": "Member role updated successfully",
	})
}

// ArchiveProject archives a project
func (h *ProjectHandler) ArchiveProject(c echo.Context) error {
	userID, err := GetUserIDFromContext(c)
	if err != nil {
		return err
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
	userID, err := GetUserIDFromContext(c)
	if err != nil {
		return err
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

func (h *ProjectHandler) RegisterRoutes(e *echo.Echo, authMiddleware *AuthMiddleware, projectMiddleware *ProjectMiddleware) {
	projectGroup := e.Group("/api/projects", authMiddleware.RequireAuth)

	e.GET("/api/project-invitations/:token", h.GetInvitation)
	e.POST("/api/project-invitations/:token/accept", h.AcceptInvitation, authMiddleware.RequireAuth)

	projectGroup.POST("", h.CreateProject)
	projectGroup.GET("", h.ListProjects)
	projectGroup.GET("/:id", h.GetProject, projectMiddleware.RequireProjectMember)
	projectGroup.PUT("/:id", h.UpdateProject, projectMiddleware.RequireProjectAdmin)
	projectGroup.POST("/:id/archive", h.ArchiveProject, projectMiddleware.RequireProjectAdmin)
	projectGroup.POST("/:id/unarchive", h.UnarchiveProject, projectMiddleware.RequireProjectAdmin)
	projectGroup.GET("/:id/invitations", h.ListInvitations, projectMiddleware.RequireProjectAdmin)
	projectGroup.POST("/:id/invitations", h.CreateInvitation, projectMiddleware.RequireProjectAdmin)
	projectGroup.DELETE("/:id/invitations/:invitationId", h.RevokeInvitation, projectMiddleware.RequireProjectAdmin)
	projectGroup.POST("/:id/members", h.AddMember, projectMiddleware.RequireProjectAdmin)
	projectGroup.DELETE("/:id/members/:memberId", h.RemoveMember, projectMiddleware.RequireProjectAdmin)
	projectGroup.PUT("/:id/members/:memberId", h.UpdateMemberRole, projectMiddleware.RequireProjectAdmin)
}
