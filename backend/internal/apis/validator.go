package apis

import (
	"regexp"
	"strings"

	"github.com/go-playground/validator/v10"
	"github.com/labstack/echo/v4"
)

type CustomValidator struct {
	validator *validator.Validate
}

func NewValidator() *CustomValidator {
	v := validator.New()

	// Register custom validation for complex password
	v.RegisterValidation("complexpassword", validateComplexPassword)

	return &CustomValidator{validator: v}
}

func (cv *CustomValidator) Validate(i interface{}) error {
	if err := cv.validator.Struct(i); err != nil {
		return echo.NewHTTPError(400, err.Error())
	}
	return nil
}

// validateComplexPassword checks if password meets complexity requirements:
// - At least 8 characters
// - Contains at least one uppercase letter
// - Contains at least one lowercase letter
// - Contains at least one number
// - Contains at least one special character
func validateComplexPassword(fl validator.FieldLevel) bool {
	password := fl.Field().String()

	// Minimum length check
	if len(password) < 8 {
		return false
	}

	// Check for at least one uppercase letter
	hasUpper := regexp.MustCompile(`[A-Z]`).MatchString(password)

	// Check for at least one lowercase letter
	hasLower := regexp.MustCompile(`[a-z]`).MatchString(password)

	// Check for at least one digit
	hasNumber := regexp.MustCompile(`[0-9]`).MatchString(password)

	// Check for at least one special character
	hasSpecial := regexp.MustCompile(`[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]`).MatchString(password)

	return hasUpper && hasLower && hasNumber && hasSpecial
}

// GetPasswordRequirements returns a human-readable list of password requirements
func GetPasswordRequirements() string {
	return strings.Join([]string{
		"Password must contain:",
		"- At least 8 characters",
		"- At least one uppercase letter (A-Z)",
		"- At least one lowercase letter (a-z)",
		"- At least one number (0-9)",
		"- At least one special character (!@#$%^&*...)",
	}, "\n")
}
