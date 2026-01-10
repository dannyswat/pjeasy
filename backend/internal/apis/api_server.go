package apis

import (
	"errors"

	"github.com/dannyswat/pjeasy/internal/repositories"
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

	userService *users.UserService
	userHandler *UserHandler
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
	)
}

func (s *APIServer) SetupAPIServer() error {
	s.uowFactory = repositories.NewUnitOfWorkFactory(s.gorm)
	// Global Unit of Work for read operations
	s.globalUOW = s.uowFactory.NewUnitOfWork()

	s.SetupUserService()

	// Initialize handlers
	s.userHandler = NewUserHandler(s.userService)

	// Register routes
	s.userHandler.RegisterRoutes(s.echo)

	return nil
}
