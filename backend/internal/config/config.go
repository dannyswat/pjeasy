package config

import (
	"encoding/json"
	"fmt"
	"os"
	"time"

	"github.com/dannyswat/pjeasy/internal/repositories"
)

type Config struct {
	Server      ServerConfig   `json:"server"`
	Database    DatabaseConfig `json:"database"`
	Auth        AuthConfig     `json:"auth"`
	AutoMigrate bool           `json:"autoMigrate"`
}

type ServerConfig struct {
	Address     string `json:"address"`
	FrontendDir string `json:"frontendDir"`
	UploadDir   string `json:"uploadDir"`
}

type DatabaseConfig struct {
	Host     string `json:"host"`
	Port     int    `json:"port"`
	User     string `json:"user"`
	Password string `json:"password"`
	DBName   string `json:"dbName"`
	SSLMode  string `json:"sslMode"`
}

type AuthConfig struct {
	JWTSecret            string `json:"jwtSecret"`
	AccessTokenDuration  string `json:"accessTokenDuration"`
	RefreshTokenDuration string `json:"refreshTokenDuration"`
}

func (c *AuthConfig) GetAccessTokenDuration() time.Duration {
	d, err := time.ParseDuration(c.AccessTokenDuration)
	if err != nil {
		return 15 * time.Minute
	}
	return d
}

func (c *AuthConfig) GetRefreshTokenDuration() time.Duration {
	d, err := time.ParseDuration(c.RefreshTokenDuration)
	if err != nil {
		return 30 * 24 * time.Hour
	}
	return d
}

func (dc *DatabaseConfig) ToRepositoryConfig() *repositories.DatabaseConfig {
	return &repositories.DatabaseConfig{
		Host:     dc.Host,
		Port:     dc.Port,
		User:     dc.User,
		Password: dc.Password,
		DBName:   dc.DBName,
		SSLMode:  dc.SSLMode,
	}
}

// DefaultConfig returns the default configuration
func DefaultConfig() *Config {
	return &Config{
		Server: ServerConfig{
			Address:     ":8080",
			FrontendDir: "",
			UploadDir:   "uploads/images",
		},
		Database: DatabaseConfig{
			Host:     "localhost",
			Port:     5432,
			User:     "postgres",
			Password: "postgres",
			DBName:   "pjeasy",
			SSLMode:  "disable",
		},
		Auth: AuthConfig{
			JWTSecret:            "your-secret-key-change-this-in-production",
			AccessTokenDuration:  "15m",
			RefreshTokenDuration: "720h",
		},
		AutoMigrate: true,
	}
}

// LoadConfig loads config from a JSON file. Unspecified fields use default values.
func LoadConfig(path string) (*Config, error) {
	cfg := DefaultConfig()

	data, err := os.ReadFile(path)
	if err != nil {
		return nil, fmt.Errorf("failed to read config file: %w", err)
	}

	if err := json.Unmarshal(data, cfg); err != nil {
		return nil, fmt.Errorf("failed to parse config file: %w", err)
	}

	return cfg, nil
}

// LoadConfigOrDefault tries to load config from path; if not found, returns defaults.
func LoadConfigOrDefault(path string) *Config {
	cfg, err := LoadConfig(path)
	if err != nil {
		fmt.Printf("Config file not found or invalid (%s), using defaults\n", path)
		return DefaultConfig()
	}
	return cfg
}
