# Gitea Integration Evaluation

## Executive Summary

Integrating PJEasy with Gitea is feasible and technically well supported.

Gitea already exposes the core primitives PJEasy would need:

- OAuth2 and OIDC-style authentication for user sign-in and account linking
- scoped API access for repositories, issues, releases, and user/org data
- signed webhooks for push, pull request, issue, and release events

The current PJEasy codebase is also a good candidate for this work because it already has:

- project-scoped permissions and membership management
- strong internal work-item models for ideas, features, issues, tasks, service tickets, reviews, releases, comments, wiki pages, and status history
- a workflow engine and status transition layer that can react to external events
- a project settings screen that can host repository integration controls

The main constraint is that PJEasy currently has no external SCM integration layer at all. There are no repository bindings, no external identity records, no webhook ingestion endpoints, and no external object link tables. That means the integration is possible, but it should be implemented as a new capability rather than a small patch.

## Current Product Review

### Strengths that align well with Gitea

#### 1. Project-scoped organization

PJEasy is centered on projects, and project membership, invitations, settings, and status workflows already exist. That makes a project the natural anchor for linking one or more Gitea repositories.

This is a strong fit for:

- associating a PJEasy project with one or more Gitea repos
- limiting repository visibility and actions to project members/admins
- storing per-project automation rules for source control events

#### 2. Internal work-item model is already richer than SCM metadata

PJEasy has first-class internal items for:

- ideas
- features
- issues
- tasks
- service tickets

These items already support internal references, statuses, assignees, priorities, sprint links, release links, comments, and status history.

That is useful because Gitea should not become the only source of truth for PJEasy planning. Instead, Gitea objects should usually be linked to PJEasy items.

Examples:

- a PJEasy feature can be linked to one or more Gitea pull requests
- a PJEasy task can be linked to a branch and commits
- a PJEasy release can be linked to a Gitea tag or release
- a PJEasy issue can be linked to a Gitea issue when code-hosting visibility is needed

#### 3. Workflow and history infrastructure already exists

PJEasy already records status changes and supports project-specific status flows. That is a good foundation for webhook-driven automation.

Examples:

- when a linked pull request opens, move an item from `Open` to `InReview`
- when a linked pull request merges, move an item from `InReview` to `Completed`
- when a release tag is published in Gitea, mark a PJEasy release as `Completed`

This is one of the strongest reasons the integration is worth doing.

#### 4. Reviews and releases are good targets for SCM enrichment

PJEasy already has:

- sprints
- sprint reviews
- custom reviews
- releases

Those concepts map well to repository activity.

Examples:

- sprint reviews can show merged pull requests and commit summaries during the sprint window
- releases can link to Gitea releases and tags
- review summaries can include deployed changes pulled from Gitea metadata

#### 5. Collaboration surfaces exist already

PJEasy already has comments, follow-ups, wiki pages, and dashboards. These are natural places to display linked repository activity.

Examples:

- show linked PRs, branches, commits, and releases on item detail pages
- show recent repository activity on the project dashboard
- add follow-up entries from important webhook events

### Gaps and mismatches

#### 1. No external integration data model exists yet

Currently there is no schema support for:

- linked repositories
- linked external accounts
- linked commits, branches, pull requests, or external issues
- webhook deliveries or deduplication
- API tokens or integration secrets

This is the largest implementation gap.

#### 2. PJEasy items do not map 1:1 to Gitea concepts

Gitea is repo-centric. PJEasy is project-and-delivery centric.

Examples of mismatch:

- PJEasy `issue` and Gitea `issue` are not necessarily the same thing
- PJEasy `feature` has no exact Gitea equivalent
- PJEasy `task` often maps better to a branch or pull request than to a Gitea issue
- PJEasy `service ticket` is not a standard Gitea repo object

Because of that, a full bidirectional sync of all items would be high risk and likely confusing.

#### 3. One PJEasy project may need multiple repositories

A single PJEasy project can easily span:

- frontend repo
- backend repo
- infrastructure repo
- documentation repo

The integration should therefore support many repositories per project from the beginning. A one-project-to-one-repo design would be too limiting.

#### 4. Auth supports only local password login today

There is a small credential-provider abstraction in the backend, but the current login flow is still local-password based. There is no persisted external identity mapping yet.

That means Gitea SSO is possible, but not plug-and-play.

#### 5. Wiki sync is possible only in limited form

