# Ideas Module

The Ideas module allows project members to create, manage, and track ideas for project features and enhancements.

## Backend Structure

### Model (`idea.go`)
- **Idea**: Main entity representing an idea
  - ID, ProjectID, Title, Description, Status, Tags, CreatedBy, CreatedAt, UpdatedAt
  - Status: `Open` or `Closed`

### Repository (`idea_repository.go`)
- `Create`: Create a new idea
- `GetByID`: Retrieve an idea by ID
- `Update`: Update an idea
- `Delete`: Delete an idea
- `GetByProjectID`: List all ideas for a project with pagination
- `GetByProjectIDAndStatus`: List ideas filtered by status
- `UpdateStatus`: Update only the status of an idea

### Service (`idea_service.go`)
- `CreateIdea`: Creates a new idea (requires project membership)
- `UpdateIdea`: Updates idea details (requires project membership)
- `UpdateIdeaStatus`: Updates idea status (requires project membership)
- `DeleteIdea`: Deletes an idea (requires project membership)
- `GetIdea`: Retrieves a single idea (requires project membership)
- `GetProjectIdeas`: Lists ideas with pagination and optional status filter

### API Handler (`idea_handler.go`)
RESTful API endpoints:
- `POST /api/projects/:projectId/ideas` - Create a new idea
- `GET /api/projects/:projectId/ideas` - List ideas (supports pagination and status filter)
- `GET /api/ideas/:id` - Get a specific idea
- `PUT /api/ideas/:id` - Update an idea
- `PATCH /api/ideas/:id/status` - Update idea status
- `DELETE /api/ideas/:id` - Delete an idea

## Frontend Structure

### Types (`ideaTypes.ts`)
- `IdeaResponse`: Idea data structure
- `CreateIdeaRequest`: Request for creating an idea
- `UpdateIdeaRequest`: Request for updating an idea
- `UpdateIdeaStatusRequest`: Request for updating status
- `IdeasListResponse`: Paginated list response

### Hooks
- `useListIdeas`: Fetch paginated list of ideas with optional status filter
- `useGetIdea`: Fetch a single idea
- `useCreateIdea`: Create a new idea
- `useUpdateIdea`: Update an idea
- `useUpdateIdeaStatus`: Update idea status
- `useDeleteIdea`: Delete an idea

### Page (`IdeasPage.tsx`)
Full-featured page for managing ideas:
- List view with pagination
- Filter by status (Open/Closed)
- Create new ideas via modal
- Edit existing ideas via modal
- Toggle status (Open ↔ Closed)
- Delete ideas with confirmation
- Display tags
- Responsive design

## Usage

### Accessing the Ideas Page
Navigate to `/projects/:projectId/ideas` where `:projectId` is the ID of the project.

### Prerequisites
- User must be a member of the project to view and manage ideas
- Project ID must be provided in the URL

### Features
1. **Create Idea**: Click "New Idea" button and fill in the form
2. **Edit Idea**: Click the edit icon on any idea card
3. **Change Status**: Click "Close" or "Reopen" button on an idea
4. **Delete Idea**: Click the delete icon (requires confirmation)
5. **Filter**: Use the status dropdown to filter by Open/Closed ideas
6. **Pagination**: Navigate through pages if there are more than 20 ideas

## Permissions
All idea operations require the user to be a member (or admin) of the project. The backend validates membership for all operations.
