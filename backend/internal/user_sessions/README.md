# User Session Management - Security Best Practices

This package implements secure user session management following modern security best practices.

## Security Features

### 1. UUID-Based Session Identifiers
- Sessions use UUIDs instead of sequential integers
- Prevents session enumeration attacks
- Makes session IDs unpredictable

### 2. Hashed Refresh Tokens
- Refresh tokens are never stored in plaintext
- SHA256 hashing applied before database storage
- Protects against database compromise scenarios

### 3. Composite Refresh Tokens
- Format: `sessionID:randomToken`
- Session ID validated separately from token
- Prevents token reuse across different sessions
- Both components required for successful refresh

### 4. Token Rotation
- New tokens issued on each refresh
- Old tokens immediately revoked
- Limits exposure window if token is compromised

### 5. Short-Lived Access Tokens
- JWT access tokens expire in 15 minutes (configurable)
- Reduces impact of token theft
- Forces regular re-validation via refresh token

### 6. Session Metadata Tracking
- User agent and IP address stored
- Last refresh timestamp recorded
- Enables anomaly detection and audit trails

### 7. Proper Token Expiration
- Refresh tokens expire after 7 days (configurable)
- Expired sessions automatically invalidated
- Revoked sessions cannot be reused

## Token Flow

### Login
1. User authenticates with credentials
2. System creates new session with UUID
3. Generates composite refresh token: `uuid:random32bytes`
4. Hashes token portion and stores in database
5. Returns JWT access token + composite refresh token to client

### Refresh
1. Client sends composite refresh token
2. System parses sessionID and token portions
3. Validates session exists and is not revoked/expired
4. Computes hash of token and compares with stored hash
5. If valid, generates new access token
6. Revokes old session and creates new one
7. Returns new access token + new composite refresh token

### Revoke
1. Client sends composite refresh token
2. System extracts session ID
3. Marks session as revoked with timestamp
4. Session cannot be used for future refreshes

## Implementation Details

### Database Schema
```go
type UserSession struct {
    ID                 uuid.UUID  // Primary key (UUID)
    UserID             int        // Foreign key to users table
    RefreshTokenHash   string     // SHA256 hash (64 chars)
    ExpiresAt          time.Time  // Token expiration
    CreatedAt          time.Time  // Session creation
    RevokedAt          *time.Time // Revocation timestamp (nullable)
    LastRefreshedAt    *time.Time // Last token refresh (nullable)
    UserAgent          string     // Client user agent
    IPAddress          string     // Client IP address
}
```

### Token Format
- **Access Token**: Standard JWT with HS256 signing
- **Refresh Token**: `{uuid}:{base64(32_random_bytes)}`
- **Stored Hash**: `sha256(base64(32_random_bytes))`

## Configuration

Configure token durations in `api_server.go`:
```go
jwtSecret := "your-secret-key-change-this-in-production"
accessTokenDuration := 15 * time.Minute
refreshTokenDuration := 7 * 24 * time.Hour
```

⚠️ **Important**: Change the JWT secret in production!

## Security Recommendations

1. **Use HTTPS**: Always transmit tokens over secure connections
2. **Secure Storage**: Store tokens in httpOnly cookies or secure storage
3. **Rate Limiting**: Implement rate limiting on token endpoints
4. **Monitor Sessions**: Track unusual refresh patterns
5. **Rotate Secrets**: Periodically rotate JWT signing keys
6. **Clean Expired**: Regularly purge expired sessions from database
7. **CSRF Protection**: Implement CSRF tokens for state-changing operations
