package apis

import (
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"

	"github.com/google/uuid"
	"github.com/labstack/echo/v4"
)

const (
	maxUploadSize = 5 * 1024 * 1024 // 5MB
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

type SaveDiagramRequest struct {
	ID      string `json:"id"`
	Diagram string `json:"diagram"`
	SVG     string `json:"svg"`
	PNG     string `json:"png"`
}

type SaveDiagramResponse struct {
	ID            string `json:"id"`
	DiagramSVGURL string `json:"diagramSvgUrl"`
	DiagramPNGURL string `json:"diagramPngUrl"`
}

func (s *APIServer) uploadRootDir() string {
	uploadDir := filepath.Clean(s.config.Server.UploadDir)
	if filepath.Base(uploadDir) == "images" {
		return filepath.Dir(uploadDir)
	}
	return uploadDir
}

func (s *APIServer) imageUploadDir() string {
	uploadDir := filepath.Clean(s.config.Server.UploadDir)
	if filepath.Base(uploadDir) == "images" {
		return uploadDir
	}
	return filepath.Join(uploadDir, "images")
}

func (s *APIServer) projectUploadDir(projectID int, kind string) string {
	return filepath.Join(s.uploadRootDir(), "project", strconv.Itoa(projectID), kind)
}

func ensureUploadDir(dirPath string) error {
	return os.MkdirAll(dirPath, 0755)
}

func writeFileFromReader(src io.Reader, destPath string) error {
	dst, err := os.Create(destPath)
	if err != nil {
		return err
	}
	defer dst.Close()

	if _, err := io.Copy(dst, src); err != nil {
		_ = os.Remove(destPath)
		return err
	}

	return nil
}

func writeFileBytes(destPath string, content []byte) error {
	if err := os.WriteFile(destPath, content, 0644); err != nil {
		_ = os.Remove(destPath)
		return err
	}
	return nil
}

func isSafeUploadIdentifier(value string) bool {
	if value == "" {
		return false
	}

	for _, char := range value {
		if (char < 'a' || char > 'z') &&
			(char < 'A' || char > 'Z') &&
			(char < '0' || char > '9') &&
			char != '-' &&
			char != '_' {
			return false
		}
	}

	return true
}

func getPngBinaryFromBase64DataURL(dataURL string) ([]byte, error) {
	parts := strings.SplitN(dataURL, ",", 2)
	if len(parts) != 2 {
		return nil, fmt.Errorf("invalid data URL format")
	}

	return base64.StdEncoding.DecodeString(parts[1])
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

	uploadDir := s.imageUploadDir()

	// Create upload directory if it doesn't exist
	if err := ensureUploadDir(uploadDir); err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "Failed to create upload directory")
	}

	// Create destination file
	destPath := filepath.Join(uploadDir, filename)
	if err := writeFileFromReader(src, destPath); err != nil {
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

	filePath := filepath.Join(s.imageUploadDir(), filename)

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

func (s *APIServer) SaveDiagram(c echo.Context) error {
	projectID, err := GetProjectIDFromContext(c)
	if err != nil {
		return err
	}

	req := new(SaveDiagramRequest)
	if err := c.Bind(req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid request payload")
	}

	if !isSafeUploadIdentifier(req.ID) {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid diagram id")
	}

	if !json.Valid([]byte(req.Diagram)) {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid diagram source")
	}

	pngBinary, err := getPngBinaryFromBase64DataURL(req.PNG)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid PNG content")
	}

	sourceDir := s.projectUploadDir(projectID, "diagramsrc")
	diagramDir := s.projectUploadDir(projectID, "diagram")
	if err := ensureUploadDir(sourceDir); err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "Failed to create diagram source directory")
	}
	if err := ensureUploadDir(diagramDir); err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "Failed to create diagram directory")
	}

	if err := writeFileBytes(filepath.Join(sourceDir, req.ID+".json"), []byte(req.Diagram)); err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "Failed to save diagram source")
	}
	if err := writeFileBytes(filepath.Join(diagramDir, req.ID+".svg"), []byte(req.SVG)); err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "Failed to save diagram SVG")
	}
	if err := writeFileBytes(filepath.Join(diagramDir, req.ID+".png"), pngBinary); err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "Failed to save diagram PNG")
	}

	return c.JSON(http.StatusOK, SaveDiagramResponse{
		ID:            req.ID,
		DiagramSVGURL: fmt.Sprintf("/api/projects/%d/diagrams/%s.svg", projectID, req.ID),
		DiagramPNGURL: fmt.Sprintf("/api/projects/%d/diagrams/%s.png", projectID, req.ID),
	})
}

func (s *APIServer) GetDiagramSource(c echo.Context) error {
	projectID, err := GetProjectIDFromContext(c)
	if err != nil {
		return err
	}

	id := c.Param("id")
	if !isSafeUploadIdentifier(id) {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid diagram id")
	}

	filePath := filepath.Join(s.projectUploadDir(projectID, "diagramsrc"), id+".json")
	if _, err := os.Stat(filePath); os.IsNotExist(err) {
		return echo.NewHTTPError(http.StatusNotFound, "Diagram source not found")
	}

	c.Response().Header().Set("Content-Type", "application/json")
	return c.File(filePath)
}

func (s *APIServer) ServeProjectDiagram(c echo.Context) error {
	projectID, err := GetProjectIDFromContext(c)
	if err != nil {
		return err
	}

	filename := c.Param("filename")
	if strings.Contains(filename, "..") || strings.Contains(filename, "/") || strings.Contains(filename, "\\") {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid filename")
	}

	baseName := strings.TrimSuffix(filename, filepath.Ext(filename))
	if !isSafeUploadIdentifier(baseName) {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid filename")
	}

	filePath := filepath.Join(s.projectUploadDir(projectID, "diagram"), filename)
	if _, err := os.Stat(filePath); os.IsNotExist(err) {
		return echo.NewHTTPError(http.StatusNotFound, "Diagram not found")
	}

	contentType := "application/octet-stream"
	switch strings.ToLower(filepath.Ext(filename)) {
	case ".svg":
		contentType = "image/svg+xml"
	case ".png":
		contentType = "image/png"
	default:
		return echo.NewHTTPError(http.StatusBadRequest, "Unsupported diagram format")
	}

	c.Response().Header().Set("Content-Type", contentType)
	c.Response().Header().Set("Cache-Control", "private, max-age=31536000")

	return c.File(filePath)
}

// RegisterUploadRoutes registers upload-related routes
func RegisterUploadRoutes(e *echo.Echo, server *APIServer, authMiddleware *AuthMiddleware, projectMiddleware *ProjectMiddleware) {
	// Upload endpoint (requires authentication)
	e.POST("/api/uploads/images", server.UploadImage, authMiddleware.RequireAuth)

	// Serve uploaded images (public access)
	e.GET("/uploads/images/:filename", server.ServeUploadedImage)

	diagrams := e.Group("/api/projects/:projectId/diagrams", authMiddleware.RequireAuth, projectMiddleware.RequireProjectMember)
	diagrams.POST("", server.SaveDiagram)
	diagrams.GET("/source/:id", server.GetDiagramSource)
	diagrams.GET("/:filename", server.ServeProjectDiagram)
}
