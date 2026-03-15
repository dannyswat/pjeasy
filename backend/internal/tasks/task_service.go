package tasks

import (
	"context"
	"errors"
	"time"

	"github.com/dannyswat/pjeasy/internal/htmlsanitizer"
	"github.com/dannyswat/pjeasy/internal/projects"
	"github.com/dannyswat/pjeasy/internal/repositories"
	"github.com/dannyswat/pjeasy/internal/sequences"
	"github.com/dannyswat/pjeasy/internal/service_tickets"
	"github.com/dannyswat/pjeasy/internal/status_changes"
)

type WikiChangeMerger interface {
	MergeChangesOnCompletion(itemType string, itemID int, userID int) error
}

// StatusChangeHandler defines the interface for handling task status change events
type StatusChangeHandler interface {
	OnTaskStatusChanged(ctx context.Context, task *Task, oldStatus, newStatus string, userID int) error
}

type TaskService struct {
	taskRepo            *TaskRepository
	memberRepo          *projects.ProjectMemberRepository
	projectRepo         *projects.ProjectRepository
	sequenceRepo        *sequences.SequenceRepository
	serviceTicketRepo   *service_tickets.ServiceTicketRepository
	wikiChangeMerger    WikiChangeMerger
	statusRepo          *status_changes.StatusChangeService
	uowFactory          *repositories.UnitOfWorkFactory
	statusChangeHandler StatusChangeHandler
}

func NewTaskService(taskRepo *TaskRepository, memberRepo *projects.ProjectMemberRepository, projectRepo *projects.ProjectRepository, sequenceRepo *sequences.SequenceRepository, serviceTicketRepo *service_tickets.ServiceTicketRepository, wikiChangeMerger WikiChangeMerger, statusRepo *status_changes.StatusChangeService, uowFactory *repositories.UnitOfWorkFactory) *TaskService {
	return &TaskService{
		taskRepo:          taskRepo,
		memberRepo:        memberRepo,
		projectRepo:       projectRepo,
		sequenceRepo:      sequenceRepo,
		serviceTicketRepo: serviceTicketRepo,
		wikiChangeMerger:  wikiChangeMerger,
		statusRepo:        statusRepo,
		uowFactory:        uowFactory,
	}
}

// SetStatusChangeHandler sets the handler for status change events
func (s *TaskService) SetStatusChangeHandler(handler StatusChangeHandler) {
	s.statusChangeHandler = handler
}

