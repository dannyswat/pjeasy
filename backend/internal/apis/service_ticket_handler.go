package apis

import (
	"net/http"
	"strconv"
	"strings"

	"github.com/dannyswat/pjeasy/internal/service_tickets"
	"github.com/labstack/echo/v4"
)

type ServiceTicketHandler struct {
	ticketService *service_tickets.ServiceTicketService
}

func NewServiceTicketHandler(ticketService *service_tickets.ServiceTicketService) *ServiceTicketHandler {
	return &ServiceTicketHandler{
		ticketService: ticketService,
	}
}

type CreateServiceTicketRequest struct {
	Title       string `json:"title" validate:"required"`
	Description string `json:"description"`
	Priority    string `json:"priority"`
}

type UpdateServiceTicketRequest struct {
	Title       string `json:"title" validate:"required"`
	Description string `json:"description"`
	Priority    string `json:"priority"`
}

type UpdateServiceTicketStatusRequest struct {
	Status string `json:"status" validate:"required"`
}

type ServiceTicketResponse struct {
	ID          int    `json:"id"`
	RefNum      string `json:"refNum"`
	ProjectID   int    `json:"projectId"`
	Title       string `json:"title"`
	Description string `json:"description"`
	Status      string `json:"status"`
	Priority    string `json:"priority"`
	CreatedBy   int    `json:"createdBy"`
	CreatedAt   string `json:"createdAt"`
	UpdatedAt   string `json:"updatedAt"`
}

type ServiceTicketsListResponse struct {
	ServiceTickets []ServiceTicketResponse `json:"serviceTickets"`
	Total          int64                   `json:"total"`
	Page           int                     `json:"page"`
	PageSize       int                     `json:"pageSize"`
}

// toServiceTicketResponse converts a service ticket model to response
func toServiceTicketResponse(ticket *service_tickets.ServiceTicket) ServiceTicketResponse {
	return ServiceTicketResponse{
		ID:          ticket.ID,
		RefNum:      ticket.RefNum,
		ProjectID:   ticket.ProjectID,
		Title:       ticket.Title,
		Description: ticket.Description,
		Status:      ticket.Status,
		Priority:    ticket.Priority,
		CreatedBy:   ticket.CreatedBy,
		CreatedAt:   ticket.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
		UpdatedAt:   ticket.UpdatedAt.Format("2006-01-02T15:04:05Z07:00"),
	}
}

// CreateServiceTicket creates a new service ticket
func (h *ServiceTicketHandler) CreateServiceTicket(c echo.Context) error {
	userID, err := GetUserIDFromContext(c)
	if err != nil {
		return err
	}

	projectID, err := strconv.Atoi(c.Param("projectId"))
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid project ID")
	}

	req := new(CreateServiceTicketRequest)
	if err := c.Bind(req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid request payload")
	}

	if err := c.Validate(req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}

	ticket, err := h.ticketService.CreateServiceTicket(projectID, req.Title, req.Description, req.Priority, userID)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}

	response := toServiceTicketResponse(ticket)
	return c.JSON(http.StatusCreated, response)
}

// GetServiceTicket retrieves a service ticket by ID
func (h *ServiceTicketHandler) GetServiceTicket(c echo.Context) error {
	userID, err := GetUserIDFromContext(c)
	if err != nil {
		return err
	}

	ticketID, err := strconv.Atoi(c.Param("ticketId"))
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid ticket ID")
	}

	ticket, err := h.ticketService.GetServiceTicket(ticketID, userID)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}

	response := toServiceTicketResponse(ticket)
	return c.JSON(http.StatusOK, response)
}

// UpdateServiceTicket updates a service ticket
func (h *ServiceTicketHandler) UpdateServiceTicket(c echo.Context) error {
	userID, err := GetUserIDFromContext(c)
	if err != nil {
		return err
	}

	ticketID, err := strconv.Atoi(c.Param("ticketId"))
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid ticket ID")
	}

	req := new(UpdateServiceTicketRequest)
	if err := c.Bind(req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid request payload")
	}

	if err := c.Validate(req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}

	ticket, err := h.ticketService.UpdateServiceTicket(ticketID, req.Title, req.Description, req.Priority, userID)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}

	response := toServiceTicketResponse(ticket)
	return c.JSON(http.StatusOK, response)
}

