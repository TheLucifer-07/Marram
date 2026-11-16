# Architecture

## Style

A modular monolith with layered architecture: one React single-page app, one Spring Boot service, one MySQL database. No microservices, cache or queue; none solves a defined problem.

```
                     ┌───────────────────────────────┐
  Browser (React) ──►│ Supabase Auth                  │  sign up / sign in / Google OAuth
        │            └───────────────┬───────────────┘
        │  access token (JWT)        │ publishes public keys (JWKS)
        ▼                            ▼
  ┌──────────────────────── Spring Boot API ────────────────────────┐
  │ Security filter chain                                           │
  │   Bearer token → SupabaseJwtDecoder (sig, iss, exp, aud, role)  │
  │ @CurrentUser resolver → users row by supabase_user_id           │
  │ Controllers (thin) → DTO validation                             │
  │ Services → AccessService (workspace role) → business rules      │
  │ Repositories → Spring Data JPA / Hibernate                      │
  └──────────────────────────────┬──────────────────────────────────┘
                                 ▼
                          MySQL 8 (Flyway)
```

## Request lifecycle

1. The browser sends `Authorization: Bearer <access token>`.
2. The resource-server filter verifies the token. Failure returns a 401 problem document.
3. The `@CurrentUser` argument resolver loads (or creates on first sign-in) the application user from the token subject. This runs outside business transactions.
4. The controller validates the body (`@Valid`) and calls one service method, passing the user.
5. The service resolves the resource through `AccessService`: not a member → 404, wrong role → 403.
6. The service applies business rules inside a transaction and returns DTOs.
7. `GlobalExceptionHandler` converts any failure to an RFC 9457 problem response; stack traces are logged, never returned.

## Data ownership

| Concern | Owner |
|---|---|
| Credentials, password hashing, OAuth, sessions, token issuing | Supabase |
| Profile (name, email, avatar), roles, projects, tasks, comments, history | MySQL, via Spring Boot |
| Permissions | Spring Boot only. The UI mirrors them but never enforces them |

## Key design choices

- **Single authorization gate** (`AccessService`). Services cannot reach a project or task without it.
- **History inside the transaction.** `TaskHistoryService.record` uses `Propagation.MANDATORY`. A failure in the audit write rolls back the change (integration test `scenarioD`).
- **Optimistic locking** on tasks (`@Version`) turns concurrent edits into a 409 instead of lost updates.
- **Database does the querying**: Specifications for filters, allowlisted sorts, generated rank columns, aggregate queries for the dashboard, fetch graphs and batch counts to avoid N+1.
- **Server tells the UI what is allowed.** Task responses carry `canEdit`, `canChangeStatus` and `allowedTransitions` computed for the viewer.
- **Frontend**: contexts for theme, auth and the selected workspace; one `Api` module; routes for app pages are lazy-loaded.

## Deployment topology

`docker-compose.yml`: `mysql` (private network, volume), `backend` (waits for MySQL health), `frontend` (nginx, static files, proxies `/api` to the backend so the browser sees one origin).
