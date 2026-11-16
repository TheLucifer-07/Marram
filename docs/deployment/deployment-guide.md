# Deployment guide

Target: any Linux host with Docker and Docker Compose, a domain and TLS. This guide was **not executed** in the authoring environment (no Docker).

## 1. Prepare

```bash
git clone <your repo> && cd marram
cp .env.example .env
```

Fill `.env` (see the variable table in the root README). Production values:

- `FRONTEND_ORIGIN=https://app.example.com` (exact public origin)
- Strong `MYSQL_PASSWORD` and `MYSQL_ROOT_PASSWORD`
- `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` from your Supabase project
- `APP_TIME_ZONE` for your team, for example `Asia/Kolkata`

Complete [supabase-setup.md](supabase-setup.md) including the production redirect URL `https://app.example.com/auth/callback`.

## 2. Start

```bash
docker compose up -d --build
docker compose ps          # mysql, backend, frontend should be healthy
docker compose logs -f backend
```

Flyway creates the schema on the first backend start. The `mysql-data` volume keeps data across restarts.

## 3. TLS and public access

Put a TLS-terminating reverse proxy (Caddy, Traefik, nginx, a cloud load balancer) in front of the **frontend** container port. In `docker-compose.yml`, remove the backend's `127.0.0.1:8080:8080` port mapping so only the frontend can reach it. The frontend container already proxies `/api` to the backend, so the browser uses one origin and CORS is not involved.

Caddy example:

```
app.example.com {
  reverse_proxy localhost:3000
}
```

## 4. Hardening checklist

- Firewall: expose 80/443 only. MySQL is already unpublished.
- Disable Swagger in production: add `SPRINGDOC_API_DOCS_ENABLED=false` and `SPRINGDOC_SWAGGER_UI_ENABLED=false` to the backend environment.
- Rate-limit `/api` at the proxy.
- Back up the `mysql-data` volume (`mysqldump` on a schedule).
- Monitor `/actuator/health`.
- Plan the Spring Boot upgrade (ADR 0002).

## 5. Updating

```bash
git pull && docker compose up -d --build
```

Migrations run automatically. Never edit an applied migration; add `V6__…`.

## 6. Hosting the pieces separately

Frontend as static files on any static host with `VITE_API_BASE_URL` pointing at the API and an SPA fallback to `index.html`. API as the backend container or `java -jar`. In that layout set `FRONTEND_ORIGIN` to the static site origin (CORS applies).

## 7. Without Docker

```bash
cd backend && ./mvnw -DskipTests package && java -jar target/marram-backend-1.0.0.jar
cd frontend && npm ci && npm run build   # serve dist/ with any static server
```
