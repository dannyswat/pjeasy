package apis

import (
	"net/http"

	"github.com/dannyswat/pjeasy/internal/sequences"
	"github.com/labstack/echo/v4"
)

type SequenceHandler struct {
	sequenceService *sequences.SequenceService
}

func NewSequenceHandler(sequenceService *sequences.SequenceService) *SequenceHandler {
	return &SequenceHandler{
		sequenceService: sequenceService,
	}
}

type SequenceResponse struct {
	ID               int    `json:"id"`
	ProjectID        int    `json:"projectId"`
	ItemType         string `json:"itemType"`
	Prefix           string `json:"prefix"`
	PaddedZeroLength int    `json:"paddedZeroLength"`
	CreatedAt        string `json:"createdAt"`
	UpdatedAt        string `json:"updatedAt"`
}

// toSequenceResponse converts a sequence model to response
func toSequenceResponse(seq *sequences.Sequence) SequenceResponse {
	return SequenceResponse{
		ID:               seq.ID,
		ProjectID:        seq.ProjectID,
		ItemType:         seq.ItemType,
		Prefix:           seq.Prefix,
		PaddedZeroLength: seq.PaddedZeroLength,
		CreatedAt:        seq.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
		UpdatedAt:        seq.UpdatedAt.Format("2006-01-02T15:04:05Z07:00"),
	}
}

// GenerateProjectSequences generates missing sequences for a project
func (h *SequenceHandler) GenerateProjectSequences(c echo.Context) error {
	projectID := c.Get("project_id").(int)

	if err := h.sequenceService.GenerateProjectSequences(projectID); err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, err.Error())
	}

	return c.JSON(http.StatusOK, map[string]string{
		"message": "Sequences generated successfully",
	})
}

// ListProjectSequences lists all sequences for a project
func (h *SequenceHandler) ListProjectSequences(c echo.Context) error {
	projectID := c.Get("project_id").(int)

	sequences, err := h.sequenceService.ListSequencesByProject(projectID)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, err.Error())
	}

	var response []SequenceResponse
	for _, seq := range sequences {
		response = append(response, toSequenceResponse(&seq))
	}

	if response == nil {
		response = []SequenceResponse{}
	}

	return c.JSON(http.StatusOK, response)
}

// RegisterRoutes registers the sequence routes
func (h *SequenceHandler) RegisterRoutes(e *echo.Echo, authMiddleware *AuthMiddleware, projectMiddleware *ProjectMiddleware) {
	sequences := e.Group("/api/projects/:projectId/sequences", authMiddleware.RequireAuth)

	sequences.GET("", h.ListProjectSequences, projectMiddleware.RequireProjectMember)
	sequences.POST("/generate", h.GenerateProjectSequences, projectMiddleware.RequireProjectAdmin)
}
