# PJEasy Development Guidelines

This document outlines the coding patterns, conventions, and best practices used in the PJEasy project.

---

## Project Overview

PJEasy is a project management application with:
- **Backend**: Go (Echo framework + GORM)
- **Frontend**: React 19 + TypeScript + Vite + TailwindCSS v4

---

## Backend (Go)

### 1. Project Structure and Folder Organization

```
backend/
├── cmd/
│   ├── api/          # Main entry point for API server
│   └── migrate/      # Database migration tools
└── internal/
    ├── apis/         # HTTP handlers, middleware, validators
    ├── comments/     # Comment domain (model, repo, service)
    ├── ideas/        # Ideas domain
    ├── projects/     # Projects domain
    ├── repositories/ # Shared repository infrastructure (UoW)
    ├── sequences/    # Sequence number generation
    ├── user_roles/   # System admin roles
    ├── user_sessions/# Session and token management
    └── users/        # User domain
```

**Key Principles:**
- Domain-driven structure: Each business domain has its own folder
- Each domain folder contains: `model.go`, `repository.go`, `service.go`
- The `apis` folder contains all HTTP-related code (handlers, middleware, validators)
- Use `internal/` to prevent external imports

### 2. Naming Conventions

#### Files
- **Models**: `{domain}.go` (e.g., `user.go`, `project.go`, `idea.go`)
- **Repositories**: `{domain}_repository.go` (e.g., `user_repository.go`)
- **Services**: `{domain}_service.go` (e.g., `user_service.go`)
- **Handlers**: `{domain}_handler.go` (e.g., `user_handler.go`)
- **Middleware**: `{name}_middleware.go` (e.g., `auth_middleware.go`)
- **Compound words**: Use underscores (e.g., `user_session.go`, `project_member.go`)

#### Types
- **Structs**: PascalCase (e.g., `User`, `ProjectMember`, `IdeaService`)
- **Interfaces**: PascalCase, typically noun-based (e.g., `CredentialProvider`)
- **Request structs**: `{Action}Request` (e.g., `CreateProjectRequest`, `LoginRequest`)
- **Response structs**: `{Entity}Response` (e.g., `UserResponse`, `ProjectResponse`)

#### Functions/Methods
- **Constructors**: `New{Type}` (e.g., `NewUserService()`, `NewProjectRepository()`)
- **Repository methods**: CRUD verbs (e.g., `Create`, `GetByID`, `Update`, `Delete`)
- **Service methods**: Business action verbs (e.g., `CreateProject`, `AuthenticateWithPassword`)
- **Handler methods**: HTTP action verbs (e.g., `CreateIdea`, `ListProjects`, `UpdateProject`)

#### Variables
- Use camelCase for local variables
- Use short, descriptive names (e.g., `err`, `user`, `projectID`)
- Use `ID` suffix for identifiers (not `Id`)

### 3. Error Handling Patterns

```go
// Return nil for "not found" cases (no error)
func (r *UserRepository) GetByID(userID int) (*User, error) {
    var user User
    err := r.uow.GetDB().Where("id = ?", userID).First(&user).Error
    if err != nil {
        if errors.Is(err, gorm.ErrRecordNotFound) {
            return nil, nil  // Not found = nil, nil
        }
        return nil, err      // Actual error
    }
    return &user, nil
}

// Service layer creates business errors
func (s *UserService) RegisterWithPassword(...) (*User, error) {
    existingUser, err := s.repo.GetByLoginID(loginID)
    if err != nil {
        return nil, err
    }
    if existingUser != nil {
        return nil, errors.New("user with this login ID already exists")
    }
    // ...
}

// Handler layer converts to HTTP errors
func (h *UserHandler) Register(c echo.Context) error {
    user, err := h.userService.RegisterWithPassword(...)
    if err != nil {
        return echo.NewHTTPError(http.StatusBadRequest, err.Error())
    }
    return c.JSON(http.StatusCreated, response)
}
```

**Conventions:**
- Repositories return `(nil, nil)` for "record not found"
- Repositories return `(nil, err)` for actual database errors
- Services create descriptive business error messages
- Handlers convert errors to appropriate HTTP status codes