PJEasy wiki pages are structured as a project page tree and store HTML content with internal change management. Gitea wiki content is repository-oriented and markdown-based.

Because of that, full bidirectional wiki sync is not a good first target.

## Gitea Capability Summary

Based on the official Gitea documentation, the platform already provides the capabilities needed for a practical integration:

- OAuth2 authorization code flow, including OIDC endpoints
- granular scopes for read and write access to repositories, issues, organizations, and users
- signed webhook delivery with `X-Gitea-Signature`
- repository, issue, release, and pull-request related API surfaces

That means the technical blocker is not Gitea capability. The work is mostly on the PJEasy side.

## Feasibility Assessment

### Verdict

Gitea integration is practical and worth doing.

### Recommended product position

The integration should be built as an optional repository integration layer, not as a replacement for PJEasy's internal planning model.

### Best initial scope

The best first version is:

- connect one or more Gitea repositories to a PJEasy project
- link PJEasy items to pull requests, branches, commits, releases, and optionally Gitea issues
- ingest webhooks and surface repository activity inside PJEasy
- add optional workflow automations for linked items

### Not recommended as a first version

These should be avoided initially:

- making Gitea issues the primary source of truth for PJEasy items
- full bidirectional sync of all work items
- automatic permission mirroring from Gitea collaborators to PJEasy members
- full wiki mirroring between PJEasy and Gitea

## Recommended Architecture

### Integration Principles

1. PJEasy remains the system of record for planning, delivery tracking, workflow, and permissions.
2. Gitea is treated as the system of record for repository state and code activity.
3. Links are better than forced synchronization unless the mapping is truly stable.
4. Automation must be explicit and project-configurable.
5. The data model should be generic enough that GitHub or GitLab could be added later, even if only Gitea is implemented now.

### Proposed Backend Additions

### 1. Connection and repository tables

Add tables such as:

- `external_accounts`
  - user-to-Gitea identity mapping
  - provider user id
  - username
  - access token / refresh token storage policy
- `project_repositories`
  - PJEasy project id
  - provider name (`gitea`)
  - Gitea instance base URL
  - owner/org name
  - repository name
  - repository id
  - default branch
  - webhook configuration status
- `external_links`
  - project item type
  - project item id
  - external object type (`issue`, `pull_request`, `branch`, `commit`, `tag`, `release`)
  - external id
  - external URL
  - metadata snapshot
- `webhook_deliveries`
  - provider delivery id
  - event type
  - repository id
  - received timestamp
  - payload hash
  - processing status
  - error details

If you want to keep the first implementation narrower, `external_accounts` can be deferred until OAuth login or per-user repo actions are needed.

### 2. Gitea integration module

Add a dedicated backend module, for example:

- `backend/internal/integrations/gitea/`

This module should contain:

- typed API client
- OAuth callback handler support
- webhook signature verification
- payload normalization
- service layer for repository binding, sync, and link creation

### 3. Configuration additions

Extend backend config with fields such as:

- `gitea.baseUrl`
- `gitea.clientId`
- `gitea.clientSecret`
- `gitea.webhookSecret`
- `gitea.defaultScopes`
- `gitea.allowSelfSigned` or custom CA support if needed for internal deployments

### 4. Webhook endpoint

Add a dedicated endpoint such as:

- `POST /api/integrations/gitea/webhooks`

This endpoint should:

- verify the signature
- record the delivery id to prevent duplicate processing
- normalize event types
- apply only configured project-level automations
- write activity or link updates without assuming every event changes workflow state

### 5. Automation rule model

Add a project-level automation configuration so admins can define behavior like:

- linked PR opened -> set item status to `InReview`
- linked PR merged -> set item status to `Completed`
- linked branch push -> append follow-up entry
- linked release published -> mark PJEasy release as complete

This should be explicit. Do not hard-code workflow transitions globally.

### Proposed Frontend Additions

### 1. Project settings: repository integration section

The existing project settings page is the right place to add:

- connect repository button
- repository list for the project
- webhook status
- manual resync button
- automation rule editor

### 2. Item detail pages: external link panel

On feature, issue, task, and release detail pages, add:

- linked PRs
- linked branches
- linked commits
- linked Gitea issues
- linked release/tag information

### 3. Auth pages: optional Gitea sign-in

The current login and registration flow can be extended with:

- `Sign in with Gitea`
- `Link Gitea account` from user profile or settings

