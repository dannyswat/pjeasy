package projects

import "time"

// ProjectInvitation grants a reusable project membership link.
type ProjectInvitation struct {
	ID        int        `gorm:"primaryKey;autoIncrement" json:"id"`
	ProjectID int        `gorm:"not null;index" json:"projectId"`
	Token     string     `gorm:"not null;uniqueIndex" json:"token"`
	TokenHash string     `gorm:"not null;uniqueIndex;size:64" json:"-"`
	IsUser    bool       `gorm:"default:false" json:"isUser"`
	ExpiresAt *time.Time `json:"expiresAt,omitempty"`
	CreatedBy int        `gorm:"not null" json:"createdBy"`
	CreatedAt time.Time  `gorm:"not null" json:"createdAt"`
	RevokedAt *time.Time `json:"revokedAt,omitempty"`
}

func (i ProjectInvitation) TableName() string {
	return "project_invitations"
}

func (i ProjectInvitation) Role() string {
	if i.IsUser {
		return "user"
	}

	return "member"
}

func (i ProjectInvitation) IsActive(now time.Time) bool {
	if i.RevokedAt != nil {
		return false
	}

	if i.ExpiresAt != nil && now.After(*i.ExpiresAt) {
		return false
	}

	return true
}
