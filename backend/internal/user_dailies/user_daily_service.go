package user_dailies

import (
	"errors"
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/dannyswat/pjeasy/internal/features"
	"github.com/dannyswat/pjeasy/internal/issues"
	"github.com/dannyswat/pjeasy/internal/projects"
	"github.com/dannyswat/pjeasy/internal/tasks"
)

const (
	MaxTimeUnitsPerDay = 24
	DefaultTimeUnits   = 1
)

type UserDailyItemDetails struct {
	DailyItem     UserDailyItem
	ProjectName   string
	Title         string
	Status        string
	RefNum        string
	TimeLogs      []UserDailyTimeLog
	TotalUnits    int
	TotalHours    float64
	StatusOptions []string
}

type UserDailyCandidate struct {
	ProjectID     int
	ProjectName   string
	ItemType      string
	ItemID        int
	Title         string
	Status        string
	RefNum        string
	AlreadyAdded  bool
	StatusOptions []string
}

type UserDailyBoard struct {
	WorkDate       time.Time
	Items          []UserDailyItemDetails
	CandidateItems []UserDailyCandidate
	TimeLogs       []UserDailyTimeLog
	TotalUnits     int
	TotalHours     float64
}

type UserDailyProjectSummary struct {
	ProjectID   int
	ProjectName string
	TotalUnits  int
	TotalHours  float64
}

type UserDailyDaySummary struct {
	Date       time.Time
	TotalUnits int
	TotalHours float64
}

type UserDailySummary struct {
	Range      string
	StartDate  time.Time
	EndDate    time.Time
	TotalUnits int
	TotalHours float64
	Projects   []UserDailyProjectSummary
	Days       []UserDailyDaySummary
}

type dailySourceItem struct {
	ProjectID     int
	ProjectName   string
	ItemType      string
	ItemID        int
	Title         string
	Status        string
	RefNum        string
	StatusOptions []string
}

type UserDailyService struct {
	itemRepo       *UserDailyItemRepository
	timeLogRepo    *UserDailyTimeLogRepository
	projectRepo    *projects.ProjectRepository
	memberRepo     *projects.ProjectMemberRepository
	featureRepo    *features.FeatureRepository
	issueRepo      *issues.IssueRepository
	taskRepo       *tasks.TaskRepository
	featureService *features.FeatureService
	issueService   *issues.IssueService
	taskService    *tasks.TaskService
}

func NewUserDailyService(itemRepo *UserDailyItemRepository, timeLogRepo *UserDailyTimeLogRepository, projectRepo *projects.ProjectRepository, memberRepo *projects.ProjectMemberRepository, featureRepo *features.FeatureRepository, issueRepo *issues.IssueRepository, taskRepo *tasks.TaskRepository, featureService *features.FeatureService, issueService *issues.IssueService, taskService *tasks.TaskService) *UserDailyService {
	return &UserDailyService{
		itemRepo:       itemRepo,
		timeLogRepo:    timeLogRepo,
		projectRepo:    projectRepo,
		memberRepo:     memberRepo,
		featureRepo:    featureRepo,
		issueRepo:      issueRepo,
		taskRepo:       taskRepo,
		featureService: featureService,
		issueService:   issueService,
		taskService:    taskService,
	}
}

func normalizeDate(value time.Time) time.Time {
	return time.Date(value.Year(), value.Month(), value.Day(), 0, 0, 0, 0, time.UTC)
}

func unitHours(units int) float64 {
	return float64(units)
}

func totalDurationUnits(logs []UserDailyTimeLog) int {
	total := 0
	for _, log := range logs {
		total += log.DurationUnits
	}
	return total
}

