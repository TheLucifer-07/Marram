# API reference

Base URL `/api/v1`. JSON. Every endpoint requires `Authorization: Bearer <Supabase access token>`. Live, generated documentation: `/swagger-ui.html` and `/v3/api-docs` (these reflect the code, this page is a summary).

`R` = role needed: **M** any member, **L** OWNER or LEAD, **O** OWNER. Outsiders always get 404.

## Profile

| Method | Path | R | Notes |
|---|---|---|---|
| GET | `/auth/me` | any signed-in user | Creates the profile on first call |
| PATCH | `/auth/me` | self | `{ "fullName" }` |

## Workspaces and members

| Method | Path | R | Notes |
|---|---|---|---|
| POST | `/workspaces` | any | Caller becomes OWNER. 201 |
| GET | `/workspaces` | any | Caller's workspaces with `myRole`, `memberCount` |
| GET | `/workspaces/{id}` | M | |
| PUT | `/workspaces/{id}` | O | `{ name, description }` |
| GET | `/workspaces/{id}/members` | M | |
| POST | `/workspaces/{id}/members` | O | `{ email, role: LEAD|MEMBER }`. 404 if no account, 409 if already a member, 400 for OWNER. 201 |
| PATCH | `/workspaces/{id}/members/{userId}` | O | `{ role }`. The owner cannot be changed |
| DELETE | `/workspaces/{id}/members/{userId}` | O | Clears their assignments (logged). 204 |
| GET | `/workspaces/{id}/dashboard` | M | Aggregates, see below |
| GET | `/workspaces/{id}/activity?page&size` | M | Recent task history |
| GET | `/workspaces/{id}/tasks` | M | Same filters as a project's list plus `projectId`, `open=true` (not DONE) and `overdue=true` (past due, not DONE) |

## Projects

| Method | Path | R | Notes |
|---|---|---|---|
| POST | `/workspaces/{id}/projects` | L | `{ name, description, startDate, dueDate }`. 409 on duplicate name. 201 |
| GET | `/workspaces/{id}/projects` | M | `status`, `q`, `page`, `size`, `sort` (`createdAt|name|dueDate|startDate|status`) |
| GET | `/projects/{id}` | M | |
| PUT | `/projects/{id}` | L | May set `status` ACTIVE or COMPLETED |
| PATCH | `/projects/{id}/archive` | L | |

## Tasks

| Method | Path | R | Notes |
|---|---|---|---|
| POST | `/projects/{id}/tasks` | L | `{ title, description, priority, assigneeId?, dueDate? }`. 409 in archived project. 201 |
| GET | `/projects/{id}/tasks` | M | `status`, `priority`, `assigneeId`, `q`, `page` (0), `size` (10, max 100), `sort` (`createdAt|updatedAt|dueDate|title|priority|status`, `,asc|desc`) |
| GET | `/tasks/{id}` | M | |
| PUT | `/tasks/{id}` | L | title, description, priority, dueDate |
| PATCH | `/tasks/{id}/status` | assignee or L | `{ status }`. 409 on an invalid transition |
| PATCH | `/tasks/{id}/assignee` | L | `{ assigneeId }` or null. 400 if not a workspace member |
| DELETE | `/tasks/{id}` | L | Soft delete. 204 |

Task response (extract): `status`, `priority`, `assignee`, `dueDate`, `overdue`, `allowedTransitions[]`, `canEdit`, `canChangeStatus`.

### Workflow

`TODO → IN_PROGRESS`, `IN_PROGRESS → IN_REVIEW | BLOCKED`, `BLOCKED → IN_PROGRESS`, `IN_REVIEW → IN_PROGRESS | DONE`, `DONE → IN_PROGRESS` (OWNER/LEAD only).

## Comments and history

| Method | Path | R |
|---|---|---|
| POST | `/tasks/{id}/comments` | M (`{ content }`, 201) |
| GET | `/tasks/{id}/comments?page&size` | M, oldest first |
| GET | `/tasks/{id}/history?page&size` | M, newest first, read-only |

## Dashboard response

`totalProjects` (active), `totalTasks`, `completedTasks`, `pendingTasks`, `inProgressTasks`, `blockedTasks`, `overdueTasks`, `completionPercentage` (2 decimals, 0 if no tasks), `tasksByStatus`, `tasksByPriority`, `projectProgress[]`, `overdueList[]`, `upcomingDeadlines[]` (next 7 days), `recentActivity[]` (task changes and comments merged, newest first; each item has `kind` of `change` or `comment`), `unassignedOpenTasks`, `completedLast7Days`, `completedPrevious7Days`, `completionTrend[]` (14 daily points `{date, completed}` taken from the history table), `workload[]` (every member: `openTasks`, `overdueTasks`, `completedTasks`). Project entries in `projectProgress[]` include `overdueTasks`, `blockedTasks` and `createdBy`.

Project creation and membership changes are not recorded anywhere, so they do not appear in activity.

Additive changes in this version: `MemberResponse.openTasks`, `ProjectResponse.createdBy`, `ActivityResponse.kind`, the `open`/`overdue` filters and the dashboard fields above. No existing field or endpoint was removed or changed.

## Pagination shape

`{ "content": [], "page": 0, "size": 10, "totalElements": 25, "totalPages": 3 }`

## Errors

RFC 9457 problem documents:

```json
{ "type": "about:blank", "title": "Validation Failed", "status": 400, "detail": "Request validation failed",
  "instance": "/api/v1/workspaces", "errors": [ { "field": "name", "message": "must not be blank" } ] }
```

| Status | When |
|---|---|
| 400 | Validation, malformed input, disallowed sort field, invalid assignee |
| 401 | Missing, invalid or expired token |
| 403 | Member without the needed role |
| 404 | Not found, or the caller is not in that workspace |
| 409 | Duplicate, invalid transition, archived project, concurrent edit |
| 500 | Unexpected; details are logged, not returned |
