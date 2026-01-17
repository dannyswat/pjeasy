package tasks

import (
	"errors"
	"time"

	"github.com/dannyswat/pjeasy/internal/projects"
	"github.com/dannyswat/pjeasy/internal/repositories"
	"github.com/dannyswat/pjeasy/internal/sequences"
)

type TaskService struct {
	taskRepo     *TaskRepository
	memberRepo   *projects.ProjectMemberRepository
	projectRepo  *projects.ProjectRepository
	sequenceRepo *sequences.SequenceRepository
	uowFactory   *repositories.UnitOfWorkFactory
}

func NewTaskService(taskRepo *TaskRepository, memberRepo *projects.ProjectMemberRepository, projectRepo *projects.ProjectRepository, sequenceRepo *sequences.SequenceRepository, uowFactory *repositories.UnitOfWorkFactory) *TaskService {
	return &TaskService{
		taskRepo:     taskRepo,
		memberRepo:   memberRepo,
		projectRepo:  projectRepo,
		sequenceRepo: sequenceRepo,
		uowFactory:   uowFactory,
	}
}

// CreateTask creates a new task
func (s *TaskService) CreateTask(projectID int, title, description, status, priority, tags string, estimatedHours float64, assigneeID *int, deadline *time.Time, sprintID *int, createdBy int) (*Task, error) {
	// Validate project exists
	project, err := s.projectRepo.GetByID(projectID)
	if err != nil {
		return nil, err
	}
	if project == nil {
		return nil, errors.New("project not found")
	}

	// Check if user is a member or admin of the project
	isMember, err := s.memberRepo.IsUserMember(projectID, createdBy)
	if err != nil {
		return nil, err
	}
	if !isMember {
		return nil, errors.New("user is not a member of this project")
	}

	// Validate status
	if status == "" {
		status = TaskStatusOpen
	} else if !IsValidStatus(status) {
		return nil, errors.New("invalid status")
	}

	// Validate priority
	if priority == "" {
		priority = TaskPriorityNormal
	} else if !IsValidPriority(priority) {
		return nil, errors.New("invalid priority")
	}

	// Validate assignee if provided
	if assigneeID != nil {
		isAssigneeMember, err := s.memberRepo.IsUserMember(projectID, *assigneeID)
		if err != nil {
			return nil, err
		}
		if !isAssigneeMember {
			return nil, errors.New("assignee is not a member of this project")
		}
	}

	uow := s.uowFactory.NewUnitOfWork()
	// Begin transaction to generate RefNum and create task
	if err := uow.BeginTransaction(); err != nil {
		return nil, err
	}
	defer uow.RollbackTransactionIfError()

	// Generate reference number
	refNum, err := s.sequenceRepo.GetNextNumber(uow, projectID, "tasks")
	if err != nil {
		uow.RollbackTransaction()
		return nil, err
	}

	now := time.Now()
	task := &Task{
		RefNum:         refNum,
		ProjectID:      projectID,
		Title:          title,
		Description:    description,
		Status:         status,
		Priority:       priority,
		EstimatedHours: estimatedHours,
		AssigneeID:     assigneeID,
		Deadline:       deadline,
		SprintID:       sprintID,
		Tags:           tags,
		CreatedBy:      createdBy,
		CreatedAt:      now,
		UpdatedAt:      now,
	}

	// Create a new repository instance with the transaction UOW
	txTaskRepo := NewTaskRepository(uow)
	if err := txTaskRepo.Create(task); err != nil {
		uow.RollbackTransaction()
		return nil, err
	}

	if err := uow.CommitTransaction(); err != nil {
		return nil, err
	}

	return task, nil
}

// UpdateTask updates a task's details
func (s *TaskService) UpdateTask(taskID int, title, description, priority, tags string, estimatedHours float64, assigneeID *int, deadline *time.Time, sprintID *int, updatedBy int) (*Task, error) {
	task, err := s.taskRepo.GetByID(taskID)
	if err != nil {
		return nil, err
	}
	if task == nil {
		return nil, errors.New("task not found")
	}

	// Check if user is a member or admin of the project
	isMember, err := s.memberRepo.IsUserMember(task.ProjectID, updatedBy)
	if err != nil {
		return nil, err
	}
	if !isMember {
		return nil, errors.New("user is not a member of this project")
	}

	// Validate priority if provided
	if priority != "" && !IsValidPriority(priority) {
		return nil, errors.New("invalid priority")
	}

	// Validate assignee if provided
	if assigneeID != nil {
		isAssigneeMember, err := s.memberRepo.IsUserMember(task.ProjectID, *assigneeID)
		if err != nil {
			return nil, err
		}
		if !isAssigneeMember {
			return nil, errors.New("assignee is not a member of this project")
		}
	}

	task.Title = title
	task.Description = description
	if priority != "" {
		task.Priority = priority
	}
	task.EstimatedHours = estimatedHours
	task.AssigneeID = assigneeID
	task.Deadline = deadline
	task.SprintID = sprintID
	task.Tags = tags
	task.UpdatedAt = time.Now()

	if err := s.taskRepo.Update(task); err != nil {
		return nil, err
	}

	return task, nil
}