### 4. Repository Pattern Implementation

```go
// Repository struct with database dependency
type ProjectRepository struct {
    uow *repositories.UnitOfWork
}

// Constructor
func NewProjectRepository(uow *repositories.UnitOfWork) *ProjectRepository {
    return &ProjectRepository{uow: uow}
}

// Standard CRUD methods
func (r *ProjectRepository) Create(project *Project) error {
    return r.uow.GetDB().Create(project).Error
}

func (r *ProjectRepository) GetByID(id int) (*Project, error) {
    var project Project
    err := r.uow.GetDB().First(&project, id).Error
    if err == gorm.ErrRecordNotFound {
        return nil, nil
    }
    return &project, err
}

func (r *ProjectRepository) Update(project *Project) error {
    return r.uow.GetDB().Save(project).Error
}

func (r *ProjectRepository) Delete(id int) error {
    return r.uow.GetDB().Delete(&Project{}, id).Error
}

// Paginated queries return (items, total, error)
func (r *ProjectRepository) GetAll(includeArchived bool, offset, limit int) ([]Project, int64, error) {
    // ...
}
```

**Conventions:**
- Repositories take `*UnitOfWork` in constructor
- Return pointer for single entity queries
- Return slice for multiple entity queries
- Paginated queries return `([]Entity, totalCount, error)`

### 5. Service Layer Patterns

```go
// Service struct with dependencies
type ProjectService struct {
    projectRepo  *ProjectRepository
    memberRepo   *ProjectMemberRepository
    userRepo     *users.UserRepository
    sequenceRepo *sequences.SequenceRepository
    memberCache  *ProjectMemberCache
}

// Constructor with all dependencies
func NewProjectService(
    projectRepo *ProjectRepository,
    memberRepo *ProjectMemberRepository,
    userRepo *users.UserRepository,
    sequenceRepo *sequences.SequenceRepository,
    memberCache *ProjectMemberCache,
) *ProjectService {
    return &ProjectService{
        projectRepo:  projectRepo,
        memberRepo:   memberRepo,
        userRepo:     userRepo,
        sequenceRepo: sequenceRepo,
        memberCache:  memberCache,
    }
}

// Business method with validation and authorization
func (s *ProjectService) UpdateProject(projectID int, name, description string, updatedBy int) (*Project, error) {
    // 1. Fetch entity
    project, err := s.projectRepo.GetByID(projectID)
    if err != nil {
        return nil, err
    }
    if project == nil {
        return nil, errors.New("project not found")
    }

    // 2. Authorization check
    isAdmin, err := s.memberRepo.IsUserAdmin(projectID, updatedBy)
    if err != nil {
        return nil, err
    }
    if !isAdmin {
        return nil, errors.New("only project admins can update project")
    }

    // 3. Apply changes
    project.Name = name
    project.Description = description
    project.UpdatedAt = time.Now()

    // 4. Persist
    if err := s.projectRepo.Update(project); err != nil {
        return nil, err
    }

    return project, nil
}
```

**Conventions:**
- Services contain business logic
- Services validate business rules
- Services coordinate between repositories
- Services handle authorization logic
- Method parameters use primitives, not request structs

### 6. API Handler Patterns

