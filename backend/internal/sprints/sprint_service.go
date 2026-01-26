package sprints

import (
	"errors"
	"time"

	"github.com/dannyswat/pjeasy/internal/projects"
	"github.com/dannyswat/pjeasy/internal/repositories"
	"github.com/dannyswat/pjeasy/internal/tasks"
)

type SprintService struct {
	sprintRepo  *SprintRepository
	taskRepo    *tasks.TaskRepository
	memberRepo  *projects.ProjectMemberRepository
	projectRepo *projects.ProjectRepository
	uowFactory  *repositories.UnitOfWorkFactory
}

func NewSprintService(
	sprintRepo *SprintRepository,
	taskRepo *tasks.TaskRepository,
	memberRepo *projects.ProjectMemberRepository,
	projectRepo *projects.ProjectRepository,
	uowFactory *repositories.UnitOfWorkFactory,
) *SprintService {
	return &SprintService{
		sprintRepo:  sprintRepo,
		taskRepo:    taskRepo,
		memberRepo:  memberRepo,
		projectRepo: projectRepo,
		uowFactory:  uowFactory,
	}
}

// CreateSprint creates a new sprint
func (s *SprintService) CreateSprint(projectID int, name, goal string, startDate, endDate *time.Time, milestoneID *int, createdBy int) (*Sprint, error) {
	// Validate project exists
	project, err := s.projectRepo.GetByID(projectID)
	if err != nil {
		return nil, err
	}
	if project == nil {
		return nil, errors.New("project not found")
	}

	// Check if user is a manager of the project
	isManager, err := s.memberRepo.IsUserAdmin(projectID, createdBy)
	if err != nil {
		return nil, err
	}
	if !isManager {
		return nil, errors.New("only project managers can create sprints")
	}

	now := time.Now()
	sprint := &Sprint{
		ProjectID:   projectID,
		Name:        name,
		Goal:        goal,
		StartDate:   startDate,
		EndDate:     endDate,
		MilestoneID: milestoneID,
		Status:      SprintStatusPlanning,
		CreatedBy:   createdBy,
		CreatedAt:   now,
		UpdatedAt:   now,
	}

	if err := s.sprintRepo.Create(sprint); err != nil {
		return nil, err
	}

	return sprint, nil
}

// UpdateSprint updates a sprint's details
func (s *SprintService) UpdateSprint(sprintID int, name, goal string, startDate, endDate *time.Time, milestoneID *int, updatedBy int) (*Sprint, error) {
	sprint, err := s.sprintRepo.GetByID(sprintID)
	if err != nil {
		return nil, err
	}
	if sprint == nil {
		return nil, errors.New("sprint not found")
	}

	// Check if user is a manager of the project
	isManager, err := s.memberRepo.IsUserAdmin(sprint.ProjectID, updatedBy)
	if err != nil {
		return nil, err
	}
	if !isManager {
		return nil, errors.New("only project managers can update sprints")
	}

	// Cannot update closed sprints
	if sprint.Status == SprintStatusClosed {
		return nil, errors.New("cannot update a closed sprint")
	}

	sprint.Name = name
	sprint.Goal = goal
	sprint.StartDate = startDate
	sprint.EndDate = endDate
	sprint.MilestoneID = milestoneID
	sprint.UpdatedAt = time.Now()

	if err := s.sprintRepo.Update(sprint); err != nil {
		return nil, err
	}

	return sprint, nil
}