func (s *UserDailyService) GetBoard(userID int, workDate time.Time) (*UserDailyBoard, error) {
	workDate = normalizeDate(workDate)
	items, err := s.itemRepo.ListByUserAndDate(userID, workDate)
	if err != nil {
		return nil, err
	}
	logs, err := s.timeLogRepo.ListByUserAndDate(userID, workDate)
	if err != nil {
		return nil, err
	}

	logByItemID := make(map[int][]UserDailyTimeLog)
	totalUnits := 0
	for _, log := range logs {
		logByItemID[log.UserDailyItemID] = append(logByItemID[log.UserDailyItemID], log)
		totalUnits += log.DurationUnits
	}

	details := make([]UserDailyItemDetails, 0, len(items))
	existingKeys := make(map[string]struct{}, len(items))
	for _, item := range items {
		key := item.ItemType + ":" + strconvItoa(item.ItemID)
		existingKeys[key] = struct{}{}
		source, err := s.getSourceItemForUser(userID, item.ItemType, item.ItemID)
		if err != nil {
			return nil, err
		}
		itemLogs := logByItemID[item.ID]
		itemUnits := 0
		for _, log := range itemLogs {
			itemUnits += log.DurationUnits
		}
		details = append(details, UserDailyItemDetails{
			DailyItem:     item,
			ProjectName:   source.ProjectName,
			Title:         source.Title,
			Status:        source.Status,
			RefNum:        source.RefNum,
			TimeLogs:      itemLogs,
			TotalUnits:    itemUnits,
			TotalHours:    unitHours(itemUnits),
			StatusOptions: source.StatusOptions,
		})
	}

	candidates, err := s.listCandidateItems(userID, existingKeys)
	if err != nil {
		return nil, err
	}

	return &UserDailyBoard{
		WorkDate:       workDate,
		Items:          details,
		CandidateItems: candidates,
		TimeLogs:       logs,
		TotalUnits:     totalUnits,
		TotalHours:     unitHours(totalUnits),
	}, nil
}

func (s *UserDailyService) AddItem(userID int, workDate time.Time, itemType string, itemID int) (*UserDailyItemDetails, error) {
	workDate = normalizeDate(workDate)
	itemType = strings.ToLower(strings.TrimSpace(itemType))
	if !IsValidItemType(itemType) {
		return nil, errors.New("invalid item type")
	}
	if itemID <= 0 {
		return nil, errors.New("invalid item ID")
	}
	existing, err := s.itemRepo.GetByUserDateAndItem(userID, workDate, itemType, itemID)
	if err != nil {
		return nil, err
	}
	if existing != nil {
		return nil, errors.New("item already added to this day")
	}

	source, err := s.getSourceItemForUser(userID, itemType, itemID)
	if err != nil {
		return nil, err
	}
	now := time.Now().UTC()
	item := &UserDailyItem{
		UserID:    userID,
		ProjectID: source.ProjectID,
		WorkDate:  workDate,
		ItemType:  itemType,
		ItemID:    itemID,
		CreatedAt: now,
		UpdatedAt: now,
	}
	if err := s.itemRepo.Create(item); err != nil {
		return nil, err
	}

	return &UserDailyItemDetails{
		DailyItem:     *item,
		ProjectName:   source.ProjectName,
		Title:         source.Title,
		Status:        source.Status,
		RefNum:        source.RefNum,
		TimeLogs:      []UserDailyTimeLog{},
		TotalUnits:    0,
		TotalHours:    0,
		StatusOptions: source.StatusOptions,
	}, nil
}

func (s *UserDailyService) RemoveItem(userID int, dailyItemID int) error {
	item, err := s.itemRepo.GetByID(dailyItemID)
	if err != nil {
		return err
	}
	if item == nil || item.UserID != userID {
		return errors.New("daily item not found")
	}
	if err := s.timeLogRepo.DeleteByDailyItemID(item.ID); err != nil {
		return err
	}
	if err := s.itemRepo.Delete(item.ID); err != nil {
		return err
	}
	return s.restackDayLogs(userID, item.WorkDate)
}