```go
// Handler struct with service dependency
type IdeaHandler struct {
    ideaService *ideas.IdeaService
}

func NewIdeaHandler(ideaService *ideas.IdeaService) *IdeaHandler {
    return &IdeaHandler{ideaService: ideaService}
}

// Request/Response DTOs defined in handler file
type CreateIdeaRequest struct {
    Title       string `json:"title" validate:"required"`
    Description string `json:"description"`
    Tags        string `json:"tags"`
}

type IdeaResponse struct {
    ID          int    `json:"id"`
    ProjectID   int    `json:"projectId"`
    Title       string `json:"title"`
    // ... use camelCase for JSON
}

// Handler method pattern
func (h *IdeaHandler) CreateIdea(c echo.Context) error {
    // 1. Get user from context
    userID, err := apis.GetUserIDFromContext(c)
    if err != nil {
      return err
    }

    // 2. Parse path parameters
    projectID, err := strconv.Atoi(c.Param("projectId"))
    if err != nil {
        return echo.NewHTTPError(http.StatusBadRequest, "Invalid project ID")
    }

    // 3. Bind and validate request
    req := new(CreateIdeaRequest)
    if err := c.Bind(req); err != nil {
        return echo.NewHTTPError(http.StatusBadRequest, "Invalid request payload")
    }
    if err := c.Validate(req); err != nil {
        return echo.NewHTTPError(http.StatusBadRequest, err.Error())
    }

    // 4. Call service
    idea, err := h.ideaService.CreateIdea(projectID, req.Title, req.Description, req.Tags, userID)
    if err != nil {
        return echo.NewHTTPError(http.StatusBadRequest, err.Error())
    }

    // 5. Return response with appropriate status
    response := toIdeaResponse(idea)
    return c.JSON(http.StatusCreated, response)  // 201 for POST
}

// Route registration method
func (h *IdeaHandler) RegisterRoutes(e *echo.Echo, auth *AuthMiddleware, project *ProjectMiddleware) {
    g := e.Group("/api/projects/:projectId/ideas")
    g.Use(auth.RequireAuth, project.RequireProjectMember)
    g.POST("", h.CreateIdea)
    g.GET("", h.ListIdeas)
}
```

**Conventions:**
- Request/Response structs are defined in handler files
- JSON field names use camelCase
- Use `validate:"required"` for validation
- Pattern: Auth → Parse params → Bind/Validate → Call service → Return JSON
- POST returns `201 Created`, GET returns `200 OK`
- Each handler has a `RegisterRoutes` method

### 7. Middleware Patterns

```go
// Middleware struct with dependencies
type AuthMiddleware struct {
    tokenService *user_sessions.TokenService
    adminService *userroles.SystemAdminService
}

func NewAuthMiddleware(...) *AuthMiddleware {
    return &AuthMiddleware{...}
}

// Middleware function returns echo.HandlerFunc
func (m *AuthMiddleware) RequireAuth(next echo.HandlerFunc) echo.HandlerFunc {
    return func(c echo.Context) error {
        // 1. Extract token
        authHeader := c.Request().Header.Get("Authorization")
        // ... parse Bearer token

        // 2. Validate token
        claims, err := m.tokenService.ValidateAccessToken(token)
        if err != nil {
            return echo.NewHTTPError(http.StatusUnauthorized, "Invalid or expired access token")
        }

        // 3. Set context values for downstream handlers
        c.Set("user_id", claims.UserID)
        c.Set("login_id", claims.LoginID)

        return next(c)
    }
}

// Chained authorization middleware
func (m *AuthMiddleware) RequireAdmin(next echo.HandlerFunc) echo.HandlerFunc {
    return func(c echo.Context) error {
        // Requires RequireAuth to be called first
        userID, err := GetUserIDFromContext(c)
        if err != nil {
          return err
        }
        // ... check admin status
        return next(c)
    }
}
```

**Conventions:**
- Use method receivers for stateful middleware
- Use standalone functions for stateless middleware (e.g., `LoggingMiddleware`)
- Store user info in context using `c.Set()`
- Retrieve user info using type assertion: `c.Get("user_id").(int)`

### 8. Database/ORM Usage (GORM)

#### Model Definition
```go
type Idea struct {
    ID          int       `gorm:"primaryKey;autoIncrement" json:"id"`
    ProjectID   int       `gorm:"not null;index" json:"projectId"`
    Title       string    `gorm:"not null;size:255" json:"title"`
    Description string    `gorm:"type:text" json:"description"`
    Status      string    `gorm:"not null;size:50;default:'Open'" json:"status"`
    Tags        string    `gorm:"type:text" json:"tags,omitempty"`
    CreatedBy   int       `gorm:"not null;index" json:"createdBy"`
    CreatedAt   time.Time `gorm:"not null" json:"createdAt"`
    UpdatedAt   time.Time `gorm:"not null" json:"updatedAt"`
}

// Explicit table name
func (Idea) TableName() string {
    return "ideas"
}
```

