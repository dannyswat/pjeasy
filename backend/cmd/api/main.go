package main

import (
	"flag"
	"fmt"

	"github.com/dannyswat/pjeasy/internal/apis"
	"github.com/dannyswat/pjeasy/internal/config"
)

func main() {
	configPath := flag.String("config", "config.json", "Path to config file")
	flag.Parse()

	// Load configuration
	cfg := config.LoadConfigOrDefault(*configPath)
	fmt.Printf("Starting PJEasy API server on %s\n", cfg.Server.Address)

	// Entry point for the API server
	apiServer := apis.NewAPIServer(cfg)
	err := apiServer.SetupDatabase()
	if err != nil {
		panic(err)
	}
	err = apiServer.AutoMigrate()
	if err != nil {
		panic(err)
	}
	err = apiServer.SetupAPIServer()
	if err != nil {
		panic(err)
	}
	apiServer.StartOrFatal()
}
