package apis

import (
	"errors"
	"time"

	"github.com/dannyswat/pjeasy/internal/comments"
	"github.com/dannyswat/pjeasy/internal/ideas"
	"github.com/dannyswat/pjeasy/internal/issues"
	"github.com/dannyswat/pjeasy/internal/projects"
	"github.com/dannyswat/pjeasy/internal/repositories"
	"github.com/dannyswat/pjeasy/internal/sequences"
	"github.com/dannyswat/pjeasy/internal/service_tickets"
	"github.com/dannyswat/pjeasy/internal/tasks"
	userroles "github.com/dannyswat/pjeasy/internal/user_roles"
	"github.com/dannyswat/pjeasy/internal/user_sessions"
	"github.com/dannyswat/pjeasy/internal/users"
	"github.com/labstack/echo/v4"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

type APIServer struct {
	Address    string
	echo       *echo.Echo
	gorm       *gorm.DB
	uowFactory *repositories.UnitOfWorkFactory
	globalUOW  *repositories.UnitOfWork

	userService          *users.UserService
	sessionService       *user_sessions.SessionService
	adminService         *userroles.SystemAdminService
	projectService       *projects.ProjectService
	ideaService          *ideas.IdeaService
	issueService         *issues.IssueService
	serviceTicketService *service_tickets.ServiceTicketService
	commentService       *comments.CommentService
	sequenceService      *sequences.SequenceService
	taskService          *tasks.TaskService
	tokenService         *user_sessions.TokenService
	userHandler          *UserHandler
	sessionHandler       *SessionHandler
	adminHandler         *AdminHandler
	projectHandler       *ProjectHandler
	ideaHandler          *IdeaHandler
	issueHandler         *IssueHandler
	serviceTicketHandler *ServiceTicketHandler
	commentHandler       *CommentHandler
	sequenceHandler      *SequenceHandler
	taskHandler          *TaskHandler
	authMiddleware       *AuthMiddleware
	projectMiddleware    *ProjectMiddleware
}

func (s *APIServer) StartOrFatal() {
	s.echo.Logger.Fatal(s.echo.Start(s.Address))
}

func NewAPIServer() *APIServer {
	return &APIServer{
		Address: ":8080",
		echo:    echo.New(),
	}
}

func (s *APIServer) SetupDatabase(config *repositories.DatabaseConfig) error {

	db, err := gorm.Open(postgres.New(postgres.Config{
		DSN: config.GetPostgresConnectionString(),
	}), &gorm.Config{})
	if err != nil {
		return err
	}

	s.gorm = db

	return nil
}

func (s *APIServer) AutoMigrate(enabled bool) error {
	if !enabled {
		return nil
	}
	if s.gorm == nil {
		return errors.New("Database has not been initialized")
	}
	return s.gorm.AutoMigrate(
		users.User{},
		users.UserCredential{},
		&user_sessions.UserSession{},
		&userroles.SystemAdmin{},
		&projects.Project{},
		&projects.ProjectMember{},
		&ideas.Idea{},
		&issues.Issue{},
		&service_tickets.ServiceTicket{},
		&comments.Comment{},
		&sequences.Sequence{},
		&sequences.SequenceNumber{},
		&tasks.Task{},
	)
}

func (s *APIServer) SetupAPIServer() error {
	s.uowFactory = repositories.NewUnitOfWorkFactory(s.gorm)
	// Global Unit of Work for read operations
	s.globalUOW = s.uowFactory.NewUnitOfWork()

	// Register global middleware
	s.echo.Use(LoggingMiddleware)

	// Register custom validator
	s.echo.Validator = NewValidator()

	s.SetupUserService()

	// Initialize admin service
	adminRepo := userroles.NewSystemAdminRepository(s.globalUOW)
	userRepo := users.NewUserRepository(s.globalUOW)
	s.adminService = userroles.NewSystemAdminService(adminRepo, userRepo)

	// Initialize sequence service
	sequenceRepo := sequences.NewSequenceRepository(s.globalUOW)
	s.sequenceService = sequences.NewSequenceService(sequenceRepo)

	// Initialize project service
	projectRepo := projects.NewProjectRepository(s.globalUOW)
	memberRepo := projects.NewProjectMemberRepository(s.globalUOW)
	memberCache := projects.NewProjectMemberCache(memberRepo, 1*time.Hour)
	s.projectService = projects.NewProjectService(projectRepo, memberRepo, userRepo, sequenceRepo, memberCache)

	// Initialize idea service
	ideaRepo := ideas.NewIdeaRepository(s.globalUOW)
	s.ideaService = ideas.NewIdeaService(ideaRepo, memberRepo, projectRepo, sequenceRepo, s.uowFactory)

	// Initialize issue service
	issueRepo := issues.NewIssueRepository(s.globalUOW)
	s.issueService = issues.NewIssueService(issueRepo, memberRepo, projectRepo, sequenceRepo, s.uowFactory)

	// Initialize service ticket service
	serviceTicketRepo := service_tickets.NewServiceTicketRepository(s.globalUOW)
	s.serviceTicketService = service_tickets.NewServiceTicketService(serviceTicketRepo, memberRepo, projectRepo, sequenceRepo, s.uowFactory)

	// Initialize comment service
	commentRepo := comments.NewCommentRepository(s.globalUOW)
	s.commentService = comments.NewCommentService(commentRepo, userRepo)

	// Initialize task service
	taskRepo := tasks.NewTaskRepository(s.globalUOW)
	s.taskService = tasks.NewTaskService(taskRepo, memberRepo, projectRepo, sequenceRepo, serviceTicketRepo, s.uowFactory)

	// Initialize handlers
	s.userHandler = NewUserHandler(s.userService)
	s.sessionHandler = NewSessionHandler(s.userService, s.sessionService)
	s.adminHandler = NewAdminHandler(s.adminService)
	s.projectHandler = NewProjectHandler(s.projectService)
	s.ideaHandler = NewIdeaHandler(s.ideaService)
	s.issueHandler = NewIssueHandler(s.issueService)
	s.serviceTicketHandler = NewServiceTicketHandler(s.serviceTicketService)
	s.commentHandler = NewCommentHandler(s.commentService)
	s.sequenceHandler = NewSequenceHandler(s.sequenceService)
	s.taskHandler = NewTaskHandler(s.taskService)
	s.authMiddleware = NewAuthMiddleware(s.tokenService, s.adminService)
	s.projectMiddleware = NewProjectMiddleware(memberCache)

	// Register routes
	s.userHandler.RegisterRoutes(s.echo, s.authMiddleware)
	s.sessionHandler.RegisterRoutes(s.echo)
	s.adminHandler.RegisterRoutes(s.echo, s.authMiddleware)
	s.projectHandler.RegisterRoutes(s.echo, s.authMiddleware, s.projectMiddleware)
	s.ideaHandler.RegisterRoutes(s.echo, s.authMiddleware, s.projectMiddleware)
	s.issueHandler.RegisterRoutes(s.echo, s.authMiddleware, s.projectMiddleware)
	s.serviceTicketHandler.RegisterRoutes(s.echo, s.authMiddleware, s.projectMiddleware)
	s.commentHandler.RegisterRoutes(s.echo, s.authMiddleware, s.projectMiddleware)
	s.sequenceHandler.RegisterRoutes(s.echo, s.authMiddleware, s.projectMiddleware)
	s.taskHandler.RegisterRoutes(s.echo, s.authMiddleware, s.projectMiddleware)

	// Register upload routes
	RegisterUploadRoutes(s.echo, s, s.authMiddleware)

	return nil
}
