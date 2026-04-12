package apis

import (
	"net/http"
	"strconv"
	"time"

	"github.com/dannyswat/pjeasy/internal/user_dailies"
	"github.com/labstack/echo/v4"
)

type UserDailyHandler struct {
	service *user_dailies.UserDailyService
}

func NewUserDailyHandler(service *user_dailies.UserDailyService) *UserDailyHandler {
	return &UserDailyHandler{service: service}
}

type userDailyBoardResponse struct {
	Date           string                       `json:"date"`
	Items          []userDailyItemResponse      `json:"items"`
	CandidateItems []userDailyCandidateResponse `json:"candidateItems"`
	TimeLogs       []userDailyTimeLogResponse   `json:"timeLogs"`
	TotalUnits     int                          `json:"totalUnits"`
	TotalHours     float64                      `json:"totalHours"`
}

type userDailyItemResponse struct {
	ID            int                        `json:"id"`
	UserID        int                        `json:"userId"`
	ProjectID     int                        `json:"projectId"`
	ProjectName   string                     `json:"projectName"`
	Date          string                     `json:"date"`
	ItemType      string                     `json:"itemType"`
	ItemID        int                        `json:"itemId"`
	Title         string                     `json:"title"`
	Status        string                     `json:"status"`
	RefNum        string                     `json:"refNum,omitempty"`
	TimeLogs      []userDailyTimeLogResponse `json:"timeLogs"`
	TotalUnits    int                        `json:"totalUnits"`
	TotalHours    float64                    `json:"totalHours"`
	StatusOptions []string                   `json:"statusOptions"`
	CreatedAt     time.Time                  `json:"createdAt"`
	UpdatedAt     time.Time                  `json:"updatedAt"`
}

type userDailyCandidateResponse struct {
	ProjectID     int      `json:"projectId"`
	ProjectName   string   `json:"projectName"`
	ItemType      string   `json:"itemType"`
	ItemID        int      `json:"itemId"`
	Title         string   `json:"title"`
	Status        string   `json:"status"`
	RefNum        string   `json:"refNum,omitempty"`
	AlreadyAdded  bool     `json:"alreadyAdded"`
	StatusOptions []string `json:"statusOptions"`
}

type userDailyTimeLogResponse struct {
	ID              int       `json:"id"`
	UserID          int       `json:"userId"`
	ProjectID       int       `json:"projectId"`
	UserDailyItemID int       `json:"userDailyItemId"`
	Date            string    `json:"date"`
	StartUnit       int       `json:"startUnit"`
	DurationUnits   int       `json:"durationUnits"`
	CreatedAt       time.Time `json:"createdAt"`
	UpdatedAt       time.Time `json:"updatedAt"`
}

type userDailySummaryResponse struct {
	Range      string                            `json:"range"`
	StartDate  string                            `json:"startDate"`
	EndDate    string                            `json:"endDate"`
	TotalUnits int                               `json:"totalUnits"`
	TotalHours float64                           `json:"totalHours"`
	Projects   []userDailyProjectSummaryResponse `json:"projects"`
	Days       []userDailyDaySummaryResponse     `json:"days"`
}

type userDailyProjectSummaryResponse struct {
	ProjectID   int     `json:"projectId"`
	ProjectName string  `json:"projectName"`
	TotalUnits  int     `json:"totalUnits"`
	TotalHours  float64 `json:"totalHours"`
}

type userDailyDaySummaryResponse struct {
	Date       string  `json:"date"`
	TotalUnits int     `json:"totalUnits"`
	TotalHours float64 `json:"totalHours"`
}

type addUserDailyItemRequest struct {
	Date     string `json:"date" validate:"required,datetime=2006-01-02"`
	ItemType string `json:"itemType" validate:"required,oneof=task issue feature"`
	ItemID   int    `json:"itemId" validate:"required,gt=0"`
}

type updateUserDailyItemStatusRequest struct {
	Status string `json:"status" validate:"required"`
}

type createUserDailyTimeLogRequest struct {
	UserDailyItemID int `json:"userDailyItemId" validate:"required,gt=0"`
	DurationUnits   int `json:"durationUnits" validate:"required,gt=0,lte=24"`
}

type updateUserDailyTimeLogRequest struct {
	DurationUnits int `json:"durationUnits" validate:"required,gt=0,lte=24"`
}

