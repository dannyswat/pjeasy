# PJEasy - Project Management System Specification

**Version:** 1.0  
**Date:** January 9, 2026  
**Project Type:** IT Team Project Management Platform

---

## 1. Executive Summary

PJEasy is a comprehensive project management system designed to help IT teams manage projects efficiently by combining project planning, task management, design documentation, and service desk functionality into a single, easy-to-use platform. The system aims to replace the fragmented workflow of using separate tools like Jira, Confluence, and Service Desk.

### 1.1 Core Objectives
- Support IT teams in managing projects with integrated workflow
- Enable team members to schedule and log daily tasks
- Streamline IT support to users and stakeholders
- Reduce response time and tool fragmentation

### 1.2 Target Users
- IT teams with 20+ members
- Corporations with 100+ total team members
- Support for multiple concurrent projects (100+)
- High task volume (2000+ tasks per project per month)

---

## 2. System Architecture

### 2.1 Technology Stack

**Backend:**
- Language: Golang
- Framework: Echo
- Database: PostgreSQL
- Architecture: RESTful API

**Frontend:**
- Framework: React
- Deployment: Web application (online-only)

**Performance Requirements:**
- Response time: < 100ms
- Scalability: Support for large corporations
- Concurrent users: Designed for high scalability

### 2.2 Deployment Options
- Self-hosted
- Cloud-hosted
- Infrastructure agnostic (AWS, Azure, Google Cloud compatible)

### 2.3 Security & Compliance

**MVP Phase:**
- Username/password authentication
- SSO (Single Sign-On) support
- Standard encryption for data at rest and in transit
- Audit logs for all system changes

**Post-MVP:**
- GDPR compliance
- SOC 2 compliance

---

## 3. User Roles & Permissions

### 3.1 Role Definitions

| Role | Permissions |
|------|------------|
| **System Admin** | - Create and manage projects<br>- Grant project roles to users<br>- Full system access |
| **Project Manager** | - Grant roles to users for owned projects<br>- Manage project information, milestones, reviews<br>- Start/end sprints<br>- Manage all project items (Ideas, Features, Issues, Designs, ServiceTickets)<br>- Create and assign tasks<br>- Export project reviews |
| **Project Member** | - Manage all project items<br>- Create and assign tasks<br>- Update task status<br>- Log time on tasks<br>- View project information |
| **User** | - View project information, milestones, and reviews<br>- Create and view service tickets<br>- Ticket visibility controlled by project settings (all or own tickets only) |

### 3.2 Multi-Project Access
- Users can belong to multiple projects simultaneously
- Roles are project-specific
- External stakeholders included as "User" role

---

## 4. Data Model

### 4.1 Core Entities

#### 4.1.1 User
- User ID
- Name
- Email
- Authentication credentials
- Role assignments (per project)
- Notification preferences
- Created/Updated timestamps

#### 4.1.2 Project
- Project ID
- Name
- Description
- Status: `In Plan`, `Active`, `Completed`, `On Hold`, `Closed`
- Created by (System Admin)
- Managers (multiple)
- Members (multiple)
- Service ticket visibility setting (all/own)
- Created/Updated timestamps
- Archived flag

#### 4.1.3 Idea
- Idea ID
- Project ID
- Related ServiceTicket ID (optional)
- Title
- Description
- Status: `Open`, `Closed`
- Created by
- Created/Updated timestamps
- Tags (optional)
- Comments

#### 4.1.4 Design
- Design ID
- Project ID
- Title
- Description (HTML format for design pages)
- Status: `Draft`, `Confirmed`, `Published`
- Version
- Related Features (for merge tracking)
- Created by
- Created/Updated timestamps
- Attachments

#### 4.1.5 Feature
- Feature ID
- Project ID
- Related Idea ID (optional)
- Related Design ID (optional)
- Related ServiceTicket ID (optional)
- Title
- Description
- Status: `Open`, `Assigned`, `In Progress`, `In Review`, `Completed`, `Closed`
- Assigned to
- Sprint ID (optional)
- Tags
- Created by
- Created/Updated timestamps
- Comments
- Attachments

