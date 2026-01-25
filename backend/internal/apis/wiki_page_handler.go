package apis

import (
	"net/http"
	"strconv"

	"github.com/dannyswat/pjeasy/internal/wiki_pages"
	"github.com/labstack/echo/v4"
)

type WikiPageHandler struct {
	wikiPageService *wiki_pages.WikiPageService
}

func NewWikiPageHandler(wikiPageService *wiki_pages.WikiPageService) *WikiPageHandler {
	return &WikiPageHandler{
		wikiPageService: wikiPageService,
	}
}

// Request/Response types
type CreateWikiPageRequest struct {
	Title     string `json:"title" validate:"required"`
	Content   string `json:"content"`
	ParentID  *int   `json:"parentId"`
	SortOrder int    `json:"sortOrder"`
}

type UpdateWikiPageRequest struct {
	Title     string `json:"title" validate:"required"`
	ParentID  *int   `json:"parentId"`
	SortOrder int    `json:"sortOrder"`
}

type UpdateWikiPageContentRequest struct {
	Content string `json:"content" validate:"required"`
}

type UpdateWikiPageStatusRequest struct {
	Status string `json:"status" validate:"required"`
}

type CreateWikiPageChangeRequest struct {
	ItemType string `json:"itemType" validate:"required"`
	ItemID   int    `json:"itemId" validate:"required"`
	Content  string `json:"content" validate:"required"`
}

type UpdateWikiPageChangeRequest struct {
	Content string `json:"content" validate:"required"`
}

type ResolveConflictRequest struct {
	Content string `json:"content" validate:"required"`
}

type MergeChangesRequest struct {
	ItemType string `json:"itemType" validate:"required"`
	ItemID   int    `json:"itemId" validate:"required"`
}

type WikiPageResponse struct {
	ID          int    `json:"id"`
	ProjectID   int    `json:"projectId"`
	Slug        string `json:"slug"`
	Title       string `json:"title"`
	Content     string `json:"content"`
	ContentHash string `json:"contentHash,omitempty"`
	Version     int    `json:"version"`
	Status      string `json:"status"`
	ParentID    *int   `json:"parentId,omitempty"`
	SortOrder   int    `json:"sortOrder"`
	CreatedBy   int    `json:"createdBy"`
	UpdatedBy   int    `json:"updatedBy"`
	CreatedAt   string `json:"createdAt"`
	UpdatedAt   string `json:"updatedAt"`
}

type WikiPageListResponse struct {
	WikiPages []WikiPageResponse `json:"wikiPages"`
	Total     int64              `json:"total"`
	Page      int                `json:"page"`
	PageSize  int                `json:"pageSize"`
}

type WikiPageTreeResponse struct {
	WikiPages []WikiPageResponse `json:"wikiPages"`
}

type WikiPageChangeResponse struct {
	ID           int     `json:"id"`
	WikiPageID   int     `json:"wikiPageId"`
	ProjectID    int     `json:"projectId"`
	ItemType     string  `json:"itemType"`
	ItemID       int     `json:"itemId"`
	BaseHash     string  `json:"baseHash"`
	Delta        string  `json:"delta,omitempty"`
	Snapshot     string  `json:"snapshot"`
	SnapshotHash string  `json:"snapshotHash"`
	ChangeType   string  `json:"changeType"`
	Status       string  `json:"status"`
	MergedAt     *string `json:"mergedAt,omitempty"`
	CreatedBy    int     `json:"createdBy"`
	CreatedAt    string  `json:"createdAt"`
	UpdatedAt    string  `json:"updatedAt"`
}

type WikiPageChangesListResponse struct {
	Changes  []WikiPageChangeResponse `json:"changes"`
	Total    int64                    `json:"total"`
	Page     int                      `json:"page"`
	PageSize int                      `json:"pageSize"`
}

type PreviewMergeResponse struct {
	Content string `json:"content"`
}

