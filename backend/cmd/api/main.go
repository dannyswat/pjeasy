package main

import (
	"github.com/dannyswat/pjeasy/internal/apis"
	"github.com/dannyswat/pjeasy/internal/repositories"
)

func main() {
	// Entry point for the API server
	apiServer := apis.NewAPIServer()
	apiServer.SetupDatabase(&repositories.DatabaseConfig{
		Host:     "localhost",
		Port:     5432,
		User:     "youruser",
		Password: "yourpassword",
		DBName:   "yourdbname",
		SSLMode:  "disable",
	})
	apiServer.AutoMigrate(true)
	err := apiServer.SetupAPIServer()
	if err != nil {
		panic(err)
	}
	apiServer.StartOrFatal()
}
