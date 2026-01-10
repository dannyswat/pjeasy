package users

import "time"

type User struct {
	ID              int
	LoginID         string
	Name            string
	ProfileImageURL string
	CreatedAt       time.Time
	UpdatedAt       time.Time
}