// StartSprint activates a sprint (changes status from Planning to Active)
func (s *SprintService) StartSprint(sprintID int, userID int) (*Sprint, error) {
	sprint, err := s.sprintRepo.GetByID(sprintID)
	if err != nil {
		return nil, err
	}
	if sprint == nil {
		return nil, errors.New("sprint not found")
	}

	// Check if user is a manager of the project
	isManager, err := s.memberRepo.IsUserAdmin(sprint.ProjectID, userID)
	if err != nil {
		return nil, err
	}
	if !isManager {
		return nil, errors.New("only project managers can start sprints")
	}

	// Can only start sprints that are in Planning status
	if sprint.Status != SprintStatusPlanning {
		return nil, errors.New("can only start sprints that are in Planning status")
	}

	// Check if there's already an active sprint for this project
	hasActive, err := s.sprintRepo.HasActiveSprintForProject(sprint.ProjectID)
	if err != nil {
		return nil, err
	}
	if hasActive {
		return nil, errors.New("project already has an active sprint. Close it before starting a new one")
	}

	sprint.Status = SprintStatusActive
	if sprint.StartDate == nil {
		now := time.Now()
		sprint.StartDate = &now
	}
	sprint.UpdatedAt = time.Now()

	if err := s.sprintRepo.Update(sprint); err != nil {
		return nil, err
	}

	return sprint, nil
}

// CloseSprint closes a sprint and optionally creates a new one with in-progress tasks
func (s *SprintService) CloseSprint(sprintID int, createNewSprint bool, newSprintName, newSprintGoal string, newSprintEndDate *time.Time, userID int) (*Sprint, *Sprint, error) {
	sprint, err := s.sprintRepo.GetByID(sprintID)
	if err != nil {
		return nil, nil, err
	}
	if sprint == nil {
		return nil, nil, errors.New("sprint not found")
	}

	// Check if user is a manager of the project
	isManager, err := s.memberRepo.IsUserAdmin(sprint.ProjectID, userID)
	if err != nil {
		return nil, nil, err
	}
	if !isManager {
		return nil, nil, errors.New("only project managers can close sprints")
	}

	// Can only close sprints that are Active
	if sprint.Status != SprintStatusActive {
		return nil, nil, errors.New("can only close sprints that are Active")
	}

	// Close the sprint
	sprint.Status = SprintStatusClosed
	now := time.Now()
	if sprint.EndDate == nil {
		sprint.EndDate = &now
	}
	sprint.UpdatedAt = now

	if err := s.sprintRepo.Update(sprint); err != nil {
		return nil, nil, err
	}

	var newSprint *Sprint

	// If createNewSprint is true, create a new sprint and copy in-progress tasks
	if createNewSprint {
		// Get all tasks in the closed sprint that are in progress (not Completed or Closed)
		inProgressTasks, _, err := s.getInProgressTasksForSprint(sprintID)
		if err != nil {
			return sprint, nil, err
		}

		// Create new sprint
		newSprint = &Sprint{
			ProjectID:   sprint.ProjectID,
			Name:        newSprintName,
			Goal:        newSprintGoal,
			StartDate:   &now,
			EndDate:     newSprintEndDate,
			MilestoneID: sprint.MilestoneID, // Carry over milestone
			Status:      SprintStatusActive, // Start as active immediately
			CreatedBy:   userID,
			CreatedAt:   now,
			UpdatedAt:   now,
		}

		if err := s.sprintRepo.Create(newSprint); err != nil {
			return sprint, nil, err
		}

		// Move in-progress tasks to the new sprint
		for _, task := range inProgressTasks {
			task.SprintID = &newSprint.ID
			task.UpdatedAt = now
			if err := s.taskRepo.Update(&task); err != nil {
				// Log error but continue
				continue
			}
		}
	}

	return sprint, newSprint, nil
}

// getInProgressTasksForSprint returns tasks in a sprint that are not completed or closed
func (s *SprintService) getInProgressTasksForSprint(sprintID int) ([]tasks.Task, int64, error) {
	// Get all tasks for the sprint
	allTasks, total, err := s.taskRepo.GetBySprintID(sprintID, 0, 1000)
	if err != nil {
		return nil, 0, err
	}

	// Filter out completed and closed tasks
	var inProgressTasks []tasks.Task
	for _, task := range allTasks {
		if task.Status != tasks.TaskStatusCompleted && task.Status != tasks.TaskStatusClosed {
			inProgressTasks = append(inProgressTasks, task)
		}
	}

	return inProgressTasks, total, nil
}

