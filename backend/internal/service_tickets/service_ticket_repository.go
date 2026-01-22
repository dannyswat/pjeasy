package service_tickets

import (
	"github.com/dannyswat/pjeasy/internal/repositories"
	"gorm.io/gorm"
)

type ServiceTicketRepository struct {
	uow *repositories.UnitOfWork
}

func NewServiceTicketRepository(uow *repositories.UnitOfWork) *ServiceTicketRepository {
	return &ServiceTicketRepository{uow: uow}
}

// Create creates a new service ticket
func (r *ServiceTicketRepository) Create(ticket *ServiceTicket) error {
	return r.uow.GetDB().Create(ticket).Error
}

// GetByID finds a service ticket by ID
func (r *ServiceTicketRepository) GetByID(id int) (*ServiceTicket, error) {
	var ticket ServiceTicket
	err := r.uow.GetDB().First(&ticket, id).Error
	if err == gorm.ErrRecordNotFound {
		return nil, nil
	}
	return &ticket, err
}

// Update updates a service ticket
func (r *ServiceTicketRepository) Update(ticket *ServiceTicket) error {
	return r.uow.GetDB().Save(ticket).Error
}

// Delete deletes a service ticket
func (r *ServiceTicketRepository) Delete(id int) error {
	return r.uow.GetDB().Delete(&ServiceTicket{}, id).Error
}

// GetByProjectID returns all service tickets for a project with pagination
func (r *ServiceTicketRepository) GetByProjectID(projectID int, offset, limit int) ([]ServiceTicket, int64, error) {
	var tickets []ServiceTicket
	var total int64

	query := r.uow.GetDB().Model(&ServiceTicket{}).Where("project_id = ?", projectID)

	// Get total count
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	// Get paginated results
	err := query.Order("created_at DESC").
		Offset(offset).
		Limit(limit).
		Find(&tickets).Error

	return tickets, total, err
}

// GetByProjectIDWithFilters returns service tickets filtered by status and priority with pagination
func (r *ServiceTicketRepository) GetByProjectIDWithFilters(projectID int, status, priority, sortBy string, offset, limit int) ([]ServiceTicket, int64, error) {
	var tickets []ServiceTicket
	var total int64

	query := r.uow.GetDB().Model(&ServiceTicket{}).Where("project_id = ?", projectID)

	if status != "" {
		query = query.Where("status = ?", status)
	}

	if priority != "" {
		query = query.Where("priority = ?", priority)
	}

	// Get total count
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	// Determine sort order
	var orderBy string
	switch sortBy {
	case "priority":
		// Sort by priority: immediate, urgent, high, normal, low
		orderBy = "CASE priority WHEN 'immediate' THEN 1 WHEN 'urgent' THEN 2 WHEN 'high' THEN 3 WHEN 'normal' THEN 4 WHEN 'low' THEN 5 ELSE 6 END, created_at DESC"
	case "created_at":
		orderBy = "created_at DESC"
	case "updated_at":
		orderBy = "updated_at DESC"
	case "title":
		orderBy = "title ASC"
	default:
		// Default to priority
		orderBy = "CASE priority WHEN 'immediate' THEN 1 WHEN 'urgent' THEN 2 WHEN 'high' THEN 3 WHEN 'normal' THEN 4 WHEN 'low' THEN 5 ELSE 6 END, created_at DESC"
	}

	// Get paginated results
	err := query.Order(orderBy).
		Offset(offset).
		Limit(limit).
		Find(&tickets).Error

	return tickets, total, err
}
