package tasks

import (
	"github.com/dannyswat/pjeasy/internal/repositories"
	"gorm.io/gorm"
)

type TaskRepository struct {
	uow *repositories.UnitOfWork
}

func NewTaskRepository(uow *repositories.UnitOfWork) *TaskRepository {
	return &TaskRepository{uow: uow}
}

// Create creates a new task
func (r *TaskRepository) Create(task *Task) error {
	return r.uow.GetDB().Create(task).Error
}

// GetByID finds a task by ID
func (r *TaskRepository) GetByID(id int) (*Task, error) {
	var task Task
	err := r.uow.GetDB().First(&task, id).Error
	if err == gorm.ErrRecordNotFound {
		return nil, nil
	}
	return &task, err
}

// Update updates a task
func (r *TaskRepository) Update(task *Task) error {
	return r.uow.GetDB().Save(task).Error
}

// Delete deletes a task
func (r *TaskRepository) Delete(id int) error {
	return r.uow.GetDB().Delete(&Task{}, id).Error
}

// GetByProjectID returns all tasks for a project with pagination
func (r *TaskRepository) GetByProjectID(projectID int, offset, limit int) ([]Task, int64, error) {
	var tasks []Task
	var total int64

	query := r.uow.GetDB().Model(&Task{}).Where("project_id = ?", projectID)

	// Get total count
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	// Get paginated results
	err := query.Order("created_at DESC").
		Offset(offset).
		Limit(limit).
		Find(&tasks).Error

	return tasks, total, err
}

// GetByProjectIDAndStatus returns tasks filtered by status with pagination
func (r *TaskRepository) GetByProjectIDAndStatus(projectID int, status string, offset, limit int) ([]Task, int64, error) {
	var tasks []Task
	var total int64

	query := r.uow.GetDB().Model(&Task{}).
		Where("project_id = ? AND status = ?", projectID, status)

	// Get total count
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	// Get paginated results
	err := query.Order("created_at DESC").
		Offset(offset).
		Limit(limit).
		Find(&tasks).Error

	return tasks, total, err
}

// GetByProjectIDAndStatuses returns tasks filtered by multiple statuses with pagination
func (r *TaskRepository) GetByProjectIDAndStatuses(projectID int, statuses []string, offset, limit int) ([]Task, int64, error) {
	var tasks []Task
	var total int64

	query := r.uow.GetDB().Model(&Task{}).
		Where("project_id = ? AND status IN ?", projectID, statuses)

	// Get total count
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	// Get paginated results
	err := query.Order("created_at DESC").
		Offset(offset).
		Limit(limit).
		Find(&tasks).Error

	return tasks, total, err
}

// GetByAssigneeID returns tasks assigned to a specific user with pagination
func (r *TaskRepository) GetByAssigneeID(assigneeID int, offset, limit int) ([]Task, int64, error) {
	var tasks []Task
	var total int64

	query := r.uow.GetDB().Model(&Task{}).Where("assignee_id = ?", assigneeID)

	// Get total count
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	// Get paginated results
	err := query.Order("created_at DESC").
		Offset(offset).
		Limit(limit).
		Find(&tasks).Error

	return tasks, total, err
}

// GetBySprintID returns tasks for a specific sprint with pagination
func (r *TaskRepository) GetBySprintID(sprintID int, offset, limit int) ([]Task, int64, error) {
	var tasks []Task
	var total int64

	query := r.uow.GetDB().Model(&Task{}).Where("sprint_id = ?", sprintID)

	// Get total count
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	// Get paginated results
	err := query.Order("created_at DESC").
		Offset(offset).
		Limit(limit).
		Find(&tasks).Error

	return tasks, total, err
}

// UpdateStatus updates only the status of a task
func (r *TaskRepository) UpdateStatus(id int, status string) error {
	return r.uow.GetDB().Model(&Task{}).
		Where("id = ?", id).
		Update("status", status).Error
}

// UpdateAssignee updates only the assignee of a task
func (r *TaskRepository) UpdateAssignee(id int, assigneeID *int) error {
	return r.uow.GetDB().Model(&Task{}).
		Where("id = ?", id).
		Update("assignee_id", assigneeID).Error
}

// GetByItemReference returns tasks for a specific item (e.g., idea) with pagination
func (r *TaskRepository) GetByItemReference(projectID int, itemType string, itemID int, offset, limit int) ([]Task, int64, error) {
	var tasks []Task
	var total int64

	query := r.uow.GetDB().Model(&Task{}).
		Where("project_id = ? AND item_type = ? AND item_id = ?", projectID, itemType, itemID)

	// Get total count
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	// Get paginated results
	err := query.Order("created_at DESC").
		Offset(offset).
		Limit(limit).
		Find(&tasks).Error

	return tasks, total, err
}

// GetByProjectAndAssigneeOrderByDeadline returns tasks for a user in a project, ordered by deadline (closest first)
func (r *TaskRepository) GetByProjectAndAssigneeOrderByDeadline(projectID int, assigneeID int, limit int) ([]Task, error) {
	var tasks []Task

	// Tasks with deadlines first (ordered by closest deadline), then tasks without deadlines
	err := r.uow.GetDB().Model(&Task{}).
		Where("project_id = ? AND assignee_id = ? AND status NOT IN ?", projectID, assigneeID, []string{"Completed", "Closed"}).
		Order("CASE WHEN deadline IS NULL THEN 1 ELSE 0 END, deadline ASC, created_at DESC").
		Limit(limit).
		Find(&tasks).Error

	return tasks, err
}
