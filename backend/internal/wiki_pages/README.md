# Wiki Pages Module

This module provides wiki functionality for project documentation with version control capabilities using the [vchtml](https://github.com/dannyswat/vchtml) library.

## Overview

The WikiPage module allows users to:
- Create and manage project documentation
- Link wiki changes to features or issues
- Automatically merge changes when features/issues are completed
- Handle merge conflicts with a resolution workflow

## Data Models

### WikiPage

The main wiki page entity:
- `id`: Primary key
- `projectId`: Reference to the project
- `slug`: URL-friendly identifier
- `title`: Page title
- `content`: Current merged content (HTML)
- `contentHash`: SHA256 hash for version control
- `version`: Current version number
- `status`: Draft, Published, or Archived
- `parentId`: For hierarchical structure
- `sortOrder`: Order within siblings

### WikiPageChange

Tracks changes linked to features or issues:
- `id`: Primary key
- `wikiPageId`: Reference to the wiki page
- `projectId`: Reference to the project
- `itemType`: "feature" or "issue"
- `itemId`: ID of the linked feature/issue
- `baseHash`: Hash of the base content
- `delta`: JSON-encoded delta (vchtml format)
- `snapshot`: Full HTML snapshot
- `snapshotHash`: Hash of the snapshot
- `changeType`: create, update, or merge
- `status`: Pending, Merged, Rejected, or Conflict

## Workflow

### Creating Documentation

1. Create a wiki page in the project
2. Edit the content directly or through features/issues

### Linking Changes to Features/Issues

1. When working on a feature or issue, use the wiki editor
2. Select a wiki page and make changes
3. Changes are stored as `WikiPageChange` records with delta and snapshot

### Merging Changes

When a feature or issue is completed:
1. Call the merge endpoint with itemType and itemId
2. All pending changes for that item are processed
3. Changes are applied using vchtml's patch function
4. If base hash matches, snapshot is used directly
5. If conflict detected, change status is set to "Conflict"

### Conflict Resolution

1. View pending changes in the WikiPageChangesPanel
2. For conflicts, use the "Resolve Conflict" action
3. Edit the content to resolve conflicts
4. The resolved content becomes a new pending change

## API Endpoints

### Wiki Pages

- `POST /api/projects/:projectId/wiki` - Create wiki page
- `GET /api/projects/:projectId/wiki` - List wiki pages
- `GET /api/projects/:projectId/wiki/tree` - Get page tree
- `GET /api/projects/:projectId/wiki/slug/:slug` - Get by slug
- `GET /api/wiki/:id` - Get wiki page
- `PUT /api/wiki/:id` - Update wiki page metadata
- `PUT /api/wiki/:id/content` - Update wiki page content
- `PUT /api/wiki/:id/status` - Update wiki page status
- `DELETE /api/wiki/:id` - Delete wiki page

### Wiki Page Changes

- `POST /api/wiki/:id/changes` - Create change linked to feature/issue
- `GET /api/wiki/:id/changes` - List changes for page
- `GET /api/wiki/:id/changes/pending` - Get pending changes
- `GET /api/wiki-changes` - Get changes by item (itemType, itemId)
- `GET /api/wiki-changes/:changeId` - Get change details
- `POST /api/wiki-changes/:changeId/resolve` - Resolve conflict
- `POST /api/wiki-changes/:changeId/reject` - Reject change
- `GET /api/wiki-changes/:changeId/preview` - Preview merge
- `POST /api/wiki-changes/merge` - Merge changes for item

## Version Control with vchtml

The module uses vchtml for:
- **Diff**: Computing delta between old and new content
- **Patch**: Applying delta to current content
- **Merge**: Handling concurrent changes

vchtml understands HTML structure, making it ideal for wiki documentation that uses HTML formatting.

## Frontend Components

- `WikiPagesPage`: List and manage wiki pages
- `WikiPageDetailPage`: View and edit a wiki page
- `WikiPageEditor`: Edit wiki content linked to feature/issue
- `WikiPageChangesPanel`: View and manage pending changes
- `CreateWikiPageForm`: Create new wiki page
- `EditWikiPageForm`: Edit wiki page metadata