This should be optional, not a replacement for local auth unless the product explicitly wants SSO-only operation.

### 4. Dashboard and reviews

Add repository insights to:

- project dashboard
- sprint review pages
- release pages

Examples:

- merged PR count in sprint window
- latest commits on linked repos
- release tag and changelog references

## Phased Implementation Plan

### Phase 1: Foundation

Goal: make repository linking and webhook ingestion possible.

Deliverables:

- add config fields for Gitea
- create database tables for repositories, external links, and webhook deliveries
- implement a basic Gitea API client
- add project settings UI to register one or more repos
- add webhook endpoint with signature verification and delivery deduplication
- add a `Test connection` action

Success criteria:

- a project admin can connect a Gitea repository
- PJEasy can receive and validate webhook deliveries
- linked repo metadata is stored and displayed

### Phase 2: Read-only visibility

Goal: expose repository information inside PJEasy without changing PJEasy workflow state yet.

Deliverables:

- link items to PRs, commits, branches, and releases
- show linked repo activity on item detail pages
- show project-level recent repo activity
- add manual sync or refresh endpoints

Success criteria:

- users can navigate from PJEasy items to code changes
- project pages show useful Gitea context
- no workflow automation is required yet

### Phase 3: Workflow automation

Goal: allow Gitea events to influence PJEasy items in controlled ways.

Deliverables:

- project-level automation rule editor
- webhook processing for PR open/close/merge, push, issue, and release events
- status updates through the existing PJEasy status-change service
- follow-up generation from significant repo events

Success criteria:

- admins can enable automation per project
- linked items change state only when configured rules allow it
- webhook processing is idempotent and auditable

### Phase 4: Identity and sign-in

Goal: support Gitea OAuth login and user account linking.

Deliverables:

- OAuth redirect and callback handlers
- external account persistence
- UI for sign-in with Gitea and account linking
- mapping policy for existing users vs newly created users

Success criteria:

- a user can sign in with Gitea or link an existing PJEasy account to Gitea
- tokens are stored safely and rotatable
- account collisions are handled explicitly

### Phase 5: Deeper product workflows

Goal: use repository activity in PJEasy planning and reporting features.

Deliverables:

- release objects linked to Gitea releases and tags
- sprint and review summaries enriched by merged PRs and commits
- optional auto-linking when PR titles or commit messages contain PJEasy ref numbers

Success criteria:

- release and review pages provide meaningful SCM context
- teams can trace a PJEasy item from planning through code change to release

## Risks and Design Decisions

### 1. Permission authority

Recommendation: PJEasy should remain authoritative for project membership and role enforcement.

Reason:

- Gitea collaborator access and PJEasy project roles solve different problems
- repo access should not automatically grant project-management access

### 2. Item mapping

Recommendation: use explicit links instead of trying to auto-convert every PJEasy item into a Gitea issue.

Reason:

- the semantic mismatch is too large
- users will quickly lose trust if the system creates the wrong external object type

### 3. Token storage and secrets

Recommendation: plan secure storage early.

Requirements:

- encrypt stored tokens if per-user access tokens are persisted
- support token rotation
- keep webhook secrets separate from OAuth secrets

### 4. Duplicate and out-of-order webhooks

Recommendation: treat webhook ingestion as an event-processing problem, not a simple callback.

Requirements:

- deduplicate by delivery id
- persist raw delivery metadata
- make processing retryable
- avoid assuming delivery order

### 5. Wiki integration scope

Recommendation: do not promise bidirectional wiki sync in the initial rollout.

Better first step:

- link repository documentation
- show source links
- optionally export selected PJEasy wiki pages later

## Recommended First Release Scope

If this needs to be kept tight, the best MVP is:

1. connect one or more Gitea repositories to a project
2. receive signed webhooks
3. link PJEasy items to pull requests, commits, and releases
4. display repository context on project and item pages
5. optionally automate a small set of status transitions for linked PR merges

That MVP would deliver clear user value without forcing a risky redesign of PJEasy's planning model.

## Final Recommendation

Proceed with a phased Gitea integration.

The integration is a good fit for PJEasy as long as it is positioned correctly:

- PJEasy stays responsible for planning, workflow, and permissions
- Gitea supplies repository, code, and release signals
- automation is explicit and project-controlled
- the first version emphasizes linking and visibility before deep synchronization

In short: this integration is viable, strategically useful, and best implemented as an optional SCM integration layer with a read-only-first rollout.