// toWikiPageResponse converts a wiki page model to response
func toWikiPageResponse(page *wiki_pages.WikiPage) WikiPageResponse {
	return WikiPageResponse{
		ID:          page.ID,
		ProjectID:   page.ProjectID,
		Slug:        page.Slug,
		Title:       page.Title,
		Content:     page.Content,
		ContentHash: page.ContentHash,
		Version:     page.Version,
		Status:      page.Status,
		ParentID:    page.ParentID,
		SortOrder:   page.SortOrder,
		CreatedBy:   page.CreatedBy,
		UpdatedBy:   page.UpdatedBy,
		CreatedAt:   page.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
		UpdatedAt:   page.UpdatedAt.Format("2006-01-02T15:04:05Z07:00"),
	}
}

// toWikiPageChangeResponse converts a wiki page change model to response
func toWikiPageChangeResponse(change *wiki_pages.WikiPageChange) WikiPageChangeResponse {
	var mergedAt *string
	if change.MergedAt != nil {
		formatted := change.MergedAt.Format("2006-01-02T15:04:05Z07:00")
		mergedAt = &formatted
	}

	return WikiPageChangeResponse{
		ID:           change.ID,
		WikiPageID:   change.WikiPageID,
		ProjectID:    change.ProjectID,
		ItemType:     change.ItemType,
		ItemID:       change.ItemID,
		BaseHash:     change.BaseHash,
		Delta:        change.Delta,
		Snapshot:     change.Snapshot,
		SnapshotHash: change.SnapshotHash,
		ChangeType:   change.ChangeType,
		Status:       change.Status,
		MergedAt:     mergedAt,
		CreatedBy:    change.CreatedBy,
		CreatedAt:    change.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
		UpdatedAt:    change.UpdatedAt.Format("2006-01-02T15:04:05Z07:00"),
	}
}

// CreateWikiPage creates a new wiki page
func (h *WikiPageHandler) CreateWikiPage(c echo.Context) error {
	userID, err := GetUserIDFromContext(c)
	if err != nil {
		return err
	}

	projectID, err := strconv.Atoi(c.Param("projectId"))
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid project ID")
	}

	req := new(CreateWikiPageRequest)
	if err := c.Bind(req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid request payload")
	}

	if err := c.Validate(req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}

	page, err := h.wikiPageService.CreateWikiPage(projectID, req.Title, req.Content, req.ParentID, req.SortOrder, userID)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}

	return c.JSON(http.StatusCreated, toWikiPageResponse(page))
}

// GetWikiPage returns a wiki page by ID
func (h *WikiPageHandler) GetWikiPage(c echo.Context) error {
	userID, err := GetUserIDFromContext(c)
	if err != nil {
		return err
	}

	pageID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid wiki page ID")
	}

	page, err := h.wikiPageService.GetWikiPage(pageID, userID)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}
	if page == nil {
		return echo.NewHTTPError(http.StatusNotFound, "Wiki page not found")
	}

	return c.JSON(http.StatusOK, toWikiPageResponse(page))
}

// GetWikiPageBySlug returns a wiki page by slug
func (h *WikiPageHandler) GetWikiPageBySlug(c echo.Context) error {
	userID, err := GetUserIDFromContext(c)
	if err != nil {
		return err
	}

	projectID, err := strconv.Atoi(c.Param("projectId"))
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid project ID")
	}

	slug := c.Param("slug")
	if slug == "" {
		return echo.NewHTTPError(http.StatusBadRequest, "Slug is required")
	}

	page, err := h.wikiPageService.GetWikiPageBySlug(projectID, slug, userID)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}
	if page == nil {
		return echo.NewHTTPError(http.StatusNotFound, "Wiki page not found")
	}

	return c.JSON(http.StatusOK, toWikiPageResponse(page))
}

// ListWikiPages returns wiki pages for a project
func (h *WikiPageHandler) ListWikiPages(c echo.Context) error {
	userID, err := GetUserIDFromContext(c)
	if err != nil {
		return err
	}

	projectID, err := strconv.Atoi(c.Param("projectId"))
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid project ID")
	}

	page := 1
	pageSize := 20
	status := ""

	if p := c.QueryParam("page"); p != "" {
		page, _ = strconv.Atoi(p)
	}
	if ps := c.QueryParam("pageSize"); ps != "" {
		pageSize, _ = strconv.Atoi(ps)
	}
	status = c.QueryParam("status")

	pages, total, err := h.wikiPageService.ListWikiPages(projectID, page, pageSize, status, userID)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}

	response := WikiPageListResponse{
		WikiPages: make([]WikiPageResponse, len(pages)),
		Total:     total,
		Page:      page,
		PageSize:  pageSize,
	}

	for i, p := range pages {
		response.WikiPages[i] = toWikiPageResponse(&p)
	}

	return c.JSON(http.StatusOK, response)
}