// DeleteSprint deletes a sprint (only if in Planning status)
func (s *SprintService) DeleteSprint(sprintID int, userID int) error {
	sprint, err := s.sprintRepo.GetByID(sprintID)
	if err != nil {
		return err
	}
	if sprint == nil {
		return errors.New("sprint not found")
	}

	// Check if user is a manager of the project
	isManager, err := s.memberRepo.IsUserAdmin(sprint.ProjectID, userID)
	if err != nil {
		return err
	}
	if !isManager {
		return errors.New("only project managers can delete sprints")
	}

	// Can only delete sprints that are in Planning status
	if sprint.Status != SprintStatusPlanning {
		return errors.New("can only delete sprints that are in Planning status")
	}

	return s.sprintRepo.Delete(sprintID)
}

// GetSprint retrieves a single sprint
func (s *SprintService) GetSprint(sprintID int, userID int) (*Sprint, error) {
	sprint, err := s.sprintRepo.GetByID(sprintID)
	if err != nil {
		return nil, err
	}
	if sprint == nil {
		return nil, errors.New("sprint not found")
	}

	// Check if user is a member of the project
	isMember, err := s.memberRepo.IsUserMember(sprint.ProjectID, userID)
	if err != nil {
		return nil, err
	}
	if !isMember {
		return nil, errors.New("user is not a member of this project")
	}

	return sprint, nil
}

// GetProjectSprints retrieves all sprints for a project with pagination
func (s *SprintService) GetProjectSprints(projectID int, page, pageSize int, userID int) ([]Sprint, int64, error) {
	// Validate project exists
	project, err := s.projectRepo.GetByID(projectID)
	if err != nil {
		return nil, 0, err
	}
	if project == nil {
		return nil, 0, errors.New("project not found")
	}

	// Check if user is a member of the project
	isMember, err := s.memberRepo.IsUserMember(projectID, userID)
	if err != nil {
		return nil, 0, err
	}
	if !isMember {
		return nil, 0, errors.New("user is not a member of this project")
	}

	offset := (page - 1) * pageSize
	return s.sprintRepo.GetByProjectID(projectID, offset, pageSize)
}

// GetActiveSprint retrieves the active sprint for a project
func (s *SprintService) GetActiveSprint(projectID int, userID int) (*Sprint, error) {
	// Validate project exists
	project, err := s.projectRepo.GetByID(projectID)
	if err != nil {
		return nil, err
	}
	if project == nil {
		return nil, errors.New("project not found")
	}

	// Check if user is a member of the project
	isMember, err := s.memberRepo.IsUserMember(projectID, userID)
	if err != nil {
		return nil, err
	}
	if !isMember {
		return nil, errors.New("user is not a member of this project")
	}

	return s.sprintRepo.GetActiveSprintByProjectID(projectID)
}

// GetSprintTasks retrieves all tasks for a sprint with pagination
func (s *SprintService) GetSprintTasks(sprintID int, page, pageSize int, userID int) ([]tasks.Task, int64, error) {
	sprint, err := s.sprintRepo.GetByID(sprintID)
	if err != nil {
		return nil, 0, err
	}
	if sprint == nil {
		return nil, 0, errors.New("sprint not found")
	}

	// Check if user is a member of the project
	isMember, err := s.memberRepo.IsUserMember(sprint.ProjectID, userID)
	if err != nil {
		return nil, 0, err
	}
	if !isMember {
		return nil, 0, errors.New("user is not a member of this project")
	}

	offset := (page - 1) * pageSize
	return s.taskRepo.GetBySprintID(sprintID, offset, pageSize)
}

