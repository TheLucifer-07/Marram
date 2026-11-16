# Marram

**Hold the work together.**

Marram is a workspace for small teams to plan projects, assign every task to someone, and keep an honest record of how the work moved. It is built for student project groups, small development teams and groups running internal projects.

The name comes from marram grass, whose roots bind shifting dunes into solid ground. Plans shift; Marram gives a team the structure that holds.

> Status of this delivery, stated plainly: the frontend is built, linted and unit-tested here. The backend is fully written but **could not be compiled or tested in the authoring environment** (no access to Maven Central, no Docker). Supabase and Google sign-in were **not live-tested**. See [Verification status](#verification-status) and run the commands in [Testing](#testing) on your machine first.

## Features

- **Workspaces and roles.** Owner, Lead and Member, set per workspace and enforced by the API.
- **Projects** with start and due dates, live completion counts, status and archive.
- **Tasks** with priority, assignee, due date and a validated workflow (To do, In progress, In review, Blocked, Done). List view and drag-and-drop board over the same data.
- **Comments** on tasks and an **append-only task history** (status, priority, assignee, due date, creation, deletion).
- **Dashboard** from real aggregates: KPIs with a 7-day completion comparison, my work (due soon, overdue, top priority, recently updated), project health, status donut, completion trend, team workload, deadlines, and an activity feed of changes and comments.
- **Search, filter, sort and pagination** done in the database.
- **Sign in** with email and password or Google, through Supabase Auth.
- **Light and dark themes** from one set of design tokens, remembered per device.
- **Accessible, responsive UI** with reduced-motion support.

## Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite 8, Tailwind CSS 3, React Router 7, Axios, Recharts, Framer Motion, Lucide. JavaScript only, no TypeScript |
| Backend | Java 21, Spring Boot 3.5.16, Spring Security (OAuth2 resource server), Spring Data JPA / Hibernate, Jakarta Validation, springdoc OpenAPI |
| Database | MySQL 8 with Flyway migrations |
| Identity | Supabase Auth (email/password, Google OAuth) |
| Delivery | Docker, Docker Compose, GitHub Actions |

Spring Boot 3.5.16 is the final open-source 3.x release and its free support ended on 30 June 2026. It is used because the specification asks for Spring Boot 3.x. See [ADR 0002](docs/architecture/decisions/0002-spring-boot-version.md) for the upgrade path.

## Architecture in one picture

```
Browser (React) ──Supabase JS──► Supabase Auth ──► access token (JWT, ES256/RS256)
      │
      │  Authorization: Bearer <access token>
      ▼
Spring Boot API ── verifies signature, issuer, audience, expiry via Supabase JWKS
      │            maps sub ─► users.supabase_user_id, loads workspace role from MySQL
      ▼
MySQL 8  (users, workspaces, workspace_members, projects, tasks, comments, task_history)
```

Supabase proves **who** someone is. Spring Boot and MySQL decide **what they may do**. Details: [docs/architecture/architecture.md](docs/architecture/architecture.md).

## Repository layout

```
frontend/   React app, Dockerfile, nginx.conf
backend/    Spring Boot app, Flyway migrations (src/main/resources/db/migration), tests
database/   Schema export and database notes
docs/       Architecture, database, API, security, deployment, testing, design system, ADRs
.github/    CI workflow
docker-compose.yml, .env.example
```

## Quick start (local development)

Prerequisites: JDK 21, Node.js 22 LTS, MySQL 8 (or Docker), a Supabase project. Maven is not required: use the wrapper (`./mvnw`).

1. **Supabase**: follow [docs/deployment/supabase-setup.md](docs/deployment/supabase-setup.md) (project, email auth, Google, redirect URLs).
2. **Database**: create it, for example with Docker:
   ```bash
   docker run -d --name marram-mysql -p 3306:3306 \
     -e MYSQL_DATABASE=marram -e MYSQL_USER=marram -e MYSQL_PASSWORD=change-me -e MYSQL_ROOT_PASSWORD=root-change-me \
     mysql:8.4
   ```
3. **Backend**:
   ```bash
   cd backend
   export DB_PASSWORD=change-me SUPABASE_URL=https://YOUR-PROJECT-REF.supabase.co FRONTEND_ORIGIN=http://localhost:5173
   ./mvnw spring-boot:run          # http://localhost:8080, Swagger UI at /swagger-ui.html
   ```
4. **Frontend**:
   ```bash
   cd frontend
   cp .env.example .env            # fill in VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY
   npm install
   npm run dev                     # http://localhost:5173 (proxies /api to :8080)
   ```

## Run everything with Docker Compose

```bash
cp .env.example .env              # fill in every value
docker compose up --build
# App:      http://localhost:3000
# API docs: http://localhost:8080/swagger-ui.html (bound to localhost only)
```

The frontend container serves the static app and proxies `/api` to the backend, so the browser sees one origin. MySQL is not published to the host. Add `http://localhost:3000/auth/callback` to the Supabase redirect URLs.

## Environment variables

| Variable | Required | Purpose | Where to get it |
|---|---|---|---|
| `VITE_SUPABASE_URL` (frontend) | Yes | Supabase project URL | Supabase Dashboard > Project Settings > API (Project URL) |
| `VITE_SUPABASE_PUBLISHABLE_KEY` (frontend) | Yes | Public browser key, starts `sb_publishable_` | Dashboard > Project Settings > API Keys |
| `VITE_API_BASE_URL` (frontend) | No | API origin. Empty means same origin (Vite proxy or nginx) | Your API URL if hosted separately |
| `SUPABASE_URL` (backend, compose) | Yes | Derives issuer `…/auth/v1` and the JWKS URL | Same Project URL |
| `SUPABASE_JWT_AUDIENCE` | No | Expected `aud`, default `authenticated` | Leave default |
| `SUPABASE_REQUIRE_VERIFIED_EMAIL` | No | Create profiles only for verified emails (default `true`). Needs "Confirm email" on in Supabase | Leave default |
| `SUPABASE_JWT_SECRET` | No | Only for legacy HS256 projects. Prefer migrating to asymmetric signing keys | Dashboard > Project Settings > JWT Keys |
| `DB_URL`, `DB_USERNAME`, `DB_PASSWORD` | Yes | MySQL connection | Your MySQL server |
| `MYSQL_PASSWORD`, `MYSQL_ROOT_PASSWORD` (compose) | Yes | Initial database credentials | You choose them |
| `FRONTEND_ORIGIN` | Yes | Exact browser origin allowed by CORS | The URL users open |
| `APP_TIME_ZONE` | No | Zone for "today" in overdue logic, default `UTC` | IANA name, e.g. `Asia/Kolkata` |
| Google OAuth client ID and secret | For Google sign-in | Entered **in Supabase**, not in this app | Google Cloud Console, see the setup guide |

Never put the Supabase secret key, a `service_role` key, the JWT secret or a database password in a `VITE_` variable. Nothing in this project needs them in the browser.

## Testing

```bash
# Frontend (verified in the authoring environment)
cd frontend && npm ci && npm run lint && npm test && npm run build

# Backend unit tests (no Docker needed)
cd backend && ./mvnw test

# Backend unit + integration tests (needs Docker for Testcontainers MySQL)
cd backend && ./mvnw verify
```

## Verification status

Full detail, including defects found and fixed: [docs/qa/qa-report.md](docs/qa/qa-report.md).

| Item | Status |
|---|---|
| Frontend lint, unit tests (45), production build | **Passed** |
| Browser QA: every page, light and dark, at 1440, 1280, 1024, 768, 390 and 360 px (198 captures) | **Passed**: 0 axe violations, 0 overflow, 0 console errors. Ran against fixture data, not the real API |
| Keyboard, focus, reduced motion, theme persistence, performance signals (27 checks); MEMBER-role UI and OAuth-error state (16 checks) | **Passed** |
| MySQL migrations V1 to V5 on a real MySQL 8.0 server, constraint and aggregate checks | **Passed** |
| `nginx.conf` against the production bundle; `docker compose config` | **Passed** |
| Java source | Parses, and every reference to our own classes resolves. **Not compiled** |
| Spring Boot unit and integration tests, Maven package | **Not run** (no Maven Central access) |
| Docker image builds and `docker compose up` | **Not run** (Docker Hub unreachable) |
| Supabase email and Google sign-in; frontend against the real backend | **Not run** (needs your credentials) |
| Domain and trademark clearance for "Marram" | **Not done**: see [ADR 0001](docs/architecture/decisions/0001-product-name.md) |

Expect small compile-level fixes on the first Maven build: about 3,400 lines of Java have never been through a compiler.

## Documentation

- [Architecture](docs/architecture/architecture.md) and [decision records](docs/architecture/decisions/)
- [Product requirements and SRS deviations](docs/product-requirements.md)
- [Database design](docs/database/database-design.md)
- [API reference](docs/api/api-documentation.md)
- [Authentication and security](docs/security/authentication-security.md)
- [Testing strategy](docs/testing-strategy.md) and [QA report](docs/qa/qa-report.md)
- [Design system and brand](docs/design-system.md) and [motion system](docs/design/motion-system.md)
- [Deployment guide](docs/deployment/deployment-guide.md) and [Supabase setup](docs/deployment/supabase-setup.md)
- [Backend README](backend/README.md), [Frontend README](frontend/README.md)

## Troubleshooting

- **"Supabase is not configured"** on the frontend: `frontend/.env` is missing or the dev server was not restarted.
- **Every API call returns 401**: the backend rejected the token. Check that `SUPABASE_URL` matches the project exactly, that the project uses asymmetric signing keys (the JWKS URL returns keys), or set `SUPABASE_JWT_SECRET` for a legacy HS256 project.
- **CORS error in the browser**: `FRONTEND_ORIGIN` must equal the page origin exactly. With Docker Compose, use the nginx origin.
- **Google sign-in returns to login with an error**: the redirect URL is not in Supabase's allow list, or the Google redirect URI does not match. See the setup guide.
- **Flyway checksum errors**: never edit an applied migration; add a new `V6__…` file.
- **"No Marram account uses that email yet"** when adding a member: the person must sign in once first.

## License

MIT, see [LICENSE](LICENSE).