func (s *UserDailyService) UpdateItemStatus(userID int, dailyItemID int, status string) (*UserDailyItemDetails, error) {
	item, err := s.itemRepo.GetByID(dailyItemID)
	if err != nil {
		return nil, err
	}
	if item == nil || item.UserID != userID {
		return nil, errors.New("daily item not found")
	}

	status = strings.TrimSpace(status)
	if status == "" {
		return nil, errors.New("status is required")
	}

	switch item.ItemType {
	case ItemTypeTask:
		if _, err := s.taskService.UpdateTaskStatus(item.ItemID, status, userID); err != nil {
			return nil, err
		}
	case ItemTypeIssue:
		if _, err := s.issueService.UpdateIssueStatus(item.ItemID, status, userID); err != nil {
			return nil, err
		}
	case ItemTypeFeature:
		if _, err := s.featureService.UpdateFeatureStatus(item.ItemID, status, userID); err != nil {
			return nil, err
		}
	default:
		return nil, errors.New("invalid item type")
	}

	board, err := s.GetBoard(userID, item.WorkDate)
	if err != nil {
		return nil, err
	}
	for _, detail := range board.Items {
		if detail.DailyItem.ID == dailyItemID {
			return &detail, nil
		}
	}
	return nil, errors.New("daily item not found after status update")
}

func (s *UserDailyService) CreateTimeLog(userID int, dailyItemID int, startUnit int, durationUnits int) (*UserDailyTimeLog, error) {
	item, err := s.itemRepo.GetByID(dailyItemID)
	if err != nil {
		return nil, err
	}
	if item == nil || item.UserID != userID {
		return nil, errors.New("daily item not found")
	}
	if err := validateDurationUnits(durationUnits); err != nil {
		return nil, err
	}
	logs, err := s.timeLogRepo.ListByUserAndDate(userID, item.WorkDate)
	if err != nil {
		return nil, err
	}
	startUnit = totalDurationUnits(logs)
	if err := validateTimeRange(startUnit, durationUnits); err != nil {
		return nil, err
	}

	now := time.Now().UTC()
	log := &UserDailyTimeLog{
		UserID:          userID,
		ProjectID:       item.ProjectID,
		UserDailyItemID: item.ID,
		LogDate:         item.WorkDate,
		StartUnit:       startUnit,
		DurationUnits:   durationUnits,
		CreatedAt:       now,
		UpdatedAt:       now,
	}
	if err := s.timeLogRepo.Create(log); err != nil {
		return nil, err
	}
	return log, nil
}

func (s *UserDailyService) UpdateTimeLog(userID int, timeLogID int, startUnit int, durationUnits int) (*UserDailyTimeLog, error) {
	log, err := s.timeLogRepo.GetByID(timeLogID)
	if err != nil {
		return nil, err
	}
	if log == nil || log.UserID != userID {
		return nil, errors.New("time log not found")
	}
	if err := validateDurationUnits(durationUnits); err != nil {
		return nil, err
	}
	logs, err := s.timeLogRepo.ListByUserAndDate(userID, log.LogDate)
	if err != nil {
		return nil, err
	}
	otherUnits := 0
	for _, dayLog := range logs {
		if dayLog.ID == log.ID {
			continue
		}
		otherUnits += dayLog.DurationUnits
	}
	if err := validateTimeRange(otherUnits, durationUnits); err != nil {
		return nil, err
	}
	log.StartUnit = startUnit
	log.DurationUnits = durationUnits
	log.UpdatedAt = time.Now().UTC()
	if err := s.timeLogRepo.Update(log); err != nil {
		return nil, err
	}
	if err := s.restackDayLogs(userID, log.LogDate); err != nil {
		return nil, err
	}
	return s.timeLogRepo.GetByID(log.ID)
}

func (s *UserDailyService) DeleteTimeLog(userID int, timeLogID int) error {
	log, err := s.timeLogRepo.GetByID(timeLogID)
	if err != nil {
		return err
	}
	if log == nil || log.UserID != userID {
		return errors.New("time log not found")
	}
	if err := s.timeLogRepo.Delete(log.ID); err != nil {
		return err
	}
	return s.restackDayLogs(userID, log.LogDate)
}

