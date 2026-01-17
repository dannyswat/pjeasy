package apis

import (
	"fmt"
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

		// Get the actual status code
		status := res.Status
		errMsg := ""
		if err != nil {
			// If there's an error, Echo might have set it to an HTTP error
			if he, ok := err.(*echo.HTTPError); ok {
				status = he.Code
				errMsg = fmt.Sprintf(" [Error: %v]", he.Message)
			} else {
				errMsg = fmt.Sprintf(" [Error: %v]", err)
			}
		}

		// Log the request details to stdout
		fmt.Printf("[%s] %s %s %d %v %s%s\n",
			start.Format("2006-01-02 15:04:05"),
			req.Method,
			req.URL.Path,
			status,
			latency,
			req.RemoteAddr,
			errMsg,
		)

		return err
	}
}