// GetWikiPageTree returns the hierarchical tree of wiki pages
func (h *WikiPageHandler) GetWikiPageTree(c echo.Context) error {
	userID, err := GetUserIDFromContext(c)
	if err != nil {
		return err
	}

	projectID, err := strconv.Atoi(c.Param("projectId"))
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid project ID")
	}

	pages, err := h.wikiPageService.GetWikiPageTree(projectID, userID)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}

	response := WikiPageTreeResponse{
		WikiPages: make([]WikiPageResponse, len(pages)),
	}

	for i, p := range pages {
		response.WikiPages[i] = toWikiPageResponse(&p)
	}

	return c.JSON(http.StatusOK, response)
}

// UpdateWikiPage updates wiki page metadata
func (h *WikiPageHandler) UpdateWikiPage(c echo.Context) error {
	userID, err := GetUserIDFromContext(c)
	if err != nil {
		return err
	}

	pageID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid wiki page ID")
	}

	req := new(UpdateWikiPageRequest)
	if err := c.Bind(req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid request payload")
	}

	if err := c.Validate(req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}

	page, err := h.wikiPageService.UpdateWikiPage(pageID, req.Title, req.ParentID, req.SortOrder, userID)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}

	return c.JSON(http.StatusOK, toWikiPageResponse(page))
}

// UpdateWikiPageContent updates wiki page content directly
func (h *WikiPageHandler) UpdateWikiPageContent(c echo.Context) error {
	userID, err := GetUserIDFromContext(c)
	if err != nil {
		return err
	}

	pageID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid wiki page ID")
	}

	req := new(UpdateWikiPageContentRequest)
	if err := c.Bind(req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid request payload")
	}

	if err := c.Validate(req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}

	page, err := h.wikiPageService.UpdateWikiPageContent(pageID, req.Content, userID)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}

	return c.JSON(http.StatusOK, toWikiPageResponse(page))
}

// UpdateWikiPageStatus updates wiki page status
func (h *WikiPageHandler) UpdateWikiPageStatus(c echo.Context) error {
	userID, err := GetUserIDFromContext(c)
	if err != nil {
		return err
	}

	pageID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid wiki page ID")
	}

	req := new(UpdateWikiPageStatusRequest)
	if err := c.Bind(req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid request payload")
	}

	if err := c.Validate(req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}

	page, err := h.wikiPageService.UpdateWikiPageStatus(pageID, req.Status, userID)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}

	return c.JSON(http.StatusOK, toWikiPageResponse(page))
}

// DeleteWikiPage deletes a wiki page
func (h *WikiPageHandler) DeleteWikiPage(c echo.Context) error {
	userID, err := GetUserIDFromContext(c)
	if err != nil {
		return err
	}

	pageID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid wiki page ID")
	}

	if err := h.wikiPageService.DeleteWikiPage(pageID, userID); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}

	return c.NoContent(http.StatusNoContent)
}

// CreateWikiPageChange creates a change linked to a feature/issue
func (h *WikiPageHandler) CreateWikiPageChange(c echo.Context) error {
	userID, err := GetUserIDFromContext(c)
	if err != nil {
		return err
	}

	pageID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid wiki page ID")
	}

	req := new(CreateWikiPageChangeRequest)
	if err := c.Bind(req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid request payload")
	}

	if err := c.Validate(req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}

	change, err := h.wikiPageService.CreateWikiPageChange(pageID, req.ItemType, req.ItemID, req.Content, userID)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}

	return c.JSON(http.StatusCreated, toWikiPageChangeResponse(change))
}

