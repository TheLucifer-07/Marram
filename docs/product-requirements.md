# Product requirements

Source of truth: the FlowDesk SRS/SDD, with the changes the build brief required. FlowDesk is now **Marram**.

## Product

Marram gives small teams a workspace to organize projects, assign tasks, track progress and keep an auditable history. Target users: small development teams, college project teams, student developer communities, small organizations with internal projects.

## Functional coverage

| SRS item | Status |
|---|---|
| FR-01 registration, FR-02 authentication | Delivered through Supabase Auth (see deviations) |
| FR-03 workspaces (creator becomes OWNER) | Implemented |
| FR-04 membership by email, roles OWNER/LEAD/MEMBER, one OWNER | Implemented. Ownership transfer is not offered |
| FR-05 projects (unique name per workspace, archive) | Implemented |
| FR-06 tasks, workflow, assignee must be a member | Implemented |
| FR-07 comments | Implemented |
| FR-08 task history (creation, status, priority, assignee, due date) | Implemented, append-only, no write API |
| FR-09 dashboard from persisted data | Implemented, extended with charts data |
| Section 5 authorization matrix | Implemented in `AccessService` and the services |
| Filtering, sorting, pagination (default 10, max 100, allowlisted sort) | Implemented in the database |
| Flyway, Docker Compose, GitHub Actions, Swagger | Implemented |
| Out of scope list (Redis, websockets, email, files, billing, mobile apps…) | Not built |

## Deviations from the SRS and why

| # | SRS says | Marram does | Reason |
|---|---|---|---|
| 1 | Spring issues JWTs, `/auth/register`, `/auth/login`, BCrypt | Supabase Auth issues tokens; Spring verifies them. `/auth/register` and `/auth/login` do not exist. No password is stored in MySQL | Build brief: Supabase is the identity provider. A second JWT system is explicitly forbidden |
| 2 | `GET /auth/me` | Kept, plus `PATCH /auth/me` (display name) | Settings page |
| 3 | Non-member gets 403 | Non-member gets **404** for workspace-scoped resources; 403 is used when the user is a member with an insufficient role | Avoids confirming that a guessed ID exists (ADR 0004) |
| 4 | Token in `sessionStorage` | `supabase-js` manages the session (browser storage, auto-refresh) | Required by the Supabase flow. Same XSS trade-off, documented in the security doc |
| 5 | Task `DELETE` | Soft delete (`deleted_at`) | Keeps history rows intact |
| 6 | Collections paginated | Projects, tasks, comments, history and activity are paged. Workspaces and members are returned as short arrays | They are naturally small and drive selectors |
| 7 | `DONE → IN_PROGRESS "when explicitly authorized"` | Allowed for OWNER and LEAD only | Interpretation of "explicitly authorized" |
| 8 | Seven tables | Same seven, plus `users.supabase_user_id`, `users.avatar_url`, `tasks.deleted_at`, `tasks.version`, generated `priority_rank`/`status_rank` | Identity mapping, soft delete, optimistic locking, sort by meaning |
| 9 | Additional endpoints | `GET /workspaces/{id}/tasks`, `GET /workspaces/{id}/activity` | "My tasks" page and dashboard feed |
| 10 | `Spring Boot 3.x` | 3.5.16, which is past free support | ADR 0002 |
| 11 | Real photography allowed | None used. All artwork is original SVG | The authoring environment could not download images; nothing third-party means no licensing risk |
| 12 | Tailwind 3, React, JavaScript | As specified. Framer Motion added per the brief | |

## Missing decisions resolved

- Overdue = not DONE, due date before today, in a non-archived project. "Today" uses `APP_TIME_ZONE`.
- Dashboard "total projects" counts ACTIVE projects only (the SRS wording "total active projects").
- Removing a member clears their assignments in the same transaction and logs each one.
- Email-based member invitation requires an existing account; no invitation emails are sent (no mail provider configured).
- Member emails are stored lowercase.

## Premium transformation (this release)

- Renamed Barnraise to Rafter, then to **Marram** after Rafter was found to have existing software and brand use ([ADR 0001](architecture/decisions/0001-product-name.md)). Java package `com.marram`, database `marram`, `marram.*` local-storage keys. The Java package and database name changed, so an existing development database named `barnraise` must be recreated or renamed (the Flyway history is unchanged; only the schema name differs).
- Dashboard rebuilt around six questions: what is happening, what next, which projects are progressing, what is overdue or blocked, what changed, how is the team doing. Backed by new aggregates (see API doc).
- Kanban: optimistic moves with rollback, drop feedback, keyboard move menu, column tabs on small screens.
- Members: directory with open-task counts and a drawer of each person's open work.
- Projects: card and list layouts, creator, due label.
- Onboarding shortened from four steps to three.
- Sidebar collapses; page transitions; theme switch transition; design tokens for elevation, stacking and motion.

### Not done, and why

- Dashboard "date or period selection": the backend provides fixed 7 and 14 day windows only, so no picker was added rather than a control that does nothing.
- Activity for project creation and membership changes: not stored, so not shown.

