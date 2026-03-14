# AI Study for PJEasy

## Objective

Make it easy for an AI agent to:

- read project items consistently
- understand relationships between items
- propose safe actions
- execute approved changes with predictable results
- leave a clear audit trail

## What Already Helps

The current backend already has several good foundations for agent support:

- most item types have a consistent domain structure: model, repository, service, handler
- project items already carry `projectId`, `refNum`, timestamps, status, and creator fields
- linked-item relationships already exist through `itemType` and `itemId`
- status history already exists through `status_changes`
- review snapshots already exist through `reviews` and `review_items`
- workflow hooks already exist for some events

This means the system is already close to being agent-readable. The main gaps are around normalization, unified access, and safe write contracts.

## Main Friction Today

### 1. Inconsistent vocabularies

An AI agent will struggle if the same concept appears in multiple forms.

Examples visible in the codebase:

- status values differ by domain, such as `InProgress` versus `In Progress`
- service ticket item types appear in multiple forms, such as `service-ticket`, `service-tickets`, `service_ticket`, and `service_tickets`
- review categories use snake_case while item statuses use mixed spacing/casing styles

For humans this is manageable. For agents, it creates ambiguity and brittle prompts.

### 2. No unified project-item read model

The backend exposes item-specific handlers, which is fine for product code, but an AI agent works better with one canonical item envelope across ideas, features, issues, tasks, tickets, sprints, and reviews.

### 3. No dedicated agent context endpoint

An agent usually needs more than one record at a time. It needs project summary, members, active sprint, recent status changes, linked items, and recent comments in one place.

### 4. Write operations are not packaged as explicit agent actions

Agents are safer when they call constrained operations such as:

- assign item
- update status
- create task from item
- link ticket to feature
- summarize sprint health

These actions should have explicit preconditions, validation rules, and predictable response shapes.

## Recommendations

### 1. Define one canonical ontology for all project items

Create a single document and shared constants for:

- canonical `itemType` values
- canonical `status` values per item type
- canonical `priority` values
- canonical relation names such as `derived_from`, `blocks`, `implements`, `fulfills`, `reviews`

Suggested canonical item types:

- `idea`
- `feature`
- `issue`
- `task`
- `service_ticket`
- `sprint`
- `review`
- `wiki_page`

Then normalize inputs at the API edge. Internally, the system can still accept legacy aliases, but it should always return one canonical form.

This is the single highest-value change for agent reliability.

### 2. Add a unified project-item envelope

Expose a normalized read model for every item type, for example:

```json
{
  "itemType": "feature",
  "itemId": 123,
  "refNum": "FE000123",
  "projectId": 10,
  "title": "Add bulk import",
  "description": "...",
  "status": "in_progress",
  "priority": "high",
  "assigneeId": 45,
  "sprintId": 18,
  "createdBy": 7,
  "createdAt": "2026-03-14T10:00:00Z",
  "updatedAt": "2026-03-14T13:15:00Z",
  "tags": ["import", "admin"],
  "relations": [
    { "type": "derived_from", "itemType": "idea", "itemId": 88 },
    { "type": "fulfills", "itemType": "service_ticket", "itemId": 52 }
  ],
  "allowedActions": ["assign", "change_status", "create_task"],
  "version": 17
}
```

Important details:

- `tags` should come back as an array, not comma-separated text
- `allowedActions` should be computed from permissions and state
- `version` should support optimistic concurrency for safe writes

### 3. Add an agent context endpoint per project

Add a dedicated endpoint such as:

`GET /api/projects/:projectId/agent/context`

This should return a compact, agent-friendly bundle containing:

- project metadata
- project members and roles
- active sprint and upcoming deadlines
- recently updated items
- recent status changes
- items needing attention
- open service tickets
- in-progress features and issues
- blocked tasks
- recent review summaries

This avoids forcing the agent to crawl many endpoints before it can reason.

### 4. Add an agent queue endpoint

Add a prioritized worklist such as:

`GET /api/projects/:projectId/agent/queue`

Return machine-friendly buckets like:

- `overdue_items`
- `blocked_tasks`
- `unassigned_high_priority_work`
- `tickets_without_follow_up`
- `items_waiting_for_review`
- `stale_items`

This helps an agent answer practical questions such as "what should I work on next" without inventing its own heuristics from raw data.

### 5. Turn writes into constrained agent actions

Instead of exposing only generic CRUD, create explicit actions for common operational work:

- `POST /api/agent/actions/assign-item`
- `POST /api/agent/actions/change-status`
- `POST /api/agent/actions/create-task-from-item`
- `POST /api/agent/actions/link-items`
- `POST /api/agent/actions/generate-review-draft`

Each action should include:

- canonical request schema
- validation errors that are easy to interpret
- current-state precondition checks
- `dryRun` support
- a `reason` field to capture why the action was requested
- a response that returns both the updated entity and a human-readable summary

This is safer than giving an agent broad CRUD access.

### 6. Add precondition-aware writes

Every mutation initiated by an agent should include:

- `expectedStatus`
- `expectedAssigneeId`
- `expectedVersion`
- `requestedBy`
- `reason`

That prevents silent overwrites and lets the system reject stale or unsafe actions.

Example:

```json
{
  "itemType": "task",
  "itemId": 900,
  "newStatus": "completed",
  "expectedStatus": "in_progress",
  "expectedVersion": 12,
  "requestedBy": 45,
  "reason": "Task was confirmed complete in daily standup"
}
```

### 7. Make relations first-class

Right now linked items are mostly stored as `itemType` and `itemId`. That is workable but too narrow for richer agent reasoning.

Add a general relation model so an agent can ask:

- what came from this service ticket
- what tasks implement this feature
- what issues block this sprint
- what review included this item
- what wiki page is affected by this task

Even if you do not add a new relation table yet, expose a unified relation view in the API.

### 8. Publish machine-readable API documentation

Add OpenAPI for the existing REST endpoints and keep it current.

For agent use, the spec should make these things explicit:

- enum values
- required versus optional fields
- pagination rules
- date formats
- status transition rules
- permission errors
- examples for common tasks

This reduces prompt engineering overhead and lets tools consume the API more reliably.

### 9. Create a small AI playbook in the repo

Add a docs area for agent operators, for example:

- `docs/ai/ontology.md`
- `docs/ai/action-contracts.md`
- `docs/ai/common-queries.md`
- `docs/ai/safety-rules.md`

Contents should include:

- the canonical item vocabulary
- the allowed actions by role
- examples of good queries
- examples of actions that must require human confirmation
- examples of actions the agent must never do automatically

### 10. Separate agent modes clearly

Give the AI different operating modes:

- `read_only_analyst`
- `planning_assistant`
- `operator_with_confirmation`

For example:

- read-only mode can summarize project health and identify stale items
- planning mode can suggest tasks or sprint review drafts
- operator mode can mutate data, but only after approval or within narrow policy

This reduces the risk of accidental changes.

### 11. Improve auditability for AI-originated changes

For every agent-initiated write, record:

- actor type: human or AI-assisted
- triggering user
- action name
- target item
- before state
- after state
- reason
- timestamp

You already have status history. Extend the same idea to all important agent writes.

### 12. Add a compact export format for offline reasoning

Some agent workflows will work better if they can read a compact project snapshot instead of hitting many live endpoints.

Add an export such as:

`GET /api/projects/:projectId/agent/export`

This can return:

- normalized items
- relations
- open comments count
- recent status changes
- sprint metadata
- review summaries

That will be useful for background analysis, report generation, and future MCP-style integrations.

## Recommended Implementation Order

If you want the shortest path to practical agent support, do it in this order:

1. Normalize item types, statuses, and priorities into one canonical vocabulary.
2. Add a unified item envelope and one project-level agent context endpoint.
3. Publish OpenAPI with examples and explicit enums.
4. Add constrained action endpoints with `dryRun` and preconditions.
5. Expand relation modeling and queue endpoints.
6. Add stronger audit and approval workflows for AI-originated changes.

## Practical First Milestone

A good first milestone for this repo would be:

1. Create shared constants for canonical `itemType`, `status`, and `priority` values.
2. Normalize legacy aliases such as `service-ticket`, `service-tickets`, and `service_tickets` at the API boundary.
3. Introduce one normalized read endpoint for project items.
4. Introduce one read-only project context endpoint for agent consumption.
5. Generate and publish OpenAPI for the current API.
6. Add one safe write action with `dryRun`, such as status change or task assignment.

That would already make the system much more agent-friendly without requiring a large redesign.

## Summary

To facilitate an AI agent, focus less on "making the AI smarter" and more on making the system more legible and safer to act on.

The highest-value improvements for PJEasy are:

- one canonical vocabulary
- one unified item read model
- one bundled project context endpoint
- constrained write actions with preconditions
- machine-readable documentation
- full auditability for AI-assisted changes

PJEasy already has most of the business structure needed for this. The next step is to make that structure explicit and machine-friendly.