func (s *UserDailyService) restackDayLogs(userID int, workDate time.Time) error {
	logs, err := s.timeLogRepo.ListByUserAndDate(userID, workDate)
	if err != nil {
		return err
	}

	startUnit := 0
	for _, log := range logs {
		if log.StartUnit != startUnit {
			log.StartUnit = startUnit
			log.UpdatedAt = time.Now().UTC()
			if err := s.timeLogRepo.Update(&log); err != nil {
				return err
			}
		}
		startUnit += log.DurationUnits
	}

	return nil
}

func (s *UserDailyService) GetSummary(userID int, anchorDate time.Time, rangeType string) (*UserDailySummary, error) {
	anchorDate = normalizeDate(anchorDate)
	rangeType = strings.ToLower(strings.TrimSpace(rangeType))
	startDate, endDate, err := computeRange(anchorDate, rangeType)
	if err != nil {
		return nil, err
	}
	logs, err := s.timeLogRepo.ListByUserAndRange(userID, startDate, endDate)
	if err != nil {
		return nil, err
	}
	projectTotals := map[int]int{}
	dayTotals := map[string]int{}
	totalUnits := 0
	for _, log := range logs {
		projectTotals[log.ProjectID] += log.DurationUnits
		dayKey := normalizeDate(log.LogDate).Format("2006-01-02")
		dayTotals[dayKey] += log.DurationUnits
		totalUnits += log.DurationUnits
	}

	projectSummaries := make([]UserDailyProjectSummary, 0, len(projectTotals))
	for projectID, units := range projectTotals {
		project, err := s.projectRepo.GetByID(projectID)
		if err != nil {
			return nil, err
		}
		projectName := "Unknown Project"
		if project != nil {
			projectName = project.Name
		}
		projectSummaries = append(projectSummaries, UserDailyProjectSummary{
			ProjectID:   projectID,
			ProjectName: projectName,
			TotalUnits:  units,
			TotalHours:  unitHours(units),
		})
	}
	sort.Slice(projectSummaries, func(i, j int) bool {
		if projectSummaries[i].TotalUnits == projectSummaries[j].TotalUnits {
			return projectSummaries[i].ProjectName < projectSummaries[j].ProjectName
		}
		return projectSummaries[i].TotalUnits > projectSummaries[j].TotalUnits
	})

	daySummaries := make([]UserDailyDaySummary, 0)
	for cursor := startDate; !cursor.After(endDate); cursor = cursor.AddDate(0, 0, 1) {
		key := cursor.Format("2006-01-02")
		units := dayTotals[key]
		daySummaries = append(daySummaries, UserDailyDaySummary{
			Date:       cursor,
			TotalUnits: units,
			TotalHours: unitHours(units),
		})
	}

	return &UserDailySummary{
		Range:      rangeType,
		StartDate:  startDate,
		EndDate:    endDate,
		TotalUnits: totalUnits,
		TotalHours: unitHours(totalUnits),
		Projects:   projectSummaries,
		Days:       daySummaries,
	}, nil
}

func computeRange(anchorDate time.Time, rangeType string) (time.Time, time.Time, error) {
	switch rangeType {
	case "day", "":
		return anchorDate, anchorDate, nil
	case "week":
		weekday := int(anchorDate.Weekday())
		if weekday == 0 {
			weekday = 7
		}
		start := anchorDate.AddDate(0, 0, -(weekday - 1))
		end := start.AddDate(0, 0, 6)
		return start, end, nil
	case "month":
		start := time.Date(anchorDate.Year(), anchorDate.Month(), 1, 0, 0, 0, 0, time.UTC)
		end := start.AddDate(0, 1, -1)
		return start, end, nil
	default:
		return time.Time{}, time.Time{}, errors.New("invalid range")
	}
}

func validateTimeRange(startUnit int, durationUnits int) error {
	if startUnit < 0 || startUnit >= MaxTimeUnitsPerDay {
		return errors.New("start unit must be between 0 and 23")
	}
	if err := validateDurationUnits(durationUnits); err != nil {
		return err
	}
	if startUnit+durationUnits > MaxTimeUnitsPerDay {
		return errors.New("time log exceeds the day boundary")
	}
	return nil
}

