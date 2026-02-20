package apis

import (
	"net/http"
	"strconv"
	"time"

	"github.com/dannyswat/pjeasy/internal/reviews"
	"github.com/labstack/echo/v4"
)

type ReviewHandler struct {
	reviewService *reviews.ReviewService
}

func NewReviewHandler(reviewService *reviews.ReviewService) *ReviewHandler {
	return &ReviewHandler{
		reviewService: reviewService,
	}
}

type CreateSprintReviewRequest struct {
	ProjectID   int    `json:"projectId" validate:"required"`
	SprintID    int    `json:"sprintId" validate:"required"`
	Title       string `json:"title" validate:"required,min=1,max=200"`
	Description string `json:"description"`
}

type CreateCustomReviewRequest struct {
	ProjectID   int     `json:"projectId" validate:"required"`
	Title       string  `json:"title" validate:"required,min=1,max=200"`
	Description string  `json:"description"`
	StartDate   *string `json:"startDate"`
	EndDate     *string `json:"endDate"`
}

type UpdateReviewRequest struct {
	Title       string `json:"title" validate:"required,min=1,max=200"`
	Description string `json:"description"`
	Summary     string `json:"summary"`
}

type ReviewResponse struct {
	ID              int     `json:"id"`
	ProjectID       int     `json:"projectId"`
	Title           string  `json:"title"`
	Description     string  `json:"description"`
	ReviewType      string  `json:"reviewType"`
	SprintID        *int    `json:"sprintId,omitempty"`
	StartDate       *string `json:"startDate,omitempty"`
	EndDate         *string `json:"endDate,omitempty"`
	Status          string  `json:"status"`
	Summary         string  `json:"summary"`
	TotalTasks      int     `json:"totalTasks"`
	CompletedTasks  int     `json:"completedTasks"`
	TotalPoints     int     `json:"totalPoints"`
	CompletedPoints int     `json:"completedPoints"`
	CompletionRate  float64 `json:"completionRate"`
	CreatedBy       int     `json:"createdBy"`
	CreatedAt       string  `json:"createdAt"`
	UpdatedAt       string  `json:"updatedAt"`
}

type ReviewListResponse struct {
	Reviews []ReviewResponse `json:"reviews"`
	Total   int64            `json:"total"`
	Page    int              `json:"page"`
	Size    int              `json:"size"`
}

type ReviewItemResponse struct {
	ID         int    `json:"id"`
	ReviewID   int    `json:"reviewId"`
	ItemType   string `json:"itemType"`
	ItemID     int    `json:"itemId"`
	RefNum     string `json:"refNum"`
	Title      string `json:"title"`
	Status     string `json:"status"`
	Priority   string `json:"priority,omitempty"`
	AssignedTo int    `json:"assignedTo,omitempty"`
	Points     int    `json:"points"`
	Category   string `json:"category"`
}

type ReviewDetailResponse struct {
	Review ReviewResponse       `json:"review"`
	Items  []ReviewItemResponse `json:"items"`
}

func toReviewResponse(review *reviews.Review) ReviewResponse {
	var startDate *string
	if review.StartDate != nil {
		s := review.StartDate.Format("2006-01-02")
		startDate = &s
	}

	var endDate *string
	if review.EndDate != nil {
		s := review.EndDate.Format("2006-01-02")
		endDate = &s
	}

	return ReviewResponse{
		ID:              review.ID,
		ProjectID:       review.ProjectID,
		Title:           review.Title,
		Description:     review.Description,
		ReviewType:      review.ReviewType,
		SprintID:        review.SprintID,
		StartDate:       startDate,
		EndDate:         endDate,
		Status:          review.Status,
		Summary:         review.Summary,
		TotalTasks:      review.TotalTasks,
		CompletedTasks:  review.CompletedTasks,
		TotalPoints:     review.TotalPoints,
		CompletedPoints: review.CompletedPoints,
		CompletionRate:  review.CompletionRate,
		CreatedBy:       review.CreatedBy,
		CreatedAt:       review.CreatedAt.Format(time.RFC3339),
		UpdatedAt:       review.UpdatedAt.Format(time.RFC3339),
	}
}

func toReviewListResponse(reviewList []reviews.Review, total int64, page, size int) ReviewListResponse {
	responses := make([]ReviewResponse, len(reviewList))
	for i, review := range reviewList {
		responses[i] = toReviewResponse(&review)
	}

	return ReviewListResponse{
		Reviews: responses,
		Total:   total,
		Page:    page,
		Size:    size,
	}
}

func toReviewItemResponse(item *reviews.ReviewItem) ReviewItemResponse {
	return ReviewItemResponse{
		ID:         item.ID,
		ReviewID:   item.ReviewID,
		ItemType:   item.ItemType,
		ItemID:     item.ItemID,
		RefNum:     item.RefNum,
		Title:      item.Title,
		Status:     item.Status,
		Priority:   item.Priority,
		AssignedTo: item.AssignedTo,
		Points:     item.Points,
		Category:   item.Category,
	}
}

func toReviewItemResponses(items []reviews.ReviewItem) []ReviewItemResponse {
	responses := make([]ReviewItemResponse, len(items))
	for i, item := range items {
		responses[i] = toReviewItemResponse(&item)
	}
	return responses
}