// CreateTask creates a new task
func (s *TaskService) CreateTask(projectID int, title, description, status, priority, tags string, estimatedHours float64, assigneeID *int, deadline *time.Time, sprintID *int, itemType string, itemID *int, createdBy int) (*Task, error) {
	// Validate project exists
	project, err := s.projectRepo.GetByID(projectID)
	if err != nil {
		return nil, err
	}
	if project == nil {
		return nil, errors.New("project not found")
	}

	// Check if user can modify project items.
	canWrite, err := s.memberRepo.CanUserWriteProject(projectID, createdBy)
	if err != nil {
		return nil, err
	}
	if !canWrite {
		return nil, errors.New("project users can only read project items")
	}

	description = htmlsanitizer.Sanitize(description)

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

	now := time.Now()
	task := &Task{
		ProjectID:      projectID,
		Title:          title,
		Description:    description,
		Status:         status,
		Priority:       priority,
		EstimatedHours: estimatedHours,
		AssigneeID:     assigneeID,
		Deadline:       deadline,
		SprintID:       sprintID,
		ItemType:       itemType,
		ItemID:         itemID,
		Tags:           tags,
		CreatedBy:      createdBy,
		CreatedAt:      now,
		UpdatedAt:      now,
	}

	if err := s.taskRepo.Create(task); err != nil {
		return nil, err
	}

	// If task is linked to a service ticket, update the ticket status from "New" to "Open"
	if itemType == "service-tickets" && itemID != nil {
		ticket, err := s.serviceTicketRepo.GetByID(*itemID)
		if err == nil && ticket != nil && ticket.Status == service_tickets.ServiceTicketStatusNew {
			ticket.Status = service_tickets.ServiceTicketStatusOpen
			ticket.UpdatedAt = now
			s.serviceTicketRepo.Update(ticket)
		}
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

	// Check if user can modify project items.
	canWrite, err := s.memberRepo.CanUserWriteProject(task.ProjectID, updatedBy)
	if err != nil {
		return nil, err
	}
	if !canWrite {
		return nil, errors.New("project users can only read project items")
	}

	description = htmlsanitizer.Sanitize(description)

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

	// Check if user can modify project items.
	canWrite, err := s.memberRepo.CanUserWriteProject(task.ProjectID, updatedBy)
	if err != nil {
		return nil, err
	}
	if !canWrite {
		return nil, errors.New("project users can only read project items")
	}

	oldStatus := task.Status

	if err := s.taskRepo.UpdateStatus(taskID, status); err != nil {
		return nil, err
	}

	if status == TaskStatusCompleted && s.wikiChangeMerger != nil {
		if err := s.wikiChangeMerger.MergeChangesOnCompletion("task", taskID, updatedBy); err != nil {
			return nil, err
		}
	}

	if err := s.statusRepo.LogChange(task.ProjectID, status_changes.ItemTypeTask, task.ID, oldStatus, status, &updatedBy); err != nil {
		return nil, err
	}

	// Reload task to get updated status
	updatedTask, err := s.taskRepo.GetByID(taskID)
	if err != nil {
		return nil, err
	}

	// Trigger workflow event if status actually changed and handler is set
	if oldStatus != status && s.statusChangeHandler != nil {
		ctx := context.Background()
		go func() {
			_ = s.statusChangeHandler.OnTaskStatusChanged(ctx, updatedTask, oldStatus, status, updatedBy)
		}()
	}

	return updatedTask, nil
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

	// Check if user can modify project items.
	canWrite, err := s.memberRepo.CanUserWriteProject(task.ProjectID, updatedBy)
	if err != nil {
		return nil, err
	}
	if !canWrite {
		return nil, errors.New("project users can only read project items")
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

	// Check if user can modify project items.
	canWrite, err := s.memberRepo.CanUserWriteProject(task.ProjectID, deletedBy)
	if err != nil {
		return err
	}
	if !canWrite {
		return errors.New("project users can only read project items")
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
func (s *TaskService) GetProjectTasks(projectID int, statuses []string, page, pageSize int, userID int) ([]Task, int64, error) {
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

	if len(statuses) == 1 {
		// Single status - use existing method
		if !IsValidStatus(statuses[0]) {
			return nil, 0, errors.New("invalid status")
		}
		tasks, total, err = s.taskRepo.GetByProjectIDAndStatus(projectID, statuses[0], offset, pageSize)
	} else if len(statuses) > 1 {
		// Multiple statuses - validate each and use IN query
		for _, status := range statuses {
			if !IsValidStatus(status) {
				return nil, 0, errors.New("invalid status: " + status)
			}
		}
		tasks, total, err = s.taskRepo.GetByProjectIDAndStatuses(projectID, statuses, offset, pageSize)
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

// GetTasksByAssigneeOrderByDeadline retrieves tasks assigned to a user in a project, ordered by deadline
func (s *TaskService) GetTasksByAssigneeOrderByDeadline(projectID int, userID int, limit int, excludeStatuses []string) ([]Task, error) {
	return s.taskRepo.GetByProjectAndAssigneeOrderByDeadline(projectID, userID, limit, excludeStatuses)
}

// GetTasksByItemReference retrieves tasks linked to a specific item (e.g., idea) with pagination
func (s *TaskService) GetTasksByItemReference(projectID int, itemType string, itemID int, page, pageSize int, userID int) ([]Task, int64, error) {
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

	tasks, total, err := s.taskRepo.GetByItemReference(projectID, itemType, itemID, offset, pageSize)
	if err != nil {
		return nil, 0, err
	}

	return tasks, total, nil
}