func validateDurationUnits(durationUnits int) error {
	if durationUnits <= 0 {
		return errors.New("duration units must be greater than 0")
	}
	if durationUnits > MaxTimeUnitsPerDay {
		return errors.New("duration units cannot exceed 24")
	}
	return nil
}

func (s *UserDailyService) getSourceItemForUser(userID int, itemType string, itemID int) (*dailySourceItem, error) {
	switch itemType {
	case ItemTypeTask:
		task, err := s.taskRepo.GetByID(itemID)
		if err != nil {
			return nil, err
		}
		if task == nil {
			return nil, errors.New("task not found")
		}
		if err := s.ensureProjectMembership(task.ProjectID, userID); err != nil {
			return nil, err
		}
		projectName, err := s.getProjectName(task.ProjectID)
		if err != nil {
			return nil, err
		}
		return &dailySourceItem{ProjectID: task.ProjectID, ProjectName: projectName, ItemType: itemType, ItemID: task.ID, Title: task.Title, Status: task.Status, StatusOptions: []string{tasks.TaskStatusOpen, tasks.TaskStatusInProgress, tasks.TaskStatusOnHold, tasks.TaskStatusBlocked, tasks.TaskStatusCompleted, tasks.TaskStatusRejected, tasks.TaskStatusReopened, tasks.TaskStatusClosed}}, nil
	case ItemTypeIssue:
		issue, err := s.issueRepo.GetByID(itemID)
		if err != nil {
			return nil, err
		}
		if issue == nil {
			return nil, errors.New("issue not found")
		}
		if err := s.ensureProjectMembership(issue.ProjectID, userID); err != nil {
			return nil, err
		}
		projectName, err := s.getProjectName(issue.ProjectID)
		if err != nil {
			return nil, err
		}
		return &dailySourceItem{ProjectID: issue.ProjectID, ProjectName: projectName, ItemType: itemType, ItemID: issue.ID, Title: issue.Title, Status: issue.Status, RefNum: issue.RefNum, StatusOptions: []string{issues.IssueStatusOpen, issues.IssueStatusAssigned, issues.IssueStatusInProgress, issues.IssueStatusInReview, issues.IssueStatusCompleted, issues.IssueStatusRejected, issues.IssueStatusReopened, issues.IssueStatusClosed}}, nil
	case ItemTypeFeature:
		feature, err := s.featureRepo.GetByID(itemID)
		if err != nil {
			return nil, err
		}
		if feature == nil {
			return nil, errors.New("feature not found")
		}
		if err := s.ensureProjectMembership(feature.ProjectID, userID); err != nil {
			return nil, err
		}
		projectName, err := s.getProjectName(feature.ProjectID)
		if err != nil {
			return nil, err
		}
		return &dailySourceItem{ProjectID: feature.ProjectID, ProjectName: projectName, ItemType: itemType, ItemID: feature.ID, Title: feature.Title, Status: feature.Status, RefNum: feature.RefNum, StatusOptions: []string{features.FeatureStatusOpen, features.FeatureStatusAssigned, features.FeatureStatusInProgress, features.FeatureStatusInReview, features.FeatureStatusCompleted, features.FeatureStatusRejected, features.FeatureStatusReopened, features.FeatureStatusClosed}}, nil
	default:
		return nil, errors.New("invalid item type")
	}
}

func (s *UserDailyService) ensureProjectMembership(projectID int, userID int) error {
	isMember, err := s.memberRepo.IsUserMember(projectID, userID)
	if err != nil {
		return err
	}
	if !isMember {
		return errors.New("user is not a member of this project")
	}
	return nil
}

func (s *UserDailyService) getProjectName(projectID int) (string, error) {
	project, err := s.projectRepo.GetByID(projectID)
	if err != nil {
		return "", err
	}
	if project == nil {
		return "Unknown Project", nil
	}
	return project.Name, nil
}