#### 4.1.6 Issue
- Issue ID
- Project ID
- Related ServiceTicket ID (optional)
- Title
- Description
- Status: `Open`, `Assigned`, `In Progress`, `In Review`, `Completed`, `Closed`
- Priority: `Immediate`, `Urgent`, `High`, `Normal`, `Low`
- Assigned to
- Sprint ID (optional)
- Tags
- Points
- Created by
- Created/Updated timestamps
- Comments
- Attachments

#### 4.1.7 ServiceTicket
- Ticket ID
- Project ID
- Title
- Description
- Status: `Open`, `Fulfilled`, `Closed`
- Priority: `Immediate`, `Urgent`, `High`, `Normal`, `Low`
- Created by
- Converted to: `Idea`, `Feature`, or `Issue` (optional reference)
- Created/Updated timestamps
- Comments
- Attachments

#### 4.1.8 Sprint
- Sprint ID
- Project ID
- Name
- Start date
- End date (optional)
- Related Milestone ID (optional)
- Status: `Planning`, `Active`, `Closed`
- Goal/Description
- Created/Updated timestamps

**Constraints:**
- Only one active sprint per project at a time

#### 4.1.9 Milestone
- Milestone ID
- Project ID
- Name
- Description
- Target date
- Status: `Planned`, `In Progress`, `Completed`
- Created/Updated timestamps

#### 4.1.10 Task
- Task ID
- Project ID
- Sprint ID (optional)
- Related to: Feature, Issue, Design, or Idea (optional reference)
- Title
- Description
- Status: `Open`, `In Progress`, `On Hold`, `Blocked`, `Completed`, `Closed`
- Priority: `Immediate`, `Urgent`, `High`, `Normal`, `Low`
- Points (for sprint metrics)
- Assigned to (single user)
- Created by
- Estimated hours
- Time logs (multiple entries)
- Deadline
- Tags
- Created/Updated timestamps
- Comments

#### 4.1.11 ProjectReview
- Review ID
- Project ID
- Review type: `Sprint End`, `Custom`
- Review date
- Included Sprint IDs (multiple for custom reviews)
- Summary
- Completed items (Features, Issues)
- In-progress items
- Delayed items
- Items for prioritization (Ideas, Features, Issues)
- Metrics (task points, completion rate)
- Created by
- Export status (PDF generation)
- Created/Updated timestamps

#### 4.1.12 TimeLog
- TimeLog ID
- Task ID
- User ID
- Hours logged
- Log date
- Description/Notes
- Created/Updated timestamps

#### 4.1.13 Comment
- Comment ID
- Entity type (Idea, Feature, Issue, Task, ServiceTicket, etc.)
- Entity ID
- User ID
- Comment text
- Created/Updated timestamps

#### 4.1.14 Attachment
- Attachment ID
- Entity type
- Entity ID
- File name
- File path/URL
- File type
- File size
- Uploaded by
- Created timestamp

---

## 5. Core Features & Workflows

### 5.1 Project Management

#### 5.1.1 Project Creation & Setup
- System Admin creates new projects
- Admin assigns Project Managers
- Project Managers add Members and Users
- Configure project settings (ticket visibility, etc.)

#### 5.1.2 Project Lifecycle
```
In Plan → Active → (On Hold) → Completed → Closed
```
- Status transitions controlled by Project Managers
- Projects can be put on hold and reactivated

### 5.2 Idea Management

**Workflow:**
1. Any manager or member creates an Idea
2. Ideas are discussed (comments)
3. Managers/Members can convert Ideas to Features
4. Ideas status: Open → Closed

### 5.3 Design Management

**Purpose:** Central repository for application design documentation in HTML format

**Workflow:**
1. Managers/Members create Design documents
2. Status progression: Draft → Confirmed → Published
3. Features reference Designs they modify
4. Upon feature completion, changes are merged into Design
5. Version tracking for Design evolution

### 5.4 Feature Management

**Workflow:**
1. Feature created (standalone or from Idea)
2. Feature can reference Design it will modify
3. Tasks created for feature implementation
4. Status progression: Open → Assigned → In Progress → In Review → Completed → Closed
5. Upon completion, feature changes merged to Design
6. Features can span multiple sprints
7. If from ServiceTicket, ticket status updated upon feature closure