**Conventions:**
- Use GORM struct tags for database configuration
- Define `TableName()` method explicitly
- Use `index` for frequently queried columns
- Foreign key columns named `{Entity}ID` (e.g., `ProjectID`, `UserID`)

#### Unit of Work Pattern
```go
// Transactional operations
uow := s.uowFactory.NewUnitOfWork()
uow.BeginTransaction()
defer uow.RollbackTransactionIfError()

// ... operations

err = uow.CommitTransaction()
```

### 9. Dependency Injection Approach

Manual constructor injection in `api_server.go`:

```go
func (s *APIServer) SetupAPIServer() error {
    // 1. Create repositories
    projectRepo := projects.NewProjectRepository(s.gorm)
    memberRepo := projects.NewProjectMemberRepository(s.gorm)
    userRepo := users.NewUserRepository(s.globalUOW)

    // 2. Create services with dependencies
    s.projectService = projects.NewProjectService(projectRepo, memberRepo, userRepo, sequenceRepo, memberCache)

    // 3. Create handlers with services
    s.projectHandler = NewProjectHandler(s.projectService)

    // 4. Create middleware
    s.authMiddleware = NewAuthMiddleware(s.tokenService, s.adminService)

    // 5. Register routes
    s.projectHandler.RegisterRoutes(s.echo, s.authMiddleware, s.projectMiddleware)

    return nil
}
```

---

## Frontend (React/TypeScript)

### 1. Project Structure and Folder Organization

```
frontend/src/
├── apis/             # API utilities (fetch.ts)
├── admins/           # System admin feature
├── auth/             # Authentication feature
├── comments/         # Comments feature
├── components/       # Shared components
├── dashboard/        # Dashboard feature
├── ideas/            # Ideas feature
├── layout/           # Layout components
├── projects/         # Projects feature
├── users/            # User management feature
├── App.tsx           # Root component with routing
├── main.tsx          # Entry point
└── index.css         # Global styles
```

**Key Principles:**
- Feature-based folder structure
- Each feature folder contains: pages, hooks, types
- Shared utilities go in dedicated folders (`apis/`, `components/`, `layout/`)

### 2. Naming Conventions

#### Files
- **Pages**: `{Feature}Page.tsx` (e.g., `LoginPage.tsx`, `ProjectsListPage.tsx`)
- **Components**: `{Name}.tsx` PascalCase (e.g., `Comments.tsx`, `CreateIdeaForm.tsx`)
- **Hooks**: `use{Action}.ts` camelCase (e.g., `useLoginApi.ts`, `useListProjects.ts`)
- **Types**: `{domain}Types.ts` camelCase (e.g., `ideaTypes.ts`, `projectTypes.ts`)
- **Utilities**: `{name}.ts` camelCase (e.g., `fetch.ts`)

#### Types/Interfaces
- **Response types**: `{Entity}Response` (e.g., `UserResponse`, `IdeaResponse`)
- **Request types**: `{Action}{Entity}Request` (e.g., `CreateIdeaRequest`, `UpdateProjectRequest`)
- **List response types**: `{Entities}ListResponse` (e.g., `IdeasListResponse`, `ProjectsListResponse`)
- **Props types**: `{Component}Props` (e.g., `CreateIdeaFormProps`, `CommentsProps`)

#### Components/Functions
- **Components**: PascalCase (e.g., `LoginPage`, `DefaultLayout`)
- **Hooks**: camelCase starting with `use` (e.g., `useLoginApi`, `useListProjects`)
- **Event handlers**: `handle{Action}` (e.g., `handleSubmit`, `handleDelete`)

### 3. Component Patterns

#### Page Components
```tsx
export default function ProjectsListPage() {
  // 1. State hooks
  const [page, setPage] = useState(1)
  const [includeArchived, setIncludeArchived] = useState(false)

  // 2. Data hooks
  const { projects, total, isLoading } = useListProjects({ page, pageSize, includeArchived })

  // 3. Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    )
  }

  // 4. Main render
  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Content */}
    </div>
  )
}
```

