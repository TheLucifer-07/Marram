# Testing strategy

## Backend (written, not executed in the authoring environment)

| Layer | Tool | What it proves |
|---|---|---|
| Workflow rules | JUnit 5 (`TaskStatusTest`) | Allowed transitions, no skipping to DONE, reopen privilege |
| JWT validation | JUnit 5 + Nimbus with generated RSA keys (`SupabaseJwtDecoderTest`) | Valid token accepted; expired, wrong issuer, wrong audience, anon role, missing subject, foreign key, `alg: none`, garbage, and HS256 rules rejected |
| Service rules | Mockito (`TaskServiceTest`, `WorkspaceServiceTest`) | Creator becomes owner, duplicates rejected, member cannot create/assign, assignee must be a member, invalid transitions leave state untouched, history written, removal clears assignments, viewer flags |
| Helpers | JUnit (`PagesTest`, `DashboardServiceTest`) | Size cap, sort allowlist, LIKE escaping, percentage math |
| API + MySQL | Spring Boot Test, MockMvc, Testcontainers MySQL 8.4 (`ApiFlowIT`) | SRS scenarios A to D; stranger access to every route; role matrix; validation format; pagination/sort/filter in SQL; archive rules; soft delete; overdue aggregation; Flyway migrations and entity mappings against a real schema |

Integration tests use Spring Security's `jwt()` post-processor to present verified tokens, so they exercise authorization and persistence rather than signature checking (covered by the decoder unit test). They do not call Supabase.

Run: `./mvnw test` (unit) and `./mvnw verify` (all; needs Docker).

## Frontend (executed: 45 tests passing)

Vitest + React Testing Library + jsdom: protected-route states (loading, redirect, ready, profile error with retry), login and register validation, friendly auth errors, confirmation screen, theme default/toggle/persistence/restoration, board grouping, optimistic drop and rollback, illegal drops, keyboard move menu, mobile column tabs, non-draggable cards, overdue styling, project health rules, KPI drill-down and delta rules, team panel, formatting and error-message helpers.

Not covered by automated tests: workspace switching, task form submission, dashboard rendering with data. Add them with a mocked `Api` module.

## Browser QA (executed)

`frontend/qa/` holds a Playwright-driven harness: `run.mjs` (screenshots, overflow, console errors and axe at 6 viewports x 2 themes), `interactions.mjs` (keyboard, focus, theme, reduced motion, CLS), `extra.mjs` (MEMBER role, OAuth error). It runs against the production bundle with a seeded session and fixture API. See `frontend/qa/README.md` and [qa/qa-report.md](qa/qa-report.md). It does not replace testing against the real backend and Supabase.

## Database and deployment checks (executed)

Migrations were applied to MySQL 8.0 and exercised with constraint-violating inserts, cascades and aggregate queries; `nginx.conf` was run against the production bundle; `docker compose config` was validated. Repeatable commands are in the QA report.

## Manual acceptance checklist

1. Sign up by email, confirm, sign in. 2. Sign in with Google. 3. Onboarding creates workspace, project, task. 4. Second account signs in; owner adds it by email as MEMBER. 5. Member sees only allowed actions; changes own task status; cannot create a project (try the API directly: 403). 6. Task history shows each change. 7. Dashboard numbers match the task list. 8. Second browser profile, unrelated user: opening a copied project URL shows not-found. 9. Invalid board drop (TODO to DONE) is refused with a message. 10. Toggle theme, reload: theme persists.

## CI

GitHub Actions: backend `./mvnw -B verify`; frontend `npm ci`, lint, test, build; Docker compose config validation and image builds.

## Things to check first when you run the backend tests

- `ApiFlowIT.scenarioD` uses `@MockitoSpyBean` on a `@Transactional` service. If your Spring version does not stub through the proxy, replace it with a `@TestConfiguration` that wraps `TaskHistoryRepository` and throws on `save`.
- Any first-compile errors (the Java was written without a compiler) will show on `./mvnw test`.
- The Maven wrapper pins Maven 3.9.11; edit `backend/.mvn/wrapper/maven-wrapper.properties` if it is unavailable.