**Task Templates:**
- "Design Feature [ID]"
- "Implement Feature [ID]"
- "Review Feature [ID]"

### 5.5 Issue Management

**Workflow:**
1. Issue created (standalone or from ServiceTicket)
2. Issue assigned to team member
3. Tasks created for issue resolution
4. Status progression: Open → Assigned → In Progress → In Review → Completed → Closed
5. If from ServiceTicket, ticket status updated upon issue closure

**Task Templates:**
- "Fix Issue [ID]"
- "Validate Issue [ID]"

### 5.6 Service Ticket Management

**Workflow:**
1. Users create ServiceTickets
2. Managers/Members review tickets
3. Tickets can be converted to:
   - Idea (for new feature requests)
   - Feature (direct implementation)
   - Issue (bug fixes)
4. Original ticket status updated when converted item is resolved
5. Status: Open → Fulfilled → Closed

**Visibility:**
- Project setting controls if users see all tickets or only own tickets

### 5.7 Task Management

#### 5.7.1 Task Creation
- Manual task creation by Managers/Members
- Predefined task templates based on project items
- One-to-one assignment (single assignee per task)

#### 5.7.2 Task Properties
- Status: Open, In Progress, On Hold, Blocked, Completed, Closed
- Priority: Immediate, Urgent, High, Normal, Low
- Estimated hours and time tracking
- Deadline
- Sprint association (optional)
- Tags for categorization

#### 5.7.3 Task Workflow
1. Task created and assigned
2. Assignee updates status
3. Assignee logs time spent
4. Task linked to sprint (if applicable)
5. Task completed and closed

#### 5.7.4 Time Tracking
- Team members log hours on tasks
- Multiple time log entries per task
- Date and description for each log entry
- Calendar view for task scheduling

#### 5.7.5 Recurring Tasks
- Support for recurring task patterns
- Configurable frequency

### 5.8 Sprint Management

**Constraints:**
- Only one active sprint per project at a time
- Manual sprint management

**Workflow:**
1. Project Manager creates sprint
2. Optional end date set
3. Optional milestone association
4. Sprint started
5. Tasks and Features added to sprint
6. Sprint progress tracked
7. Sprint completed
8. Sprint review generated

**Metrics:**
- Task points (sum of all tasks/features in sprint)
- Completion rate (completed vs total)

### 5.9 Milestone Management

**Purpose:** Long-term project targets

**Characteristics:**
- Longer time windows than sprints
- Multiple sprints can contribute to one milestone
- Tracked separately from sprints

### 5.10 Project Review

**Triggers:**
- End of sprint (automatic option)
- Custom review (manual, covering multiple sprints)

**Content:**
- Completed Issues and Features
- In-progress items
- Delayed items (with alerts)
- Items for prioritization (Ideas, Features, Issues)
- Performance metrics (task points, completion rate)

**Output:**
- PDF export for stakeholder presentations
- Generated by Project Managers
- System-assisted review creation

---

## 6. User Interface Requirements

### 6.1 Dashboard Views

#### 6.1.1 System Admin Dashboard
- All projects overview
- User management
- System metrics

#### 6.1.2 Project Manager Dashboard
- Owned projects
- Active sprints status
- Pending reviews
- Team capacity overview

#### 6.1.3 Member Dashboard
- Assigned tasks (prioritized)
- Current sprint view
- Recent project activity
- Time logging quick access

#### 6.1.4 User Dashboard
- Accessible projects
- Service tickets (created by user)
- Project milestones and status

### 6.2 Project Views

#### 6.2.1 Project Overview
- Project information and status
- Current sprint
- Recent activity
- Milestones
- Quick stats

#### 6.2.2 Ideas Board
- List/Grid view of Ideas
- Filter by status, tags
- Create new Idea
- Convert to Feature action

#### 6.2.3 Design Repository
- List of Designs
- Filter by status
- Version history
- Related Features

#### 6.2.4 Features Board
- Kanban/List view
- Filter by status, assignee, sprint, tags
- Create new Feature
- Link to Ideas/Designs

