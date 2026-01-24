package service_tickets

import (
	"errors"
	"time"

	"github.com/dannyswat/pjeasy/internal/projects"
	"github.com/dannyswat/pjeasy/internal/repositories"
	"github.com/dannyswat/pjeasy/internal/sequences"
)

type ServiceTicketService struct {
	ticketRepo   *ServiceTicketRepository
	memberRepo   *projects.ProjectMemberRepository
	projectRepo  *projects.ProjectRepository
	sequenceRepo *sequences.SequenceRepository
	uowFactory   *repositories.UnitOfWorkFactory
}

func NewServiceTicketService(ticketRepo *ServiceTicketRepository, memberRepo *projects.ProjectMemberRepository, projectRepo *projects.ProjectRepository, sequenceRepo *sequences.SequenceRepository, uowFactory *repositories.UnitOfWorkFactory) *ServiceTicketService {
	return &ServiceTicketService{
		ticketRepo:   ticketRepo,
		memberRepo:   memberRepo,
		projectRepo:  projectRepo,
		sequenceRepo: sequenceRepo,
		uowFactory:   uowFactory,
	}
}

// CreateServiceTicket creates a new service ticket
func (s *ServiceTicketService) CreateServiceTicket(projectID int, title, description, priority string, createdBy int) (*ServiceTicket, error) {
	// Validate project exists
	project, err := s.projectRepo.GetByID(projectID)
	if err != nil {
		return nil, err
	}
	if project == nil {
		return nil, errors.New("project not found")
	}

	// Check if user has access to this project (any role including User)
	isMember, err := s.memberRepo.IsUserMember(projectID, createdBy)
	if err != nil {
		return nil, err
	}
	if !isMember {
		return nil, errors.New("user does not have access to this project")
	}

	// Validate priority
	if priority == "" {
		priority = ServiceTicketPriorityNormal
	}
	if !IsValidPriority(priority) {
		return nil, errors.New("invalid priority")
	}

	uow := s.uowFactory.NewUnitOfWork()
	// Begin transaction to generate RefNum and create ticket
	if err := uow.BeginTransaction(); err != nil {
		return nil, err
	}
	defer uow.RollbackTransactionIfError()

	// Generate reference number
	refNum, err := s.sequenceRepo.GetNextNumber(uow, projectID, "service_tickets")
	if err != nil {
		uow.RollbackTransaction()
		return nil, err
	}

	now := time.Now()
	ticket := &ServiceTicket{
		RefNum:      refNum,
		ProjectID:   projectID,
		Title:       title,
		Description: description,
		Status:      ServiceTicketStatusNew,
		Priority:    priority,
		CreatedBy:   createdBy,
		CreatedAt:   now,
		UpdatedAt:   now,
	}

	// Create a new repository instance with the transaction UOW
	txTicketRepo := NewServiceTicketRepository(uow)
	if err := txTicketRepo.Create(ticket); err != nil {
		uow.RollbackTransaction()
		return nil, err
	}

	if err := uow.CommitTransaction(); err != nil {
		return nil, err
	}

	return ticket, nil
}

// UpdateServiceTicket updates an existing service ticket
func (s *ServiceTicketService) UpdateServiceTicket(ticketID int, title, description, priority string, updatedBy int) (*ServiceTicket, error) {
	ticket, err := s.ticketRepo.GetByID(ticketID)
	if err != nil {
		return nil, err
	}
	if ticket == nil {
		return nil, errors.New("service ticket not found")
	}

	// Check if user is a member of the project
	isMember, err := s.memberRepo.IsUserMember(ticket.ProjectID, updatedBy)
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

	// Update fields
	ticket.Title = title
	ticket.Description = description
	if priority != "" {
		ticket.Priority = priority
	}
	ticket.UpdatedAt = time.Now()

	if err := s.ticketRepo.Update(ticket); err != nil {
		return nil, err
	}

	return ticket, nil
}

// UpdateServiceTicketStatus updates the status of a service ticket
func (s *ServiceTicketService) UpdateServiceTicketStatus(ticketID int, status string, updatedBy int) (*ServiceTicket, error) {
	ticket, err := s.ticketRepo.GetByID(ticketID)
	if err != nil {
		return nil, err
	}
	if ticket == nil {
		return nil, errors.New("service ticket not found")
	}

	// Check if user is a member of the project
	isMember, err := s.memberRepo.IsUserMember(ticket.ProjectID, updatedBy)
	if err != nil {
		return nil, err
	}
	if !isMember {
		return nil, errors.New("user is not a member of this project")
	}

	// Validate status
	if !IsValidStatus(status) {
		return nil, errors.New("invalid status")
	}

	ticket.Status = status
	ticket.UpdatedAt = time.Now()

	if err := s.ticketRepo.Update(ticket); err != nil {
		return nil, err
	}

	return ticket, nil
}

// DeleteServiceTicket deletes a service ticket
func (s *ServiceTicketService) DeleteServiceTicket(ticketID int, deletedBy int) error {
	ticket, err := s.ticketRepo.GetByID(ticketID)
	if err != nil {
		return err
	}
	if ticket == nil {
		return errors.New("service ticket not found")
	}

	// Check if user is a member of the project
	isMember, err := s.memberRepo.IsUserMember(ticket.ProjectID, deletedBy)
	if err != nil {
		return err
	}
	if !isMember {
		return errors.New("user is not a member of this project")
	}

	return s.ticketRepo.Delete(ticketID)
}

// GetServiceTicket retrieves a service ticket by ID
func (s *ServiceTicketService) GetServiceTicket(ticketID int, userID int) (*ServiceTicket, error) {
	ticket, err := s.ticketRepo.GetByID(ticketID)
	if err != nil {
		return nil, err
	}
	if ticket == nil {
		return nil, errors.New("service ticket not found")
	}

	// Check if user has access to the project
	isMember, err := s.memberRepo.IsUserMember(ticket.ProjectID, userID)
	if err != nil {
		return nil, err
	}
	if !isMember {
		return nil, errors.New("user does not have access to this project")
	}

	return ticket, nil
}

// ListServiceTickets returns a paginated list of service tickets for a project
func (s *ServiceTicketService) ListServiceTickets(projectID, page, pageSize int, status, priority, sortBy string, userID int) ([]ServiceTicket, int64, error) {
	// Check if user has access to the project
	isMember, err := s.memberRepo.IsUserMember(projectID, userID)
	if err != nil {
		return nil, 0, err
	}
	if !isMember {
		return nil, 0, errors.New("user does not have access to this project")
	}

	offset := (page - 1) * pageSize

	return s.ticketRepo.GetByProjectIDWithFilters(projectID, status, priority, sortBy, offset, pageSize)
}

// CountNewServiceTickets returns the count of service tickets with status "New" for a project
func (s *ServiceTicketService) CountNewServiceTickets(projectID int, userID int) (int64, error) {
	// Check if user has access to the project
	isMember, err := s.memberRepo.IsUserMember(projectID, userID)
	if err != nil {
		return 0, err
	}
	if !isMember {
		return 0, errors.New("user does not have access to this project")
	}

	return s.ticketRepo.CountByStatus(projectID, ServiceTicketStatusNew)
}
