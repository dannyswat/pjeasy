package main

import (
	"github.com/dannyswat/pjeasy/internal/apis"
	"github.com/dannyswat/pjeasy/internal/repositories"
)

func main() {
	// Entry point for the API server
	apiServer := apis.NewAPIServer()
	err := apiServer.SetupDatabase(&repositories.DatabaseConfig{
		Host:     "localhost",
		Port:     5432,
		User:     "postgres",
		Password: "postgres",
		DBName:   "pjeasy",
		SSLMode:  "disable",
	})
	if err != nil {
		panic(err)
	}
	err = apiServer.AutoMigrate(true)
	if err != nil {
		panic(err)
	}
	err = apiServer.SetupAPIServer()
	if err != nil {
		panic(err)
	}
	apiServer.StartOrFatal()
}
