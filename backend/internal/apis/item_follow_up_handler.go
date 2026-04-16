package apis

import (
	"net/http"
	"strconv"
	"time"

	"github.com/dannyswat/pjeasy/internal/item_follow_ups"
	"github.com/labstack/echo/v4"
)

type ItemFollowUpHandler struct {
	service *item_follow_ups.ItemFollowUpService
}

func NewItemFollowUpHandler(service *item_follow_ups.ItemFollowUpService) *ItemFollowUpHandler {
	return &ItemFollowUpHandler{service: service}
}

type CreateItemFollowUpRequest struct {
	FollowUpDate string `json:"followUpDate" validate:"required"`
	Content      string `json:"content" validate:"required"`
}

type UpdateItemFollowUpRequest struct {
	FollowUpDate string `json:"followUpDate" validate:"required"`
	Content      string `json:"content" validate:"required"`
}

type ItemFollowUpResponse struct {
	ID           int    `json:"id"`
	ItemID       int    `json:"itemId"`
	ItemType     string `json:"itemType"`
	FollowUpDate string `json:"followUpDate"`
	Content      string `json:"content"`
	CreatedBy    int    `json:"createdBy"`
	CreatedAt    string `json:"createdAt"`
	UpdatedAt    string `json:"updatedAt"`
	CreatorName  string `json:"creatorName"`
}

type ItemFollowUpsListResponse struct {
	FollowUps []ItemFollowUpResponse `json:"followUps"`
	Total     int64                  `json:"total"`
}

func toItemFollowUpResponse(followUp *item_follow_ups.ItemFollowUp) ItemFollowUpResponse {
	return ItemFollowUpResponse{
		ID:           followUp.ID,
		ItemID:       followUp.ItemID,
		ItemType:     followUp.ItemType,
		FollowUpDate: followUp.FollowUpDate.Format("2006-01-02"),
		Content:      followUp.Content,
		CreatedBy:    followUp.CreatedBy,
		CreatedAt:    followUp.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
		UpdatedAt:    followUp.UpdatedAt.Format("2006-01-02T15:04:05Z07:00"),
	}
}

func toItemFollowUpWithUserResponse(followUp *item_follow_ups.ItemFollowUpWithUser) ItemFollowUpResponse {
	response := toItemFollowUpResponse(&followUp.ItemFollowUp)
	response.CreatorName = followUp.CreatorName
	return response
}

func parseFollowUpDate(raw string) (time.Time, error) {
	return time.Parse("2006-01-02", raw)
}

func (h *ItemFollowUpHandler) CreateItemFollowUp(c echo.Context) error {
	userID, err := GetUserIDFromContext(c)
	if err != nil {
		return err
	}

	itemID, err := strconv.Atoi(c.Param("itemId"))
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid item ID")
	}

	itemType := c.Param("itemType")
	if itemType == "" {
		return echo.NewHTTPError(http.StatusBadRequest, "Item type is required")
	}

	var req CreateItemFollowUpRequest
	if err := c.Bind(&req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid request body")
	}
	if err := c.Validate(&req); err != nil {
		return err
	}

	followUpDate, err := parseFollowUpDate(req.FollowUpDate)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid follow-up date")
	}

	followUp, err := h.service.CreateItemFollowUp(itemID, itemType, followUpDate, req.Content, userID)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}

	return c.JSON(http.StatusCreated, toItemFollowUpResponse(followUp))
}

func (h *ItemFollowUpHandler) GetItemFollowUpsByItem(c echo.Context) error {
	userID, err := GetUserIDFromContext(c)
	if err != nil {
		return err
	}

	itemID, err := strconv.Atoi(c.Param("itemId"))
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid item ID")
	}

	itemType := c.Param("itemType")
	if itemType == "" {
		return echo.NewHTTPError(http.StatusBadRequest, "Item type is required")
	}

	followUps, err := h.service.GetItemFollowUpsByItem(itemID, itemType, userID)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}

	responses := make([]ItemFollowUpResponse, 0, len(followUps))
	for _, followUp := range followUps {
		responses = append(responses, toItemFollowUpWithUserResponse(&followUp))
	}
	if responses == nil {
		responses = []ItemFollowUpResponse{}
	}

	return c.JSON(http.StatusOK, ItemFollowUpsListResponse{
		FollowUps: responses,
		Total:     int64(len(responses)),
	})
}

func (h *ItemFollowUpHandler) GetItemFollowUp(c echo.Context) error {
	followUpID, err := strconv.Atoi(c.Param("followUpId"))
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid follow-up ID")
	}

	userID, err := GetUserIDFromContext(c)
	if err != nil {
		return err
	}

	followUp, err := h.service.GetItemFollowUp(followUpID, userID)
	if err != nil {
		return echo.NewHTTPError(http.StatusNotFound, err.Error())
	}

	return c.JSON(http.StatusOK, toItemFollowUpResponse(followUp))
}

func (h *ItemFollowUpHandler) UpdateItemFollowUp(c echo.Context) error {
	userID, err := GetUserIDFromContext(c)
	if err != nil {
		return err
	}

	followUpID, err := strconv.Atoi(c.Param("followUpId"))
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid follow-up ID")
	}

	var req UpdateItemFollowUpRequest
	if err := c.Bind(&req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid request body")
	}
	if err := c.Validate(&req); err != nil {
		return err
	}

	followUpDate, err := parseFollowUpDate(req.FollowUpDate)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid follow-up date")
	}

	followUp, err := h.service.UpdateItemFollowUp(followUpID, followUpDate, req.Content, userID)
	if err != nil {
		if err.Error() == "item follow-up not found" {
			return echo.NewHTTPError(http.StatusNotFound, err.Error())
		}
		if err.Error() == "unauthorized: you can only edit your own follow-ups" {
			return echo.NewHTTPError(http.StatusForbidden, err.Error())
		}
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}

	return c.JSON(http.StatusOK, toItemFollowUpResponse(followUp))
}

func (h *ItemFollowUpHandler) DeleteItemFollowUp(c echo.Context) error {
	userID, err := GetUserIDFromContext(c)
	if err != nil {
		return err
	}

	followUpID, err := strconv.Atoi(c.Param("followUpId"))
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid follow-up ID")
	}

	if err := h.service.DeleteItemFollowUp(followUpID, userID); err != nil {
		if err.Error() == "item follow-up not found" {
			return echo.NewHTTPError(http.StatusNotFound, err.Error())
		}
		if err.Error() == "unauthorized: you can only delete your own follow-ups" {
			return echo.NewHTTPError(http.StatusForbidden, err.Error())
		}
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}

	return c.NoContent(http.StatusNoContent)
}

func (h *ItemFollowUpHandler) RegisterRoutes(e *echo.Echo, authMiddleware *AuthMiddleware) {
	followUps := e.Group("/api/item-follow-ups/:itemType/:itemId", authMiddleware.RequireAuth)
	followUps.POST("", h.CreateItemFollowUp)
	followUps.GET("", h.GetItemFollowUpsByItem)

	followUpItem := e.Group("/api/item-follow-ups/:followUpId", authMiddleware.RequireAuth)
	followUpItem.GET("", h.GetItemFollowUp)
	followUpItem.PUT("", h.UpdateItemFollowUp)
	followUpItem.DELETE("", h.DeleteItemFollowUp)
}
