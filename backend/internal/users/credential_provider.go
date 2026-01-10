package users

type CredentialProvider interface {
	GetType() CredentialType
	GenerateSecretValue(credential string) (string, error)
	Validate(credential string, secretValue string) (bool, error)
}