func parseUserDailyDate(raw string) (time.Time, error) {
	if raw == "" {
		return time.Now().UTC(), nil
	}
	return time.Parse("2006-01-02", raw)
}

func toUserDailyTimeLogResponse(log user_dailies.UserDailyTimeLog) userDailyTimeLogResponse {
	return userDailyTimeLogResponse{
		ID:              log.ID,
		UserID:          log.UserID,
		ProjectID:       log.ProjectID,
		UserDailyItemID: log.UserDailyItemID,
		Date:            log.LogDate.Format("2006-01-02"),
		StartUnit:       log.StartUnit,
		DurationUnits:   log.DurationUnits,
		CreatedAt:       log.CreatedAt,
		UpdatedAt:       log.UpdatedAt,
	}
}

func toUserDailyItemResponse(item user_dailies.UserDailyItemDetails) userDailyItemResponse {
	timeLogs := make([]userDailyTimeLogResponse, 0, len(item.TimeLogs))
	for _, log := range item.TimeLogs {
		timeLogs = append(timeLogs, toUserDailyTimeLogResponse(log))
	}
	return userDailyItemResponse{
		ID:            item.DailyItem.ID,
		UserID:        item.DailyItem.UserID,
		ProjectID:     item.DailyItem.ProjectID,
		ProjectName:   item.ProjectName,
		Date:          item.DailyItem.WorkDate.Format("2006-01-02"),
		ItemType:      item.DailyItem.ItemType,
		ItemID:        item.DailyItem.ItemID,
		Title:         item.Title,
		Status:        item.Status,
		RefNum:        item.RefNum,
		TimeLogs:      timeLogs,
		TotalUnits:    item.TotalUnits,
		TotalHours:    item.TotalHours,
		StatusOptions: item.StatusOptions,
		CreatedAt:     item.DailyItem.CreatedAt,
		UpdatedAt:     item.DailyItem.UpdatedAt,
	}
}

func toUserDailyBoardResponse(board *user_dailies.UserDailyBoard) userDailyBoardResponse {
	items := make([]userDailyItemResponse, 0, len(board.Items))
	for _, item := range board.Items {
		items = append(items, toUserDailyItemResponse(item))
	}
	candidates := make([]userDailyCandidateResponse, 0, len(board.CandidateItems))
	for _, candidate := range board.CandidateItems {
		candidates = append(candidates, userDailyCandidateResponse{
			ProjectID:     candidate.ProjectID,
			ProjectName:   candidate.ProjectName,
			ItemType:      candidate.ItemType,
			ItemID:        candidate.ItemID,
			Title:         candidate.Title,
			Status:        candidate.Status,
			RefNum:        candidate.RefNum,
			AlreadyAdded:  candidate.AlreadyAdded,
			StatusOptions: candidate.StatusOptions,
		})
	}
	logs := make([]userDailyTimeLogResponse, 0, len(board.TimeLogs))
	for _, log := range board.TimeLogs {
		logs = append(logs, toUserDailyTimeLogResponse(log))
	}
	return userDailyBoardResponse{
		Date:           board.WorkDate.Format("2006-01-02"),
		Items:          items,
		CandidateItems: candidates,
		TimeLogs:       logs,
		TotalUnits:     board.TotalUnits,
		TotalHours:     board.TotalHours,
	}
}

func (h *UserDailyHandler) GetBoard(c echo.Context) error {
	userID, err := GetUserIDFromContext(c)
	if err != nil {
		return err
	}
	workDate, err := parseUserDailyDate(c.QueryParam("date"))
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid date")
	}
	board, err := h.service.GetBoard(userID, workDate)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, err.Error())
	}
	return c.JSON(http.StatusOK, toUserDailyBoardResponse(board))
}

func (h *UserDailyHandler) AddItem(c echo.Context) error {
	userID, err := GetUserIDFromContext(c)
	if err != nil {
		return err
	}
	var req addUserDailyItemRequest
	if err := c.Bind(&req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid request")
	}
	if err := c.Validate(&req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}
	workDate, err := parseUserDailyDate(req.Date)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid date")
	}
	item, err := h.service.AddItem(userID, workDate, req.ItemType, req.ItemID)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, err.Error())
	}
	return c.JSON(http.StatusCreated, toUserDailyItemResponse(*item))
}