#### Form Components
```tsx
interface CreateIdeaFormProps {
  onSubmit: (data: { title: string; description: string; tags: string }) => Promise<void>
  onCancel: () => void
  isPending: boolean
}

export default function CreateIdeaForm({ onSubmit, onCancel, isPending }: CreateIdeaFormProps) {
  // 1. Form state
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')

  // 2. Form submit handler
  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    await onSubmit({ title, description, tags: tags.join(',') })
  }

  // 3. Render form
  return (
    <form onSubmit={handleSubmit}>
      {/* Form fields */}
    </form>
  )
}
```

**Conventions:**
- Use `export default` for page components
- Props interface defined inline or at top of file
- Controlled form inputs with `useState`
- Event handlers defined as arrow functions

### 4. State Management Approach

- **Server state**: TanStack Query (React Query)
- **Local UI state**: React `useState`
- **Session/Auth state**: localStorage with custom hooks

```tsx
// Using React Query for server state
const { data, isLoading, isError, error, refetch } = useQuery<IdeasListResponse>({
  queryKey: ['ideas', projectId, page, pageSize, status],
  queryFn: async () => fetchApi<IdeasListResponse>(`/api/projects/${projectId}/ideas?${params}`, {...}, true),
  retry: 1,
  enabled: !!projectId,
})

// Using mutations for updates
const mutation = useMutation<IdeaResponse, Error, CreateIdeaParams>({
  mutationFn: async ({ projectId, ...request }) => fetchApi<IdeaResponse>(...),
  onSuccess: (_, variables) => {
    queryClient.invalidateQueries({ queryKey: ['ideas', variables.projectId] })
  },
})
```

### 5. API Integration Patterns

#### Fetch Utilities (`apis/fetch.ts`)
```typescript
// Base fetch with auth and token refresh
export async function fetchApi<Type>(
  url: string,
  options?: RequestInit,
  secure?: boolean
): Promise<Type>

// Convenience wrappers
export async function getApi<Type>(url: string): Promise<Type>
export async function postApi<Type>(url: string, data?: unknown): Promise<Type>
export async function putApi<Type>(url: string, data?: unknown): Promise<Type>
export async function deleteApi<Type>(url: string): Promise<Type>
export async function patchApi<Type>(url: string, data?: unknown): Promise<Type>

// Authenticated versions
export async function getSecureApi<Type>(url: string): Promise<Type>
export async function postSecureApi<Type>(url: string, data?: unknown): Promise<Type>
// ... etc
```

#### Query Hook Pattern
```typescript
export function useListIdeas({ projectId, page = 1, pageSize = 20, status }: UseListIdeasParams) {
  const { data, isLoading, isError, error, refetch } = useQuery<IdeasListResponse>({
    queryKey: ['ideas', projectId, page, pageSize, status],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
      })
      return fetchApi<IdeasListResponse>(`/api/projects/${projectId}/ideas?${params}`, { method: 'GET' }, true)
    },
    retry: 1,
    enabled: !!projectId,
  })

  return {
    ideas: data?.ideas ?? [],
    total: data?.total ?? 0,
    page: data?.page ?? page,
    pageSize: data?.pageSize ?? pageSize,
    isLoading,
    isError,
    error: error as Error | null,
    refetch,
  }
}
```

#### Mutation Hook Pattern
```typescript
export function useCreateIdea() {
  const queryClient = useQueryClient()

  return useMutation<IdeaResponse, Error, CreateIdeaParams>({
    mutationFn: async ({ projectId, ...request }: CreateIdeaParams) => {
      return fetchApi<IdeaResponse>(`/api/projects/${projectId}/ideas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      }, true)
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['ideas', variables.projectId] })
    },
  })
}
```

### 6. TypeScript Usage

#### Type Definitions
```typescript
// Response types (match backend exactly)
export interface IdeaResponse {
  id: number
  projectId: number
  title: string
  description: string
  status: string
  tags?: string
  createdBy: number
  createdAt: string
  updatedAt: string
}

// Request types
export interface CreateIdeaRequest {
  title: string
  description: string
  tags?: string
}

