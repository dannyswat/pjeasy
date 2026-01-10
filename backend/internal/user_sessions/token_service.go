package user_sessions

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"errors"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

// TokenService handles token generation and validation with security best practices:
// - Access tokens are short-lived JWTs (15 min default)
// - Refresh tokens are random 256-bit tokens (7 days default)
// - Only hashed refresh tokens are stored in database (SHA256)
// - Session ID and refresh token validated separately
// - Token rotation on refresh to limit exposure window
type TokenService struct {
	jwtSecret            []byte
	accessTokenDuration  time.Duration
	refreshTokenDuration time.Duration
}

type TokenClaims struct {
	UserID  int    `json:"user_id"`
	LoginID string `json:"login_id"`
	jwt.RegisteredClaims
}

func NewTokenService(jwtSecret string, accessTokenDuration, refreshTokenDuration time.Duration) *TokenService {
	return &TokenService{
		jwtSecret:            []byte(jwtSecret),
		accessTokenDuration:  accessTokenDuration,
		refreshTokenDuration: refreshTokenDuration,
	}
}

func (s *TokenService) GenerateAccessToken(userID int, loginID string) (string, error) {
	claims := TokenClaims{
		UserID:  userID,
		LoginID: loginID,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(s.accessTokenDuration)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(s.jwtSecret)
}

// GenerateRefreshToken creates a random 256-bit token
func (s *TokenService) GenerateRefreshToken() (string, error) {
	b := make([]byte, 32)
	_, err := rand.Read(b)
	if err != nil {
		return "", err
	}
	return base64.URLEncoding.EncodeToString(b), nil
}

// HashRefreshToken creates a SHA256 hash of the token
func (s *TokenService) HashRefreshToken(token string) string {
	hash := sha256.Sum256([]byte(token))
	return hex.EncodeToString(hash[:])
}

// ValidateRefreshToken checks if the provided token matches the stored hash
func (s *TokenService) ValidateRefreshToken(token, storedHash string) bool {
	computedHash := s.HashRefreshToken(token)
	return computedHash == storedHash
}

func (s *TokenService) ValidateAccessToken(tokenString string) (*TokenClaims, error) {
	token, err := jwt.ParseWithClaims(tokenString, &TokenClaims{}, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, errors.New("unexpected signing method")
		}
		return s.jwtSecret, nil
	})

	if err != nil {
		return nil, err
	}

	if claims, ok := token.Claims.(*TokenClaims); ok && token.Valid {
		return claims, nil
	}

	return nil, errors.New("invalid token")
}

func (s *TokenService) GetRefreshTokenDuration() time.Duration {
	return s.refreshTokenDuration
}
