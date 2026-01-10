package users

import "golang.org/x/crypto/bcrypt"

type PasswordCredential struct {
}

const (
	CredentialTypePassword CredentialType = "password"
)

func (pc *PasswordCredential) GetType() CredentialType {
	return CredentialTypePassword
}

func (pc *PasswordCredential) GenerateSecretValue(credential string) (string, error) {
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(credential), bcrypt.DefaultCost)
	if err != nil {
		return "", err
	}
	return string(hashedPassword), nil
}

func (pc *PasswordCredential) Validate(credential string, secretValue string) (bool, error) {
	err := bcrypt.CompareHashAndPassword([]byte(secretValue), []byte(credential))
	if err != nil {
		if err == bcrypt.ErrMismatchedHashAndPassword {
			return false, nil
		}
		return false, err
	}
	return true, nil
}