// GetWikiPageChange returns a wiki page change by ID
func (h *WikiPageHandler) GetWikiPageChange(c echo.Context) error {
	userID, err := GetUserIDFromContext(c)
	if err != nil {
		return err
	}

	changeID, err := strconv.Atoi(c.Param("changeId"))
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid change ID")
	}

	change, err := h.wikiPageService.GetWikiPageChange(changeID, userID)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}
	if change == nil {
		return echo.NewHTTPError(http.StatusNotFound, "Change not found")
	}

	return c.JSON(http.StatusOK, toWikiPageChangeResponse(change))
}

// UpdateWikiPageChange updates the content of a pending wiki page change
func (h *WikiPageHandler) UpdateWikiPageChange(c echo.Context) error {
	userID, err := GetUserIDFromContext(c)
	if err != nil {
		return err
	}

	changeID, err := strconv.Atoi(c.Param("changeId"))
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid change ID")
	}

	var req UpdateWikiPageChangeRequest
	if err := c.Bind(&req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid request body")
	}

	if err := c.Validate(&req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}

	change, err := h.wikiPageService.UpdateWikiPageChange(changeID, req.Content, userID)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}

	return c.JSON(http.StatusOK, toWikiPageChangeResponse(change))
}

// ListWikiPageChanges returns changes for a wiki page
func (h *WikiPageHandler) ListWikiPageChanges(c echo.Context) error {
	userID, err := GetUserIDFromContext(c)
	if err != nil {
		return err
	}

	pageID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid wiki page ID")
	}

	page := 1
	pageSize := 20

	if p := c.QueryParam("page"); p != "" {
		page, _ = strconv.Atoi(p)
	}
	if ps := c.QueryParam("pageSize"); ps != "" {
		pageSize, _ = strconv.Atoi(ps)
	}

	changes, total, err := h.wikiPageService.ListWikiPageChanges(pageID, page, pageSize, userID)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}

	response := WikiPageChangesListResponse{
		Changes:  make([]WikiPageChangeResponse, len(changes)),
		Total:    total,
		Page:     page,
		PageSize: pageSize,
	}

	for i, ch := range changes {
		response.Changes[i] = toWikiPageChangeResponse(&ch)
	}

	return c.JSON(http.StatusOK, response)
}

// GetPendingChanges returns pending changes for a wiki page
func (h *WikiPageHandler) GetPendingChanges(c echo.Context) error {
	userID, err := GetUserIDFromContext(c)
	if err != nil {
		return err
	}

	pageID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid wiki page ID")
	}

	changes, err := h.wikiPageService.GetPendingChanges(pageID, userID)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}

	response := make([]WikiPageChangeResponse, len(changes))
	for i, ch := range changes {
		response[i] = toWikiPageChangeResponse(&ch)
	}

	return c.JSON(http.StatusOK, response)
}

// GetChangesByItem returns changes for a specific feature/issue
func (h *WikiPageHandler) GetChangesByItem(c echo.Context) error {
	userID, err := GetUserIDFromContext(c)
	if err != nil {
		return err
	}

	itemType := c.QueryParam("itemType")
	itemIDStr := c.QueryParam("itemId")

	if itemType == "" || itemIDStr == "" {
		return echo.NewHTTPError(http.StatusBadRequest, "itemType and itemId are required")
	}

	itemID, err := strconv.Atoi(itemIDStr)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid item ID")
	}

	changes, err := h.wikiPageService.GetChangesByItem(itemType, itemID, userID)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}

	response := make([]WikiPageChangeResponse, len(changes))
	for i, ch := range changes {
		response[i] = toWikiPageChangeResponse(&ch)
	}

	return c.JSON(http.StatusOK, response)
}

// MergeChanges merges pending changes when a feature/issue is completed
func (h *WikiPageHandler) MergeChanges(c echo.Context) error {
	userID, err := GetUserIDFromContext(c)
	if err != nil {
		return err
	}

	req := new(MergeChangesRequest)
	if err := c.Bind(req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid request payload")
	}

	if err := c.Validate(req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}

	if err := h.wikiPageService.MergeChangesOnCompletion(req.ItemType, req.ItemID, userID); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}

	return c.JSON(http.StatusOK, map[string]string{"message": "Changes merged successfully"})
}