func (h *UserDailyHandler) RemoveItem(c echo.Context) error {
	userID, err := GetUserIDFromContext(c)
	if err != nil {
		return err
	}
	dailyItemID, err := strconv.Atoi(c.Param("itemId"))
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid daily item ID")
	}
	if err := h.service.RemoveItem(userID, dailyItemID); err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, err.Error())
	}
	return c.NoContent(http.StatusNoContent)
}

func (h *UserDailyHandler) UpdateItemStatus(c echo.Context) error {
	userID, err := GetUserIDFromContext(c)
	if err != nil {
		return err
	}
	dailyItemID, err := strconv.Atoi(c.Param("itemId"))
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid daily item ID")
	}
	var req updateUserDailyItemStatusRequest
	if err := c.Bind(&req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid request")
	}
	if err := c.Validate(&req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}
	item, err := h.service.UpdateItemStatus(userID, dailyItemID, req.Status)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, err.Error())
	}
	return c.JSON(http.StatusOK, toUserDailyItemResponse(*item))
}

func (h *UserDailyHandler) CreateTimeLog(c echo.Context) error {
	userID, err := GetUserIDFromContext(c)
	if err != nil {
		return err
	}
	var req createUserDailyTimeLogRequest
	if err := c.Bind(&req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid request")
	}
	if err := c.Validate(&req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}
	log, err := h.service.CreateTimeLog(userID, req.UserDailyItemID, 0, req.DurationUnits)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, err.Error())
	}
	return c.JSON(http.StatusCreated, toUserDailyTimeLogResponse(*log))
}

func (h *UserDailyHandler) UpdateTimeLog(c echo.Context) error {
	userID, err := GetUserIDFromContext(c)
	if err != nil {
		return err
	}
	timeLogID, err := strconv.Atoi(c.Param("timeLogId"))
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid time log ID")
	}
	var req updateUserDailyTimeLogRequest
	if err := c.Bind(&req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid request")
	}
	if err := c.Validate(&req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}
	log, err := h.service.UpdateTimeLog(userID, timeLogID, 0, req.DurationUnits)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, err.Error())
	}
	return c.JSON(http.StatusOK, toUserDailyTimeLogResponse(*log))
}

func (h *UserDailyHandler) DeleteTimeLog(c echo.Context) error {
	userID, err := GetUserIDFromContext(c)
	if err != nil {
		return err
	}
	timeLogID, err := strconv.Atoi(c.Param("timeLogId"))
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid time log ID")
	}
	if err := h.service.DeleteTimeLog(userID, timeLogID); err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, err.Error())
	}
	return c.NoContent(http.StatusNoContent)
}

func (h *UserDailyHandler) GetSummary(c echo.Context) error {
	userID, err := GetUserIDFromContext(c)
	if err != nil {
		return err
	}
	workDate, err := parseUserDailyDate(c.QueryParam("date"))
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid date")
	}
	summary, err := h.service.GetSummary(userID, workDate, c.QueryParam("range"))
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, err.Error())
	}
	projects := make([]userDailyProjectSummaryResponse, 0, len(summary.Projects))
	for _, project := range summary.Projects {
		projects = append(projects, userDailyProjectSummaryResponse(project))
	}
	days := make([]userDailyDaySummaryResponse, 0, len(summary.Days))
	for _, day := range summary.Days {
		days = append(days, userDailyDaySummaryResponse{Date: day.Date.Format("2006-01-02"), TotalUnits: day.TotalUnits, TotalHours: day.TotalHours})
	}
	return c.JSON(http.StatusOK, userDailySummaryResponse{
		Range:      summary.Range,
		StartDate:  summary.StartDate.Format("2006-01-02"),
		EndDate:    summary.EndDate.Format("2006-01-02"),
		TotalUnits: summary.TotalUnits,
		TotalHours: summary.TotalHours,
		Projects:   projects,
		Days:       days,
	})
}

func (h *UserDailyHandler) RegisterRoutes(e *echo.Echo, authMiddleware *AuthMiddleware) {
	group := e.Group("/api/user-daily", authMiddleware.RequireAuth)
	group.GET("", h.GetBoard)
	group.GET("/summary", h.GetSummary)
	group.POST("/items", h.AddItem)
	group.DELETE("/items/:itemId", h.RemoveItem)
	group.PATCH("/items/:itemId/status", h.UpdateItemStatus)
	group.POST("/time-logs", h.CreateTimeLog)
	group.PATCH("/time-logs/:timeLogId", h.UpdateTimeLog)
	group.DELETE("/time-logs/:timeLogId", h.DeleteTimeLog)
}