#### 6.2.5 Issues Board
- Kanban/List view
- Filter by status, priority, assignee, tags
- Create new Issue
- Link to ServiceTickets

#### 6.2.6 Service Desk
- Ticket list
- Filter by status, priority, date
- Create new ticket
- Conversion actions

#### 6.2.7 Sprint View
- Active sprint board
- Task/Feature swimlanes
- Burndown visualization
- Sprint metrics

#### 6.2.8 Task List
- Personal task view
- Calendar view
- Filter by status, priority, deadline, tags
- Time logging interface

#### 6.2.9 Timeline/Milestones
- Gantt-like view
- Milestone markers
- Sprint periods
- Feature/Issue progress

### 6.3 Calendar View
- Task scheduling
- Sprint periods
- Milestone dates
- Personal schedule

### 6.4 Search & Filtering

**Search Capabilities:**
- Full-text search within project
- Search across: Ideas, Features, Issues, Tasks, ServiceTickets, Designs
- Search filters:
  - Status
  - Assignee
  - Date ranges
  - Deadline
  - Priority
  - Tags

**Filter Presets:**
- Save commonly used filter combinations
- Quick access to saved presets
- Personal and shared presets

### 6.5 Comments & Collaboration

**Features:**
- Comment threads on all project items
- Chronological comment display
- User identification
- Timestamp

**Post-MVP:**
- @mentions for user notifications
- Real-time collaboration indicators

### 6.6 Attachments

**Features:**
- File upload on all project items
- Image preview
- File type restrictions (configurable)
- File size limits
- Download capability

### 6.7 Notifications

**Configurable Notifications:**
- Task assignment
- Task status changes
- Comment mentions (post-MVP)
- Sprint start/end
- Deadline reminders

**Subscription Model:**
- Managers and Members can subscribe to specific items
- Notification preferences per user

---

## 7. API Requirements

### 7.1 API Architecture
- RESTful API design
- JSON data format
- JWT authentication
- API versioning (e.g., /api/v1/)

### 7.2 Core API Endpoints

#### Authentication
- POST /api/v1/auth/login
- POST /api/v1/auth/logout
- POST /api/v1/auth/refresh
- POST /api/v1/auth/sso (SSO integration)

#### Users
- GET /api/v1/users
- GET /api/v1/users/:id
- POST /api/v1/users
- PUT /api/v1/users/:id
- DELETE /api/v1/users/:id

#### Projects
- GET /api/v1/projects
- GET /api/v1/projects/:id
- POST /api/v1/projects
- PUT /api/v1/projects/:id
- DELETE /api/v1/projects/:id
- GET /api/v1/projects/:id/members
- POST /api/v1/projects/:id/members
- DELETE /api/v1/projects/:id/members/:userId

#### Ideas
- GET /api/v1/projects/:projectId/ideas
- GET /api/v1/projects/:projectId/ideas/:id
- POST /api/v1/projects/:projectId/ideas
- PUT /api/v1/projects/:projectId/ideas/:id
- DELETE /api/v1/projects/:projectId/ideas/:id
- POST /api/v1/projects/:projectId/ideas/:id/convert-to-feature

#### Designs
- GET /api/v1/projects/:projectId/designs
- GET /api/v1/projects/:projectId/designs/:id
- POST /api/v1/projects/:projectId/designs
- PUT /api/v1/projects/:projectId/designs/:id
- DELETE /api/v1/projects/:projectId/designs/:id
- GET /api/v1/projects/:projectId/designs/:id/versions

#### Features
- GET /api/v1/projects/:projectId/features
- GET /api/v1/projects/:projectId/features/:id
- POST /api/v1/projects/:projectId/features
- PUT /api/v1/projects/:projectId/features/:id
- DELETE /api/v1/projects/:projectId/features/:id
- POST /api/v1/projects/:projectId/features/:id/merge-to-design

#### Issues
- GET /api/v1/projects/:projectId/issues
- GET /api/v1/projects/:projectId/issues/:id
- POST /api/v1/projects/:projectId/issues
- PUT /api/v1/projects/:projectId/issues/:id
- DELETE /api/v1/projects/:projectId/issues/:id