func (s *UserDailyService) listCandidateItems(userID int, existingKeys map[string]struct{}) ([]UserDailyCandidate, error) {
	projectsList, _, err := s.projectRepo.GetByUserID(userID, false, 0, 200)
	if err != nil {
		return nil, err
	}

	candidates := make([]UserDailyCandidate, 0)
	for _, project := range projectsList {
		projectID := project.ID
		projectName := project.Name

		projectTasks, err := s.taskRepo.GetByProjectAndAssigneeOrderByDeadline(projectID, userID, 100, []string{tasks.TaskStatusCompleted, tasks.TaskStatusClosed, tasks.TaskStatusRejected})
		if err != nil {
			return nil, err
		}
		for _, task := range projectTasks {
			key := ItemTypeTask + ":" + strconvItoa(task.ID)
			_, alreadyAdded := existingKeys[key]
			candidates = append(candidates, UserDailyCandidate{ProjectID: projectID, ProjectName: projectName, ItemType: ItemTypeTask, ItemID: task.ID, Title: task.Title, Status: task.Status, AlreadyAdded: alreadyAdded, StatusOptions: []string{tasks.TaskStatusOpen, tasks.TaskStatusInProgress, tasks.TaskStatusOnHold, tasks.TaskStatusBlocked, tasks.TaskStatusCompleted, tasks.TaskStatusRejected, tasks.TaskStatusReopened, tasks.TaskStatusClosed}})
		}

		projectIssues, err := s.issueRepo.GetByProjectAndAssigneeLimited(projectID, userID, 100, []string{issues.IssueStatusCompleted, issues.IssueStatusClosed, issues.IssueStatusRejected})
		if err != nil {
			return nil, err
		}
		for _, issue := range projectIssues {
			key := ItemTypeIssue + ":" + strconvItoa(issue.ID)
			_, alreadyAdded := existingKeys[key]
			candidates = append(candidates, UserDailyCandidate{ProjectID: projectID, ProjectName: projectName, ItemType: ItemTypeIssue, ItemID: issue.ID, Title: issue.Title, Status: issue.Status, RefNum: issue.RefNum, AlreadyAdded: alreadyAdded, StatusOptions: []string{issues.IssueStatusOpen, issues.IssueStatusAssigned, issues.IssueStatusInProgress, issues.IssueStatusInReview, issues.IssueStatusCompleted, issues.IssueStatusRejected, issues.IssueStatusReopened, issues.IssueStatusClosed}})
		}

		projectFeatures, err := s.featureRepo.GetByProjectAndAssigneeLimited(projectID, userID, 100, []string{features.FeatureStatusCompleted, features.FeatureStatusClosed, features.FeatureStatusRejected})
		if err != nil {
			return nil, err
		}
		for _, feature := range projectFeatures {
			key := ItemTypeFeature + ":" + strconvItoa(feature.ID)
			_, alreadyAdded := existingKeys[key]
			candidates = append(candidates, UserDailyCandidate{ProjectID: projectID, ProjectName: projectName, ItemType: ItemTypeFeature, ItemID: feature.ID, Title: feature.Title, Status: feature.Status, RefNum: feature.RefNum, AlreadyAdded: alreadyAdded, StatusOptions: []string{features.FeatureStatusOpen, features.FeatureStatusAssigned, features.FeatureStatusInProgress, features.FeatureStatusInReview, features.FeatureStatusCompleted, features.FeatureStatusRejected, features.FeatureStatusReopened, features.FeatureStatusClosed}})
		}
	}

	sort.Slice(candidates, func(i, j int) bool {
		if candidates[i].AlreadyAdded != candidates[j].AlreadyAdded {
			return !candidates[i].AlreadyAdded && candidates[j].AlreadyAdded
		}
		if candidates[i].ProjectName != candidates[j].ProjectName {
			return candidates[i].ProjectName < candidates[j].ProjectName
		}
		if candidates[i].ItemType != candidates[j].ItemType {
			return candidates[i].ItemType < candidates[j].ItemType
		}
		return candidates[i].Title < candidates[j].Title
	})

	return candidates, nil
}

func strconvItoa(value int) string {
	return strconv.Itoa(value)
}
