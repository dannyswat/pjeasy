package users

import "time"

type UserCredential struct {
	ID                 int
	UserID             int
	Type               CredentialType
	SecretValue        string
	LastSecretChangeAt time.Time
	ExpireAfter        time.Time
}

type CredentialType string
