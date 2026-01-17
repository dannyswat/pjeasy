package apis

import (
	"net/http"
	"strconv"

	"github.com/dannyswat/pjeasy/internal/comments"
	"github.com/labstack/echo/v4"
)

type CommentHandler struct {
	commentService *comments.CommentService
}

func NewCommentHandler(commentService *comments.CommentService) *CommentHandler {
	return &CommentHandler{
		commentService: commentService,
	}
}

type CreateCommentRequest struct {
	Content string `json:"content" validate:"required"`
}

type UpdateCommentRequest struct {
	Content string `json:"content" validate:"required"`
}

type CommentResponse struct {
	ID          int    `json:"id"`
	ItemID      int    `json:"itemId"`
	ItemType    string `json:"itemType"`
	Content     string `json:"content"`
	CreatedBy   int    `json:"createdBy"`
	CreatedAt   string `json:"createdAt"`
	UpdatedAt   string `json:"updatedAt"`
	CreatorName string `json:"creatorName"`
}

type CommentsListResponse struct {
	Comments []CommentResponse `json:"comments"`
	Total    int64             `json:"total"`
}

// toCommentResponse converts a comment model to response
func toCommentResponse(comment *comments.Comment) CommentResponse {
	return CommentResponse{
		ID:          comment.ID,
		ItemID:      comment.ItemID,
		ItemType:    comment.ItemType,
		Content:     comment.Content,
		CreatedBy:   comment.CreatedBy,
		CreatedAt:   comment.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
		UpdatedAt:   comment.UpdatedAt.Format("2006-01-02T15:04:05Z07:00"),
		CreatorName: "",
	}
}

// toCommentWithUserResponse converts a comment with user to response
func toCommentWithUserResponse(commentWithUser *comments.CommentWithUser) CommentResponse {
	return CommentResponse{
		ID:          commentWithUser.Comment.ID,
		ItemID:      commentWithUser.Comment.ItemID,
		ItemType:    commentWithUser.Comment.ItemType,
		Content:     commentWithUser.Comment.Content,
		CreatedBy:   commentWithUser.Comment.CreatedBy,
		CreatedAt:   commentWithUser.Comment.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
		UpdatedAt:   commentWithUser.Comment.UpdatedAt.Format("2006-01-02T15:04:05Z07:00"),
		CreatorName: commentWithUser.CreatorName,
	}
}

// CreateComment creates a new comment on an item
func (h *CommentHandler) CreateComment(c echo.Context) error {
	userID, ok := c.Get("user_id").(int)
	if !ok {
		return echo.NewHTTPError(http.StatusUnauthorized, "User not authenticated")
	}

	itemID, err := strconv.Atoi(c.Param("itemId"))
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid item ID")
	}

	itemType := c.Param("itemType")
	if itemType == "" {
		return echo.NewHTTPError(http.StatusBadRequest, "Item type is required")
	}

	var req CreateCommentRequest
	if err := c.Bind(&req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid request body")
	}

	if err := c.Validate(&req); err != nil {
		return err
	}

	comment, err := h.commentService.CreateComment(itemID, itemType, req.Content, userID)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, err.Error())
	}

	return c.JSON(http.StatusCreated, toCommentResponse(comment))
}

// GetCommentsByItem retrieves all comments for an item
func (h *CommentHandler) GetCommentsByItem(c echo.Context) error {
	itemID, err := strconv.Atoi(c.Param("itemId"))
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid item ID")
	}

	itemType := c.Param("itemType")
	if itemType == "" {
		return echo.NewHTTPError(http.StatusBadRequest, "Item type is required")
	}

	commentsWithUser, err := h.commentService.GetCommentsByItem(itemID, itemType)
	if err != nil {
		// Log the actual error for debugging
		c.Logger().Errorf("Error fetching comments for %s/%d: %v", itemType, itemID, err)
		return echo.NewHTTPError(http.StatusInternalServerError, err.Error())
	}

	var commentResponses []CommentResponse
	for _, commentWithUser := range commentsWithUser {
		commentResponses = append(commentResponses, toCommentWithUserResponse(&commentWithUser))
	}

	if commentResponses == nil {
		commentResponses = []CommentResponse{}
	}

	return c.JSON(http.StatusOK, CommentsListResponse{
		Comments: commentResponses,
		Total:    int64(len(commentResponses)),
	})
}

// GetComment retrieves a specific comment
func (h *CommentHandler) GetComment(c echo.Context) error {
	commentID, err := strconv.Atoi(c.Param("commentId"))
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid comment ID")
	}

	comment, err := h.commentService.GetComment(commentID)
	if err != nil {
		return echo.NewHTTPError(http.StatusNotFound, err.Error())
	}

	return c.JSON(http.StatusOK, toCommentResponse(comment))
}

// UpdateComment updates an existing comment
func (h *CommentHandler) UpdateComment(c echo.Context) error {
	userID, ok := c.Get("user_id").(int)
	if !ok {
		return echo.NewHTTPError(http.StatusUnauthorized, "User not authenticated")
	}

	commentID, err := strconv.Atoi(c.Param("commentId"))
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid comment ID")
	}

	var req UpdateCommentRequest
	if err := c.Bind(&req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid request body")
	}

	if err := c.Validate(&req); err != nil {
		return err
	}

	comment, err := h.commentService.UpdateComment(commentID, req.Content, userID)
	if err != nil {
		if err.Error() == "comment not found" {
			return echo.NewHTTPError(http.StatusNotFound, err.Error())
		}
		if err.Error() == "unauthorized: you can only edit your own comments" {
			return echo.NewHTTPError(http.StatusForbidden, err.Error())
		}
		return echo.NewHTTPError(http.StatusInternalServerError, err.Error())
	}

	return c.JSON(http.StatusOK, toCommentResponse(comment))
}

// DeleteComment deletes a comment
func (h *CommentHandler) DeleteComment(c echo.Context) error {
	userID, ok := c.Get("user_id").(int)
	if !ok {
		return echo.NewHTTPError(http.StatusUnauthorized, "User not authenticated")
	}

	commentID, err := strconv.Atoi(c.Param("commentId"))
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid comment ID")
	}

	if err := h.commentService.DeleteComment(commentID, userID); err != nil {
		if err.Error() == "comment not found" {
			return echo.NewHTTPError(http.StatusNotFound, err.Error())
		}
		if err.Error() == "unauthorized: you can only delete your own comments" {
			return echo.NewHTTPError(http.StatusForbidden, err.Error())
		}
		return echo.NewHTTPError(http.StatusInternalServerError, err.Error())
	}

	return c.NoContent(http.StatusNoContent)
}

// RegisterRoutes registers the comment routes
func (h *CommentHandler) RegisterRoutes(e *echo.Echo, authMiddleware *AuthMiddleware, projectMiddleware *ProjectMiddleware) {
	comments := e.Group("/api/comments/:itemType/:itemId", authMiddleware.RequireAuth)

	comments.POST("", h.CreateComment)
	comments.GET("", h.GetCommentsByItem)

	commentItem := e.Group("/api/comments/:commentId", authMiddleware.RequireAuth)

	commentItem.GET("", h.GetComment)
	commentItem.PUT("", h.UpdateComment)
	commentItem.DELETE("", h.DeleteComment)
}
