package apis

import (
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"github.com/google/uuid"
	"github.com/labstack/echo/v4"
)

const (
	maxUploadSize = 5 * 1024 * 1024 // 5MB
	uploadDir     = "uploads/images"
)

var allowedImageTypes = map[string]bool{
	"image/jpeg":    true,
	"image/jpg":     true,
	"image/png":     true,
	"image/gif":     true,
	"image/svg+xml": true,
	"image/webp":    true,
}

type UploadImageResponse struct {
	URL      string `json:"url"`
	Filename string `json:"filename"`
}

// UploadImage handles image file uploads
func (s *APIServer) UploadImage(c echo.Context) error {
	userID, err := GetUserIDFromContext(c)
	if err != nil {
		return err
	}
	// Get file from request
	file, err := c.FormFile("image")
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "No image file provided")
	}

	// Validate file size
	if file.Size > maxUploadSize {
		return echo.NewHTTPError(http.StatusBadRequest, "File size exceeds 5MB limit")
	}

	// Validate file type
	contentType := file.Header.Get("Content-Type")
	if !allowedImageTypes[contentType] {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid file type. Allowed: jpg, jpeg, png, gif, svg, webp")
	}

	// Open uploaded file
	src, err := file.Open()
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "Failed to read uploaded file")
	}
	defer src.Close()

	// Generate unique filename
	ext := filepath.Ext(file.Filename)
	if ext == "" {
		// Infer extension from content type
		switch contentType {
		case "image/jpeg", "image/jpg":
			ext = ".jpg"
		case "image/png":
			ext = ".png"
		case "image/gif":
			ext = ".gif"
		case "image/svg+xml":
			ext = ".svg"
		case "image/webp":
			ext = ".webp"
		}
	}

	filename := fmt.Sprintf("%d_%s%s", userID, uuid.New().String(), ext)

	// Create upload directory if it doesn't exist
	if err := os.MkdirAll(uploadDir, 0755); err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "Failed to create upload directory")
	}

	// Create destination file
	destPath := filepath.Join(uploadDir, filename)
	dst, err := os.Create(destPath)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "Failed to save file")
	}
	defer dst.Close()

	// Copy file contents
	if _, err := io.Copy(dst, src); err != nil {
		os.Remove(destPath) // Clean up on error
		return echo.NewHTTPError(http.StatusInternalServerError, "Failed to save file")
	}

	// Return URL (relative path for now, can be absolute URL in production)
	url := fmt.Sprintf("/uploads/images/%s", filename)

	return c.JSON(http.StatusOK, UploadImageResponse{
		URL:      url,
		Filename: filename,
	})
}

// ServeUploadedImage serves uploaded images
func (s *APIServer) ServeUploadedImage(c echo.Context) error {
	filename := c.Param("filename")

	// Validate filename to prevent directory traversal
	if strings.Contains(filename, "..") || strings.Contains(filename, "/") || strings.Contains(filename, "\\") {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid filename")
	}

	filePath := filepath.Join(uploadDir, filename)

	// Check if file exists
	if _, err := os.Stat(filePath); os.IsNotExist(err) {
		return echo.NewHTTPError(http.StatusNotFound, "Image not found")
	}

	// Determine content type from extension
	ext := strings.ToLower(filepath.Ext(filename))
	contentType := "application/octet-stream"
	switch ext {
	case ".jpg", ".jpeg":
		contentType = "image/jpeg"
	case ".png":
		contentType = "image/png"
	case ".gif":
		contentType = "image/gif"
	case ".svg":
		contentType = "image/svg+xml"
	case ".webp":
		contentType = "image/webp"
	}

	// Set cache headers for images
	c.Response().Header().Set("Content-Type", contentType)
	c.Response().Header().Set("Cache-Control", "public, max-age=31536000") // 1 year

	return c.File(filePath)
}

// RegisterUploadRoutes registers upload-related routes
func RegisterUploadRoutes(e *echo.Echo, server *APIServer, authMiddleware *AuthMiddleware) {
	// Upload endpoint (requires authentication)
	e.POST("/api/uploads/images", server.UploadImage, authMiddleware.RequireAuth)

	// Serve uploaded images (public access)
	e.GET("/uploads/images/:filename", server.ServeUploadedImage)
}