// UpdateTaskStatus updates a task's status
func (s *TaskService) UpdateTaskStatus(taskID int, status string, updatedBy int) (*Task, error) {
	if !IsValidStatus(status) {
		return nil, errors.New("invalid status")
	}

	task, err := s.taskRepo.GetByID(taskID)
	if err != nil {
		return nil, err
	}
	if task == nil {
		return nil, errors.New("task not found")
	}

	// Check if user is a member or admin of the project
	isMember, err := s.memberRepo.IsUserMember(task.ProjectID, updatedBy)
	if err != nil {
		return nil, err
	}
	if !isMember {
		return nil, errors.New("user is not a member of this project")
	}

	if err := s.taskRepo.UpdateStatus(taskID, status); err != nil {
		return nil, err
	}

	// Reload task to get updated status
	return s.taskRepo.GetByID(taskID)
}

// UpdateTaskAssignee updates a task's assignee
func (s *TaskService) UpdateTaskAssignee(taskID int, assigneeID *int, updatedBy int) (*Task, error) {
	task, err := s.taskRepo.GetByID(taskID)
	if err != nil {
		return nil, err
	}
	if task == nil {
		return nil, errors.New("task not found")
	}

	// Check if user is a member or admin of the project
	isMember, err := s.memberRepo.IsUserMember(task.ProjectID, updatedBy)
	if err != nil {
		return nil, err
	}
	if !isMember {
		return nil, errors.New("user is not a member of this project")
	}

	// Validate assignee if provided
	if assigneeID != nil {
		isAssigneeMember, err := s.memberRepo.IsUserMember(task.ProjectID, *assigneeID)
		if err != nil {
			return nil, err
		}
		if !isAssigneeMember {
			return nil, errors.New("assignee is not a member of this project")
		}
	}

	if err := s.taskRepo.UpdateAssignee(taskID, assigneeID); err != nil {
		return nil, err
	}

	// Reload task to get updated assignee
	return s.taskRepo.GetByID(taskID)
}

// DeleteTask deletes a task
func (s *TaskService) DeleteTask(taskID int, deletedBy int) error {
	task, err := s.taskRepo.GetByID(taskID)
	if err != nil {
		return err
	}
	if task == nil {
		return errors.New("task not found")
	}

	// Check if user is a member or admin of the project
	isMember, err := s.memberRepo.IsUserMember(task.ProjectID, deletedBy)
	if err != nil {
		return err
	}
	if !isMember {
		return errors.New("user is not a member of this project")
	}

	return s.taskRepo.Delete(taskID)
}

// GetTask retrieves a single task
func (s *TaskService) GetTask(taskID int, userID int) (*Task, error) {
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

	return task, nil
}

// GetProjectTasks retrieves all tasks for a project with pagination and optional status filter
func (s *TaskService) GetProjectTasks(projectID int, status string, page, pageSize int, userID int) ([]Task, int64, error) {
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

	var tasks []Task
	var total int64

	if status != "" {
		if !IsValidStatus(status) {
			return nil, 0, errors.New("invalid status")
		}
		tasks, total, err = s.taskRepo.GetByProjectIDAndStatus(projectID, status, offset, pageSize)
	} else {
		tasks, total, err = s.taskRepo.GetByProjectID(projectID, offset, pageSize)
	}

	if err != nil {
		return nil, 0, err
	}

	return tasks, total, nil
}

// GetMyTasks retrieves tasks assigned to the current user with pagination
func (s *TaskService) GetMyTasks(page, pageSize int, userID int) ([]Task, int64, error) {
	offset := (page - 1) * pageSize

	tasks, total, err := s.taskRepo.GetByAssigneeID(userID, offset, pageSize)
	if err != nil {
		return nil, 0, err
	}

	return tasks, total, nil
}