#### ServiceTickets
- GET /api/v1/projects/:projectId/tickets
- GET /api/v1/projects/:projectId/tickets/:id
- POST /api/v1/projects/:projectId/tickets
- PUT /api/v1/projects/:projectId/tickets/:id
- DELETE /api/v1/projects/:projectId/tickets/:id
- POST /api/v1/projects/:projectId/tickets/:id/convert

#### Tasks
- GET /api/v1/projects/:projectId/tasks
- GET /api/v1/projects/:projectId/tasks/:id
- POST /api/v1/projects/:projectId/tasks
- PUT /api/v1/projects/:projectId/tasks/:id
- DELETE /api/v1/projects/:projectId/tasks/:id
- GET /api/v1/users/:userId/tasks
- POST /api/v1/tasks/:id/time-logs
- GET /api/v1/tasks/:id/time-logs

#### Sprints
- GET /api/v1/projects/:projectId/sprints
- GET /api/v1/projects/:projectId/sprints/:id
- POST /api/v1/projects/:projectId/sprints
- PUT /api/v1/projects/:projectId/sprints/:id
- POST /api/v1/projects/:projectId/sprints/:id/start
- POST /api/v1/projects/:projectId/sprints/:id/complete

#### Milestones
- GET /api/v1/projects/:projectId/milestones
- GET /api/v1/projects/:projectId/milestones/:id
- POST /api/v1/projects/:projectId/milestones
- PUT /api/v1/projects/:projectId/milestones/:id
- DELETE /api/v1/projects/:projectId/milestones/:id

#### Project Reviews
- GET /api/v1/projects/:projectId/reviews
- GET /api/v1/projects/:projectId/reviews/:id
- POST /api/v1/projects/:projectId/reviews
- POST /api/v1/projects/:projectId/reviews/:id/export-pdf

#### Comments
- GET /api/v1/:entityType/:entityId/comments
- POST /api/v1/:entityType/:entityId/comments
- PUT /api/v1/comments/:id
- DELETE /api/v1/comments/:id

#### Attachments
- GET /api/v1/:entityType/:entityId/attachments
- POST /api/v1/:entityType/:entityId/attachments
- DELETE /api/v1/attachments/:id
- GET /api/v1/attachments/:id/download

#### Search
- GET /api/v1/projects/:projectId/search?q=:query&filters=:filters
- POST /api/v1/projects/:projectId/search/presets
- GET /api/v1/projects/:projectId/search/presets

### 7.3 API Documentation
- API documentation required
- OpenAPI/Swagger specification recommended
- Interactive API explorer

---

## 8. Non-Functional Requirements

### 8.1 Performance
- Response time: < 100ms for standard operations
- Pagination for large datasets (default: 50 items per page)
- Efficient database indexing
- Query optimization for large projects

### 8.2 Scalability
- Support 100+ concurrent projects
- 2000+ tasks per project per month
- 100+ team members in corporation
- Horizontal scaling capability

### 8.3 Availability
- Target: 99.5% uptime
- Graceful error handling
- User-friendly error messages

### 8.4 Security
- HTTPS for all communications
- Password hashing (bcrypt or similar)
- SQL injection prevention
- XSS protection
- CSRF protection
- Rate limiting on API endpoints
- Input validation and sanitization
- Audit logging for all data changes

### 8.5 Data Backup
- Regular database backups
- Point-in-time recovery capability
- Backup retention policy

### 8.6 Browser Support
- Modern browsers (Chrome, Firefox, Safari, Edge)
- Last 2 major versions
- Responsive design for different screen sizes

---

## 9. Development Phases

### 9.1 MVP Scope (Phase 1 - 6 months)

**Priority: High**
- User authentication (username/password, SSO)
- User role management (System Admin, Project Manager, Member, User)
- Project CRUD operations
- Project status management
- Ideas management
- Designs management (HTML format)
- Features management
- Issues management
- ServiceTickets management
- Task management (CRUD, assignment, status)
- Time logging on tasks
- Sprint management (single sprint per project)
- Milestone management
- Project review creation and PDF export
- Comments on all project items
- File attachments with image preview
- Search with filters (status, assignee, date, priority, tags)
- Filter presets (save/load)
- Calendar view for tasks
- Recurring tasks
- Basic dashboard for each role
- Audit logs
- API with core endpoints
- API documentation