// UpdateServiceTicketStatus updates the status of a service ticket
func (h *ServiceTicketHandler) UpdateServiceTicketStatus(c echo.Context) error {
	userID, err := GetUserIDFromContext(c)
	if err != nil {
		return err
	}

	ticketID, err := strconv.Atoi(c.Param("ticketId"))
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid ticket ID")
	}

	req := new(UpdateServiceTicketStatusRequest)
	if err := c.Bind(req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid request payload")
	}

	if err := c.Validate(req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}

	ticket, err := h.ticketService.UpdateServiceTicketStatus(ticketID, req.Status, userID)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}

	response := toServiceTicketResponse(ticket)
	return c.JSON(http.StatusOK, response)
}

// DeleteServiceTicket deletes a service ticket
func (h *ServiceTicketHandler) DeleteServiceTicket(c echo.Context) error {
	userID, err := GetUserIDFromContext(c)
	if err != nil {
		return err
	}

	ticketID, err := strconv.Atoi(c.Param("ticketId"))
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid ticket ID")
	}

	if err := h.ticketService.DeleteServiceTicket(ticketID, userID); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}

	return c.NoContent(http.StatusNoContent)
}

// ListServiceTickets lists service tickets for a project
func (h *ServiceTicketHandler) ListServiceTickets(c echo.Context) error {
	userID, err := GetUserIDFromContext(c)
	if err != nil {
		return err
	}

	projectID, err := strconv.Atoi(c.Param("projectId"))
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

	// Parse status - can be comma-separated for multiple statuses
	statusParam := c.QueryParam("status")
	var statuses []string
	if statusParam != "" {
		statuses = strings.Split(statusParam, ",")
	}

	priority := c.QueryParam("priority")
	sortBy := c.QueryParam("sortBy")
	if sortBy == "" {
		sortBy = "priority"
	}

	tickets, total, err := h.ticketService.ListServiceTickets(projectID, page, pageSize, statuses, priority, sortBy, userID)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}

	ticketResponses := make([]ServiceTicketResponse, len(tickets))
	for i, ticket := range tickets {
		ticketResponses[i] = toServiceTicketResponse(&ticket)
	}

	response := ServiceTicketsListResponse{
		ServiceTickets: ticketResponses,
		Total:          total,
		Page:           page,
		PageSize:       pageSize,
	}

	return c.JSON(http.StatusOK, response)
}

// RegisterRoutes registers service ticket routes
func (h *ServiceTicketHandler) RegisterRoutes(e *echo.Echo, authMiddleware *AuthMiddleware, projectMiddleware *ProjectMiddleware) {
	tickets := e.Group("/api/projects/:projectId/service-tickets", authMiddleware.RequireAuth, projectMiddleware.RequireProjectMember)

	tickets.POST("", h.CreateServiceTicket)
	tickets.GET("", h.ListServiceTickets)
	tickets.GET("/count-new", h.CountNewServiceTickets)

	ticketItem := e.Group("/api/service-tickets/:ticketId", authMiddleware.RequireAuth)

	ticketItem.GET("", h.GetServiceTicket)
	ticketItem.PUT("", h.UpdateServiceTicket)
	ticketItem.PATCH("/status", h.UpdateServiceTicketStatus)
	ticketItem.DELETE("", h.DeleteServiceTicket)
}

// CountNewServiceTickets returns the count of service tickets with status "New"
func (h *ServiceTicketHandler) CountNewServiceTickets(c echo.Context) error {
	userID, err := GetUserIDFromContext(c)
	if err != nil {
		return err
	}

	projectID, err := strconv.Atoi(c.Param("projectId"))
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid project ID")
	}

	count, err := h.ticketService.CountNewServiceTickets(projectID, userID)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}

	return c.JSON(http.StatusOK, map[string]int64{"count": count})
}