// AddTaskToSprint adds an existing task to a sprint
func (s *SprintService) AddTaskToSprint(taskID int, sprintID int, userID int) (*tasks.Task, error) {
	// Get the sprint
	sprint, err := s.sprintRepo.GetByID(sprintID)
	if err != nil {
		return nil, err
	}
	if sprint == nil {
		return nil, errors.New("sprint not found")
	}

	// Get the task
	task, err := s.taskRepo.GetByID(taskID)
	if err != nil {
		return nil, err
	}
	if task == nil {
		return nil, errors.New("task not found")
	}

	// Ensure task belongs to the same project as the sprint
	if task.ProjectID != sprint.ProjectID {
		return nil, errors.New("task does not belong to the same project as the sprint")
	}

	// Check if user is a member of the project
	isMember, err := s.memberRepo.IsUserMember(sprint.ProjectID, userID)
	if err != nil {
		return nil, err
	}
	if !isMember {
		return nil, errors.New("user is not a member of this project")
	}

	// Update the task's sprint ID
	task.SprintID = &sprintID
	task.UpdatedAt = time.Now()

	if err := s.taskRepo.Update(task); err != nil {
		return nil, err
	}

	return task, nil
}

// RemoveTaskFromSprint removes a task from its sprint
func (s *SprintService) RemoveTaskFromSprint(taskID int, userID int) (*tasks.Task, error) {
	// Get the task
	task, err := s.taskRepo.GetByID(taskID)
	if err != nil {
		return nil, err
	}
	if task == nil {
		return nil, errors.New("task not found")
	}

	// Check if user is a member of the project
	isMember, err := s.memberRepo.IsUserMember(task.ProjectID, userID)
	if err != nil {
		return nil, err
	}
	if !isMember {
		return nil, errors.New("user is not a member of this project")
	}

	// Remove the task from the sprint
	task.SprintID = nil
	task.UpdatedAt = time.Now()

	if err := s.taskRepo.Update(task); err != nil {
		return nil, err
	}

	return task, nil
}

// GetSprintTasksByStatus retrieves tasks grouped by status for board view
func (s *SprintService) GetSprintTasksByStatus(sprintID int, userID int) (map[string][]tasks.Task, error) {
	sprint, err := s.sprintRepo.GetByID(sprintID)
	if err != nil {
		return nil, err
	}
	if sprint == nil {
		return nil, errors.New("sprint not found")
	}

	// Check if user is a member of the project
	isMember, err := s.memberRepo.IsUserMember(sprint.ProjectID, userID)
	if err != nil {
		return nil, err
	}
	if !isMember {
		return nil, errors.New("user is not a member of this project")
	}

	// Get all tasks for the sprint (no pagination for board view)
	allTasks, _, err := s.taskRepo.GetBySprintID(sprintID, 0, 1000)
	if err != nil {
		return nil, err
	}

	// Group tasks by status
	tasksByStatus := make(map[string][]tasks.Task)
	for _, task := range allTasks {
		tasksByStatus[task.Status] = append(tasksByStatus[task.Status], task)
	}

	return tasksByStatus, nil
}

// GetSprintTasksByAssignee retrieves tasks grouped by assignee for swimlane view
func (s *SprintService) GetSprintTasksByAssignee(sprintID int, userID int) (map[int][]tasks.Task, []tasks.Task, error) {
	sprint, err := s.sprintRepo.GetByID(sprintID)
	if err != nil {
		return nil, nil, err
	}
	if sprint == nil {
		return nil, nil, errors.New("sprint not found")
	}

	// Check if user is a member of the project
	isMember, err := s.memberRepo.IsUserMember(sprint.ProjectID, userID)
	if err != nil {
		return nil, nil, err
	}
	if !isMember {
		return nil, nil, errors.New("user is not a member of this project")
	}

	// Get all tasks for the sprint
	allTasks, _, err := s.taskRepo.GetBySprintID(sprintID, 0, 1000)
	if err != nil {
		return nil, nil, err
	}

	// Group tasks by assignee
	tasksByAssignee := make(map[int][]tasks.Task)
	var unassignedTasks []tasks.Task

	for _, task := range allTasks {
		if task.AssigneeID != nil {
			tasksByAssignee[*task.AssigneeID] = append(tasksByAssignee[*task.AssigneeID], task)
		} else {
			unassignedTasks = append(unassignedTasks, task)
		}
	}

	return tasksByAssignee, unassignedTasks, nil
}
