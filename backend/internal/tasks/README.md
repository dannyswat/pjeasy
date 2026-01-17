# Tasks Module

This module implements task management functionality for projects, including CRUD operations, status tracking, assignee management, and sprint association.

## API Endpoints

### Create Task
- **POST** `/api/projects/:projectId/tasks`
- **Auth**: Required (Project Member)
- **Request Body**:
  ```json
  {
    "projectId": 1,
    "title": "Implement login feature",
    "description": "Add user authentication",
    "status": "Open",
    "priority": "High",
    "estimatedHours": 8.5,
    "assigneeId": 5,
    "deadline": "2024-12-31",
    "sprintId": 2,
    "tags": "backend,security"
  }
  ```
- **Response**: TaskResponse (201 Created)

### Get Project Tasks
- **GET** `/api/projects/:projectId/tasks`
- **Auth**: Required (Project Member)
- **Query Params**:
  - `page`: Page number (default: 1)
  - `pageSize`: Items per page (default: 20, max: 100)
  - `status`: Filter by status (optional)
- **Response**: TaskListResponse (200 OK)

### Get Task
- **GET** `/api/tasks/:id`
- **Auth**: Required (Project Member)
- **Response**: TaskResponse (200 OK)

### Update Task
- **PUT** `/api/tasks/:id`
- **Auth**: Required (Project Member)
- **Request Body**:
  ```json
  {
    "title": "Updated title",
    "description": "Updated description",
    "priority": "Urgent",
    "estimatedHours": 12.0,
    "assigneeId": 3,
    "deadline": "2024-11-30",
    "sprintId": 1,
    "tags": "backend,api"
  }
  ```
- **Response**: TaskResponse (200 OK)

### Update Task Status
- **PATCH** `/api/tasks/:id/status`
- **Auth**: Required (Project Member)
- **Request Body**:
  ```json
  {
    "status": "In Progress"
  }
  ```
- **Response**: TaskResponse (200 OK)

### Update Task Assignee
- **PATCH** `/api/tasks/:id/assignee`
- **Auth**: Required (Project Member)
- **Request Body**:
  ```json
  {
    "assigneeId": 7
  }
  ```
  Or unassign:
  ```json
  {
    "assigneeId": null
  }
  ```
- **Response**: TaskResponse (200 OK)

### Delete Task
- **DELETE** `/api/tasks/:id`
- **Auth**: Required (Project Member)
- **Response**: 204 No Content

### Get My Tasks
- **GET** `/api/tasks/my`
- **Auth**: Required
- **Query Params**:
  - `page`: Page number (default: 1)
  - `pageSize`: Items per page (default: 20, max: 100)
- **Response**: TaskListResponse (200 OK)

## Task Statuses

- `Open`: Initial status when task is created
- `In Progress`: Task is being actively worked on
- `On Hold`: Task is temporarily paused
- `Blocked`: Task cannot proceed due to dependencies
- `Completed`: Task work is finished
- `Closed`: Task is finalized

## Task Priorities

- `Immediate`: Highest priority, needs immediate attention
- `Urgent`: High priority, should be handled soon
- `High`: Important but not urgent
- `Normal`: Standard priority (default)
- `Low`: Can be deferred

## Response Types

### TaskResponse
```json
{
  "id": 123,
  "refNum": "PROJ-42",
  "projectId": 1,
  "title": "Task title",
  "description": "Task description",
  "status": "In Progress",
  "priority": "High",
  "estimatedHours": 8.5,
  "assigneeId": 5,
  "deadline": "2024-12-31",
  "sprintId": 2,
  "tags": "backend,security",
  "createdBy": 3,
  "createdAt": "2024-01-15T10:30:00Z",
  "updatedAt": "2024-01-16T14:20:00Z"
}
```

### TaskListResponse
```json
{
  "tasks": [/* array of TaskResponse */],
  "total": 42,
  "page": 1,
  "size": 20
}
```

## Business Logic

### Authorization
- Users must be project members to view or modify tasks
- Only project members can be assigned to tasks
- Task creation generates a unique reference number (e.g., "PROJ-42")

### Reference Numbers
- Each task gets a unique reference number within its project
- Format: `{ProjectCode}-{SequenceNumber}`
- Generated using the sequence service with transaction support

### Validation
- Title is required (1-200 characters)
- Status must be one of the defined statuses
- Priority must be one of the defined priorities
- Estimated hours must be >= 0
- Assignee must be a project member (if specified)
- Deadline must be in valid date format (YYYY-MM-DD)

## Database Schema

```sql
CREATE TABLE tasks (
    id SERIAL PRIMARY KEY,
    ref_num VARCHAR(50) NOT NULL UNIQUE,
    project_id INTEGER NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'Open',
    priority VARCHAR(50) NOT NULL DEFAULT 'Normal',
    estimated_hours DECIMAL(10,2),
    assignee_id INTEGER,
    deadline TIMESTAMP,
    sprint_id INTEGER,
    tags TEXT,
    created_by INTEGER NOT NULL,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    
    INDEX idx_tasks_project_id (project_id),
    INDEX idx_tasks_assignee_id (assignee_id),
    INDEX idx_tasks_sprint_id (sprint_id),
    INDEX idx_tasks_created_by (created_by),
    UNIQUE INDEX idx_tasks_ref_num (ref_num)
);
```

## Future Enhancements

- **Time Tracking**: TimeLog sub-module for tracking time spent on tasks
- **Task Dependencies**: Link tasks that depend on each other
- **Task Comments**: Add comments/discussions to tasks
- **Task History**: Track all changes to task fields
- **Attachments**: Support file attachments on tasks
- **Labels/Categories**: Additional categorization beyond tags
- **Subtasks**: Break down tasks into smaller subtasks