// ResolveConflict resolves a conflicting change
func (h *WikiPageHandler) ResolveConflict(c echo.Context) error {
	userID, err := GetUserIDFromContext(c)
	if err != nil {
		return err
	}

	changeID, err := strconv.Atoi(c.Param("changeId"))
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid change ID")
	}

	req := new(ResolveConflictRequest)
	if err := c.Bind(req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid request payload")
	}

	if err := c.Validate(req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}

	change, err := h.wikiPageService.ResolveConflict(changeID, req.Content, userID)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}

	return c.JSON(http.StatusOK, toWikiPageChangeResponse(change))
}

// RejectChange rejects a pending change
func (h *WikiPageHandler) RejectChange(c echo.Context) error {
	userID, err := GetUserIDFromContext(c)
	if err != nil {
		return err
	}

	changeID, err := strconv.Atoi(c.Param("changeId"))
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid change ID")
	}

	change, err := h.wikiPageService.RejectChange(changeID, userID)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}

	return c.JSON(http.StatusOK, toWikiPageChangeResponse(change))
}

// DeleteWikiPageChange deletes a pending wiki page change
func (h *WikiPageHandler) DeleteWikiPageChange(c echo.Context) error {
	userID, err := GetUserIDFromContext(c)
	if err != nil {
		return err
	}

	changeID, err := strconv.Atoi(c.Param("changeId"))
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid change ID")
	}

	if err := h.wikiPageService.DeleteWikiPageChange(changeID, userID); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}

	return c.NoContent(http.StatusNoContent)
}

// PreviewMerge previews what the merged content would look like
func (h *WikiPageHandler) PreviewMerge(c echo.Context) error {
	userID, err := GetUserIDFromContext(c)
	if err != nil {
		return err
	}

	changeID, err := strconv.Atoi(c.Param("changeId"))
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid change ID")
	}

	content, err := h.wikiPageService.PreviewMerge(changeID, userID)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}

	return c.JSON(http.StatusOK, PreviewMergeResponse{Content: content})
}

// RegisterRoutes registers wiki page routes
func (h *WikiPageHandler) RegisterRoutes(e *echo.Echo, authMiddleware *AuthMiddleware, projectMiddleware *ProjectMiddleware) {
	// Wiki page routes
	projectWiki := e.Group("/api/projects/:projectId/wiki", authMiddleware.RequireAuth, projectMiddleware.RequireProjectMember)
	projectWiki.POST("", h.CreateWikiPage)
	projectWiki.GET("", h.ListWikiPages)
	projectWiki.GET("/tree", h.GetWikiPageTree)
	projectWiki.GET("/slug/:slug", h.GetWikiPageBySlug)

	// Wiki page detail routes
	wikiPage := e.Group("/api/wiki", authMiddleware.RequireAuth)
	wikiPage.GET("/:id", h.GetWikiPage)
	wikiPage.PUT("/:id", h.UpdateWikiPage)
	wikiPage.PUT("/:id/content", h.UpdateWikiPageContent)
	wikiPage.PUT("/:id/status", h.UpdateWikiPageStatus)
	wikiPage.DELETE("/:id", h.DeleteWikiPage)

	// Wiki page changes routes
	wikiPage.POST("/:id/changes", h.CreateWikiPageChange)
	wikiPage.GET("/:id/changes", h.ListWikiPageChanges)
	wikiPage.GET("/:id/changes/pending", h.GetPendingChanges)

	// Change detail routes
	wikiChanges := e.Group("/api/wiki-changes", authMiddleware.RequireAuth)
	wikiChanges.GET("", h.GetChangesByItem)
	wikiChanges.GET("/:changeId", h.GetWikiPageChange)
	wikiChanges.PUT("/:changeId", h.UpdateWikiPageChange)
	wikiChanges.POST("/:changeId/resolve", h.ResolveConflict)
	wikiChanges.POST("/:changeId/reject", h.RejectChange)
	wikiChanges.DELETE("/:changeId", h.DeleteWikiPageChange)
	wikiChanges.GET("/:changeId/preview", h.PreviewMerge)
	wikiChanges.POST("/merge", h.MergeChanges)
}
