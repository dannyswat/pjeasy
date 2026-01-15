package projects

import (
	"sync"
	"time"
)

// ProjectMemberCache provides caching for project member lookups
type ProjectMemberCache struct {
	cache      map[int]*projectMemberCacheEntry
	mu         sync.RWMutex
	memberRepo *ProjectMemberRepository
	ttl        time.Duration
}

type projectMemberCacheEntry struct {
	members   []ProjectMember
	expiresAt time.Time
}

// NewProjectMemberCache creates a new project member cache
func NewProjectMemberCache(memberRepo *ProjectMemberRepository, ttl time.Duration) *ProjectMemberCache {
	cache := &ProjectMemberCache{
		cache:      make(map[int]*projectMemberCacheEntry),
		memberRepo: memberRepo,
		ttl:        ttl,
	}

	// Start background cleanup goroutine
	go cache.cleanupExpired()

	return cache
}

// GetProjectMembers retrieves project members from cache or database
func (c *ProjectMemberCache) GetProjectMembers(projectID int) ([]ProjectMember, error) {
	c.mu.RLock()
	entry, exists := c.cache[projectID]
	c.mu.RUnlock()

	// Check if cache entry exists and is not expired
	if exists && time.Now().Before(entry.expiresAt) {
		return entry.members, nil
	}

	// Fetch from database
	members, err := c.memberRepo.GetByProjectID(projectID)
	if err != nil {
		return nil, err
	}

	// Update cache
	c.mu.Lock()
	c.cache[projectID] = &projectMemberCacheEntry{
		members:   members,
		expiresAt: time.Now().Add(c.ttl),
	}
	c.mu.Unlock()

	return members, nil
}

// IsUserMember checks if a user is a member of a project using cache
func (c *ProjectMemberCache) IsUserMember(projectID, userID int) (bool, error) {
	members, err := c.GetProjectMembers(projectID)
	if err != nil {
		return false, err
	}

	for _, member := range members {
		if member.UserID == userID {
			return true, nil
		}
	}

	return false, nil
}

// IsUserAdmin checks if a user is an admin of a project using cache
func (c *ProjectMemberCache) IsUserAdmin(projectID, userID int) (bool, error) {
	members, err := c.GetProjectMembers(projectID)
	if err != nil {
		return false, err
	}

	for _, member := range members {
		if member.UserID == userID && member.IsAdmin {
			return true, nil
		}
	}

	return false, nil
}

// InvalidateProject clears the cache for a specific project
func (c *ProjectMemberCache) InvalidateProject(projectID int) {
	c.mu.Lock()
	delete(c.cache, projectID)
	c.mu.Unlock()
}

// Clear removes all entries from the cache
func (c *ProjectMemberCache) Clear() {
	c.mu.Lock()
	c.cache = make(map[int]*projectMemberCacheEntry)
	c.mu.Unlock()
}

// cleanupExpired periodically removes expired entries
func (c *ProjectMemberCache) cleanupExpired() {
	ticker := time.NewTicker(5 * time.Minute)
	defer ticker.Stop()

	for range ticker.C {
		now := time.Now()
		c.mu.Lock()
		for projectID, entry := range c.cache {
			if now.After(entry.expiresAt) {
				delete(c.cache, projectID)
			}
		}
		c.mu.Unlock()
	}
}
