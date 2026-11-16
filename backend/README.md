# Marram backend

Spring Boot 3.5.16, Java 21, MySQL 8.

## Run

```bash
export DB_URL='jdbc:mysql://localhost:3306/marram?useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=UTC'
export DB_USERNAME=marram DB_PASSWORD=change-me
export SUPABASE_URL=https://YOUR-PROJECT-REF.supabase.co
export FRONTEND_ORIGIN=http://localhost:5173
./mvnw spring-boot:run
```

Swagger UI: `http://localhost:8080/swagger-ui.html`. Health: `/actuator/health`. Flyway creates the schema on first start. See `.env.example` for every setting.

## Architecture

Layered, single deployable: **controller → service → repository → entity**, with DTOs at the edge.

```
com.marram
├── config/       AppProperties, Clock, OpenAPI
├── security/     SecurityConfig, SupabaseJwtDecoder, SupabaseJwtValidators, CurrentUserService, @CurrentUser
├── web/          argument resolver that injects the application user
├── controller/   thin HTTP adapters (Auth, Workspace, Member, Project, Task, Comment, Dashboard)
├── dto/          Dto.java: every request and response record
├── service/      business rules, authorization (AccessService), transactions
├── repository/   Spring Data JPA, aggregate queries, EntityGraphs
├── entity/       JPA entities (AppUser, Workspace, WorkspaceMember, Project, Task, Comment, TaskHistory)
├── enums/        Role, ProjectStatus, TaskStatus (workflow), TaskPriority
├── mapper/       entity to DTO, including per-viewer permission flags
└── exception/    domain exceptions and the @RestControllerAdvice handler
```

Rules the code follows: controllers hold no business logic; `AccessService` is the only place workspace authorization is decided; history is written only through `TaskHistoryService.record`, which requires an existing transaction (`Propagation.MANDATORY`), so a change and its audit entry commit or roll back together.

## Authentication

Supabase Auth issues the token; this service verifies it and never issues its own. `SupabaseJwtDecoder` routes by algorithm: ES256/RS256 are verified against the project JWKS (`{SUPABASE_URL}/auth/v1/.well-known/jwks.json`, cached by Nimbus, refetched on unknown `kid`); HS256 is accepted only if `SUPABASE_JWT_SECRET` is set; anything else, including `alg: none`, is rejected. Claims checked: signature, `iss`, `exp`, `aud`, non-empty `sub`, `role = authenticated`. On first request the profile is created in `users` keyed by `supabase_user_id`. See [docs/security/authentication-security.md](../docs/security/authentication-security.md).

## Database migrations

Flyway, `src/main/resources/db/migration`:

| File | Content |
|---|---|
| V1 | `users` (with `supabase_user_id`), `workspaces` |
| V2 | `workspace_members` |
| V3 | `projects`, `tasks` (generated sort columns, soft delete, optimistic-lock version) |
| V4 | `comments`, `task_history` |
| V5 | secondary indexes |

`spring.jpa.hibernate.ddl-auto` is `none`. Never edit an applied migration; add a new one.

## Tests

```bash
./mvnw test      # unit tests: workflow rules, JWT validation, services (Mockito), paging helpers
./mvnw verify    # + integration tests against MySQL 8 in Testcontainers (needs Docker)
```

`*Test` classes run in Surefire; `*IT` classes run in Failsafe.

## Configuration reference

| Property | Env var | Default |
|---|---|---|
| `spring.datasource.url` | `DB_URL` | local MySQL |
| `spring.datasource.username` / `password` | `DB_USERNAME` / `DB_PASSWORD` | `marram` / empty |
| `app.supabase.url` | `SUPABASE_URL` | required |
| `app.supabase.audience` | `SUPABASE_JWT_AUDIENCE` | `authenticated` |
| `app.supabase.jwt-secret` | `SUPABASE_JWT_SECRET` | empty (asymmetric only) |
| `app.supabase.require-verified-email` | `SUPABASE_REQUIRE_VERIFIED_EMAIL` | `true` |
| `app.cors.allowed-origin` | `FRONTEND_ORIGIN` | `http://localhost:5173` |
| `app.time-zone` | `APP_TIME_ZONE` | `UTC` |