// RegisterRoutes registers review routes
func (h *ReviewHandler) RegisterRoutes(e *echo.Echo, authMiddleware *AuthMiddleware, projectMiddleware *ProjectMiddleware) {
	reviewGroup := e.Group("/api/reviews", authMiddleware.RequireAuth)
	reviewGroup.POST("/sprint", h.CreateSprintReview)
	reviewGroup.POST("/custom", h.CreateCustomReview)
	reviewGroup.GET("", h.GetProjectReviews)
	reviewGroup.GET("/:id", h.GetReview)
	reviewGroup.GET("/:id/detail", h.GetReviewDetail)
	reviewGroup.PUT("/:id", h.UpdateReview)
	reviewGroup.POST("/:id/publish", h.PublishReview)
	reviewGroup.POST("/:id/regenerate", h.RegenerateReviewItems)
	reviewGroup.DELETE("/:id", h.DeleteReview)
}

// CreateSprintReview creates a new sprint review
func (h *ReviewHandler) CreateSprintReview(c echo.Context) error {
	req := new(CreateSprintReviewRequest)
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

	review, err := h.reviewService.CreateSprintReview(
		req.ProjectID,
		req.SprintID,
		req.Title,
		req.Description,
		userID,
	)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, err.Error())
	}

	return c.JSON(http.StatusCreated, toReviewResponse(review))
}

// CreateCustomReview creates a new custom review
func (h *ReviewHandler) CreateCustomReview(c echo.Context) error {
	req := new(CreateCustomReviewRequest)
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

	review, err := h.reviewService.CreateCustomReview(
		req.ProjectID,
		req.Title,
		req.Description,
		startDate,
		endDate,
		userID,
	)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, err.Error())
	}

	return c.JSON(http.StatusCreated, toReviewResponse(review))
}

// GetProjectReviews returns reviews for a project
func (h *ReviewHandler) GetProjectReviews(c echo.Context) error {
	projectIDStr := c.QueryParam("projectId")
	if projectIDStr == "" {
		return echo.NewHTTPError(http.StatusBadRequest, "projectId is required")
	}

	projectID, err := strconv.Atoi(projectIDStr)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid projectId")
	}

	page := 1
	if pageStr := c.QueryParam("page"); pageStr != "" {
		page, err = strconv.Atoi(pageStr)
		if err != nil || page < 1 {
			page = 1
		}
	}

	pageSize := 20
	if sizeStr := c.QueryParam("pageSize"); sizeStr != "" {
		pageSize, err = strconv.Atoi(sizeStr)
		if err != nil || pageSize < 1 {
			pageSize = 20
		}
	}

	userID, err := GetUserIDFromContext(c)
	if err != nil {
		return err
	}

	reviewList, total, err := h.reviewService.GetProjectReviews(projectID, page, pageSize, userID)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, err.Error())
	}

	return c.JSON(http.StatusOK, toReviewListResponse(reviewList, total, page, pageSize))
}

// GetReview returns a single review
func (h *ReviewHandler) GetReview(c echo.Context) error {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid review ID")
	}

	userID, err := GetUserIDFromContext(c)
	if err != nil {
		return err
	}

	review, err := h.reviewService.GetReview(id, userID)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, err.Error())
	}

	return c.JSON(http.StatusOK, toReviewResponse(review))
}

// GetReviewDetail returns a review with all its items
func (h *ReviewHandler) GetReviewDetail(c echo.Context) error {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid review ID")
	}

	userID, err := GetUserIDFromContext(c)
	if err != nil {
		return err
	}

	review, err := h.reviewService.GetReview(id, userID)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, err.Error())
	}

	items, err := h.reviewService.GetReviewItems(id, userID)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, err.Error())
	}

	return c.JSON(http.StatusOK, ReviewDetailResponse{
		Review: toReviewResponse(review),
		Items:  toReviewItemResponses(items),
	})
}

// UpdateReview updates a review
func (h *ReviewHandler) UpdateReview(c echo.Context) error {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid review ID")
	}

	req := new(UpdateReviewRequest)
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

	review, err := h.reviewService.UpdateReview(id, req.Title, req.Description, req.Summary, userID)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, err.Error())
	}

	return c.JSON(http.StatusOK, toReviewResponse(review))
}

// PublishReview publishes a review
func (h *ReviewHandler) PublishReview(c echo.Context) error {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid review ID")
	}

	userID, err := GetUserIDFromContext(c)
	if err != nil {
		return err
	}

	review, err := h.reviewService.PublishReview(id, userID)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, err.Error())
	}

	return c.JSON(http.StatusOK, toReviewResponse(review))
}

// RegenerateReviewItems regenerates review items
func (h *ReviewHandler) RegenerateReviewItems(c echo.Context) error {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid review ID")
	}

	userID, err := GetUserIDFromContext(c)
	if err != nil {
		return err
	}

	review, err := h.reviewService.RegenerateReviewItems(id, userID)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, err.Error())
	}

	return c.JSON(http.StatusOK, toReviewResponse(review))
}

// DeleteReview deletes a review
func (h *ReviewHandler) DeleteReview(c echo.Context) error {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid review ID")
	}

	userID, err := GetUserIDFromContext(c)
	if err != nil {
		return err
	}

	if err := h.reviewService.DeleteReview(id, userID); err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, err.Error())
	}

	return c.JSON(http.StatusOK, map[string]string{"message": "Review deleted successfully"})
}