// List response wrapper
export interface IdeasListResponse {
  ideas: IdeaResponse[]
  total: number
  page: number
  pageSize: number
}

// Constants with type
export const IdeaStatus = {
  OPEN: 'Open',
  CLOSED: 'Closed',
} as const

export type IdeaStatusType = typeof IdeaStatus[keyof typeof IdeaStatus]
```

**Conventions:**
- Use `interface` for object shapes
- Use `type` for unions and complex types
- Mark optional fields with `?`
- Use `as const` for constant objects

### 7. Styling Approach

- **Framework**: TailwindCSS v4
- **Inline utility classes** for all styling
- **Color scheme**: Green primary (`green-600`, `green-700`)

```tsx
// Common patterns
<button className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition">
  Submit
</button>

<input className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition" />

<div className="min-h-screen bg-gray-50">
  <div className="max-w-7xl mx-auto p-6">
    {/* Content */}
  </div>
</div>
```

### 8. Form Handling Patterns

```tsx
// Form state with useState
const [loginId, setLoginId] = useState('')
const [password, setPassword] = useState('')

// Submit handler
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault()
  try {
    await login(loginId, password)
    navigate('/dashboard')
  } catch {
    // Error handled by mutation
  }
}

// Controlled inputs
<input
  type="text"
  value={loginId}
  onChange={(e) => setLoginId(e.target.value)}
  required
  disabled={isPending}
/>

// Submit button with loading state
<button
  type="submit"
  disabled={isPending}
  className="... disabled:bg-gray-400 disabled:cursor-not-allowed"
>
  {isPending ? 'Signing in...' : 'Sign In'}
</button>
```

### 9. Route Protection

```tsx
// Protected route component
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading, isError } = useMeApi()
  const { clearSession } = useUserSession()

  useEffect(() => {
    if (isError) {
      clearSession()
    }
  }, [isError, clearSession])

  if (isLoading) {
    return <LoadingSpinner />
  }

  if (isError || !user) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}

// Usage in routes
<Route
  path="/dashboard"
  element={
    <ProtectedRoute>
      <DefaultLayout>
        <DashboardPage />
      </DefaultLayout>
    </ProtectedRoute>
  }
/>
```

---

## API Design Conventions

### URL Structure
- Base path: `/api`
- Resource-based: `/api/projects`, `/api/users`
- Nested resources: `/api/projects/:projectId/ideas`
- Actions: POST/PUT/PATCH/DELETE on resource endpoints

### Request/Response Format
- Content-Type: `application/json`
- Field names: camelCase
- Date format: ISO 8601 (`2006-01-02T15:04:05Z07:00`)
- IDs: integers (not UUIDs in responses)

### HTTP Status Codes
- `200 OK`: GET, PUT, PATCH success
- `201 Created`: POST success
- `400 Bad Request`: Validation/business logic errors
- `401 Unauthorized`: Missing/invalid token
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Resource not found
- `500 Internal Server Error`: Server errors

### Pagination
```json
{
  "ideas": [...],
  "total": 100,
  "page": 1,
  "pageSize": 20
}
```

Query parameters: `?page=1&pageSize=20`

---

## Authentication Flow

1. **Login**: POST `/api/auth/login` → Returns `accessToken`, `refreshToken`, `sessionId`
2. **Authenticated requests**: `Authorization: Bearer {accessToken}`
3. **Token refresh**: POST `/api/auth/refresh-token` when access token expires
4. **Logout**: POST `/api/auth/revoke-session`

Tokens stored in localStorage:
- `access_token`
- `refresh_token`
- `session_id`
- `user` (JSON)

---

## Common Patterns Summary

| Pattern | Backend | Frontend |
|---------|---------|----------|
| Structure | Domain-driven folders | Feature-based folders |
| State mgmt | Struct fields | React Query + useState |
| Auth | Middleware + context | Protected routes + hooks |
| Validation | Validator tags | HTML5 + custom |
| Error handling | Typed errors → HTTP | Try/catch + mutation state |
| API calls | Handler → Service → Repo | Hook → fetchApi |
