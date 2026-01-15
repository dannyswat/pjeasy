package apis

import (
	"time"

	"github.com/labstack/echo/v4"
)

// LoggingMiddleware creates a middleware that logs HTTP requests
func LoggingMiddleware(next echo.HandlerFunc) echo.HandlerFunc {
	return func(c echo.Context) error {
		start := time.Now()

		req := c.Request()
		res := c.Response()

		// Call the next handler
		err := next(c)

		// Calculate latency
		latency := time.Since(start)

		// Log the request details
		c.Logger().Infof("%s %s %d %s %s",
			req.Method,
			req.URL.Path,
			res.Status,
			latency,
			req.RemoteAddr,
		)

		return err
	}
}