**Excluded from MVP:**
- Reporting and analytics
- Advanced notifications (configurable but basic implementation)
- Real-time collaboration
- @mentions
- External tool integrations
- Custom fields/workflows
- GDPR/SOC2 compliance features

### 9.2 Phase 2 (Post-MVP)

**Priority: Medium**
- Advanced notification system with granular controls
- Subscription-based notifications
- @mentions functionality
- Real-time collaboration features
- GDPR compliance features
- SOC 2 compliance features
- External integrations (Git, Slack, email)
- Calendar integration
- Enhanced reporting and analytics
- Custom dashboards

### 9.3 Phase 3 (Future Enhancements)

**Priority: Low**
- Import/export from other tools
- Mobile responsive optimization
- Advanced analytics and insights
- AI-powered task suggestions
- Capacity planning features

---

## 10. Testing Requirements

### 10.1 Unit Testing
- Backend: Go testing framework
- Frontend: Jest/React Testing Library
- Target coverage: >80%

### 10.2 Integration Testing
- API endpoint testing
- Database integration testing
- Authentication flow testing

### 10.3 End-to-End Testing
- Critical user workflows
- Cross-browser testing
- Performance testing

### 10.4 Security Testing
- Penetration testing
- Vulnerability scanning
- Authentication/authorization testing

---

## 11. Documentation Requirements

### 11.1 Technical Documentation
- API documentation (OpenAPI/Swagger)
- Database schema documentation
- Architecture documentation
- Deployment guide

### 11.2 User Documentation
- In-app instructions and tooltips
- Context-sensitive help
- FAQ section
- Video tutorials (optional)

### 11.3 Admin Documentation
- Installation guide
- Configuration guide
- Backup/restore procedures
- Troubleshooting guide

---

## 12. Success Criteria

### 12.1 Quantitative Metrics
- User adoption rate: Track active users vs registered users
- Task completion rate: Measure productivity
- System response time: <100ms maintained
- System availability: >99.5% uptime
- User growth: Number of projects and teams onboarded

### 12.2 Qualitative Metrics
- User satisfaction surveys
- Feedback on ease of use
- Reduction in tools needed (replacing Jira + Confluence + Service Desk)
- Team collaboration improvement

### 12.3 6-Month Success Indicators
- Active usage by target IT teams
- Positive user feedback
- Successful replacement of legacy tools
- Meeting performance benchmarks

---

## 13. Risks & Mitigation

### 13.1 Technical Risks
| Risk | Mitigation |
|------|-----------|
| Performance degradation with scale | Implement caching, query optimization, load testing |
| Data loss | Regular backups, transaction logging, audit trail |
| Security vulnerabilities | Security audits, penetration testing, code reviews |

### 13.2 Business Risks
| Risk | Mitigation |
|------|-----------|
| Low user adoption | User feedback loops, iterative improvements, training |
| Feature creep | Strict MVP scope, phased development approach |
| Timeline overrun | Agile methodology, regular progress reviews |

### 13.3 Operational Risks
| Risk | Mitigation |
|------|-----------|
| Insufficient resources | Clear resource planning, prioritization |
| Integration complexity | Start simple, add integrations in phases |
| Maintenance burden | Comprehensive documentation, automated testing |

---

## 14. Appendix

### 14.1 Glossary

- **Project Item**: Generic term for Ideas, Designs, Features, Issues, ServiceTickets
- **Sprint**: Time-boxed period for focused work (only one active per project)
- **Milestone**: Long-term project target
- **Task Point**: Unit of measurement for task estimation and sprint capacity
- **Time Log**: Record of hours worked on a task
- **Service Ticket**: User-submitted support request

### 14.2 Future Considerations

- Mobile app development
- Offline mode support
- AI-powered insights and recommendations
- Advanced resource management
- Time tracking analytics
- Capacity planning tools
- Integration marketplace

---

**Document Status:** Final Draft  
**Next Review Date:** As needed based on development progress  
**Document Owner:** Product Team