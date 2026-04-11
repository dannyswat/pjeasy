# PJEasy

PJEasy is a full-stack project management system for internal software and IT teams. It combines project planning, delivery tracking, service desk workflows, wiki/documentation, sprint execution, and review/release management in one application.

## What It Does

PJEasy is built around project workspaces. Inside each project, teams can manage:

- Ideas
- Features
- Issues
- Tasks
- Service tickets
- Sprints and sprint boards
- Releases
- Reviews
- Wiki pages and proposed wiki changes
- Comments and status history
- Custom status workflows by item type

The backend also includes workflow automation so status changes can trigger follow-up actions, such as fulfilling a linked service ticket or closing a parent item when all related work is complete.

## Main Features

### Authentication and Access

- User registration and login with JWT-based sessions
- Refresh-token based session renewal
- System admin management
- Project-level membership and permissions
- Project roles for admins, members, and limited project users

### Project Workspace

- Create and update projects
- Add and manage project members
- Archive and unarchive projects
- Project dashboard views for managers and members
- Auto-generated project item reference sequences

### Delivery Management

- Track ideas, features, issues, tasks, and service tickets
- Link work items together
- Assign owners and update statuses
- Batch status updates for several item types
- Record status change history
- Filter and paginate item lists

### Sprint, Review, and Release Flow

- Create and manage sprints
- Start and close sprints
- View sprint board and swimlane data
- Move tasks into and out of sprints
- Create sprint and custom reviews
- Publish reviews for stakeholder sharing
- Group completed work into releases and mark releases complete

### Wiki and Collaboration

- Project wiki with nested page trees
- Rich HTML content editing with centralized sanitization
- Change proposal flow for wiki edits
- Merge task-related wiki changes automatically when work is completed
- Comments on project items and wiki pages
- Image upload support for editor content

### Workflow and Governance

- Project-specific status transition rules for ideas, features, issues, tasks, service tickets, and releases
- Default workflow automations for linked work items
- Backend-enforced permissions and transition validation

## Tech Stack

| Layer | Stack |
| --- | --- |
| Frontend | React 19, TypeScript, Vite, Tailwind CSS, TanStack Query |
| Backend | Go 1.24, Echo, GORM |
| Database | PostgreSQL |
| Auth | JWT access + refresh tokens |
| Deployment | Local dev, Docker image |

## Repository Layout

```text
backend/   Go API server, domain services, persistence, workflow engine
frontend/  React application
uploads/   Uploaded images
```

## Prerequisites

- Node.js 22+
- npm
- Go 1.24+
- PostgreSQL 14+ or compatible

## Local Development

### 1. Create the database

Create a PostgreSQL database named `pjeasy` and make sure the configured user can access it.

The default backend configuration expects:

- Host: `localhost`
- Port: `5432`
- User: `postgres`
- Password: `postgres`
- Database: `pjeasy`

You can change these values in [backend/config.json](./backend/config.json).

### 2. Start the backend

```bash
cd backend
go run ./cmd/api -config config.json
```

Notes:

- The API listens on `http://localhost:8080` by default.
- Auto-migration is enabled in the default config.
- If the config file is missing, the backend falls back to built-in defaults.

### 3. Start the frontend

```bash
cd frontend
npm install
npm run dev
```

Notes:

- The Vite dev server runs on `http://localhost:3002`.
- Frontend requests to `/api` and `/uploads` are proxied to `http://localhost:8080`.

## First-Time Usage

1. Open `http://localhost:3002`.
2. Register a user account.
3. Sign in with that account.
4. Create a project.
5. Add project members from the project settings page.
6. Start working with ideas, issues, features, tasks, tickets, wiki pages, sprints, reviews, and releases.

Important behavior:

- The user who creates a project becomes that project's admin automatically.
- Passwords must be at least 8 characters and include uppercase, lowercase, numeric, and special characters.

## How To Use PJEasy

### Standard team flow

1. Create a project and add members.
2. Capture incoming requests as service tickets or ideas.
3. Convert or break work down into features, issues, and tasks.
4. Organize tasks into sprints.
5. Track progress through project dashboards, item lists, and sprint boards.
6. Document decisions and implementation details in the wiki.
7. Generate sprint or custom reviews.
8. Collect completed work into releases.

### Status workflows

Project admins can define allowed status transitions per item type from the project settings area. If no rule exists for a given item type and current status, transitions remain unrestricted.

### Wiki change workflow

Wiki pages support change proposals and pending changes. This makes it possible to review documentation updates before merging them into the main page content.

## Docker

The repository includes a multi-stage Dockerfile that:

- Builds the frontend
- Builds the backend binary
- Serves the compiled frontend from the Go server

Build the image locally:

```bash
docker build -t pjeasy:local .
```

Run it:

```bash
docker run --rm -p 8080:8080 pjeasy:local
```

### Docker Compose

For the easiest local Docker setup, use [docker-compose.yml](./docker-compose.yml):

```bash
docker compose up --build
```

This starts:

- PostgreSQL on `localhost:5432`
- PJEasy on `http://localhost:8080`

The compose stack uses [config.compose.json](./config.compose.json), which points the app container at the `postgres` service.

Notes:

- The default Docker config is [config.docker.json](./config.docker.json).
- The compose config is [config.compose.json](./config.compose.json).
- In Docker, the backend serves the built frontend from `frontend/dist`.
- The bundled Docker config expects PostgreSQL to be reachable from the container at `172.17.0.1:5432`.

For publishing the container image, use:

```bash
./deploy.sh <version>
```

## Validation Commands

Backend:

```bash
cd backend
go test ./...
```

Frontend:

```bash
cd frontend
npm run build
```

## Current Implementation Notes

- Backend HTML editor fields are sanitized before persistence.
- Status workflow rules are stored per project and enforced in backend services.
- Wiki pages support nested trees through parent-child relationships.
- Project user permissions are intentionally limited compared with project admins and regular members.

## Configuration Files

- [backend/config.json](./backend/config.json): local backend settings
- [config.compose.json](./config.compose.json): Docker Compose runtime settings
- [config.docker.json](./config.docker.json): Docker runtime settings
- [frontend/vite.config.ts](./frontend/vite.config.ts): frontend dev server and proxy settings

## License

This project is licensed under the MIT License. See [LICENSE](./LICENSE).