# Authentication and security

## Flow

Email/password: the browser calls Supabase `signUp` / `signInWithPassword`, receives a session, sends the access token to the API. Google: `signInWithOAuth({ provider: 'google' })` redirects through Google and Supabase back to `/auth/callback` (PKCE flow); the SDK exchanges the code, then the app calls `GET /auth/me`.

The backend never trusts the browser for identity or role. Roles come from `workspace_members` on every request.

## Token verification (`SupabaseJwtDecoder`, `SupabaseJwtValidators`)

| Check | How |
|---|---|
| Signature | ES256/RS256 against the project JWKS (`{SUPABASE_URL}/auth/v1/.well-known/jwks.json`), cached, refetched for unknown `kid`. HS256 only if a legacy secret is configured. `alg: none` and unknown algorithms rejected |
| Issuer | `{SUPABASE_URL}/auth/v1` |
| Expiry / not-before | Spring default timestamp validator (60 s skew) |
| Audience | contains `authenticated` |
| Subject | non-blank |
| Role claim | `authenticated` (rejects `anon` tokens) |

Algorithm confusion is prevented: the token header only selects between two pre-configured verifiers; it cannot supply a key.

## Authorization

Single gate: `AccessService`. Outsider → 404, insufficient role → 403 (ADR 0004). Tests walk every route as a stranger.

## Edge cases

| Case | Behavior |
|---|---|
| Expired / invalid token | 401 problem; the client refreshes once, then signs out |
| Deleted or revoked Supabase user | Existing access token works until expiry (stateless JWT, default 1 h); refresh fails, session ends. Shorten expiry in Supabase if needed |
| Duplicate email registration | Supabase obfuscates duplicates; the UI detects the empty-identities response and says so |
| Missing profile | Created on first authenticated call. If the token has no email → 409 with explanation |
| Email owned by another subject | 409, no silent re-linking (prevents takeover through an unverified email) |
| Failed OAuth callback | `/auth/callback` shows the provider's error and a link back |
| Failed session restore / network error | Loader, then a retry screen; sign-out available |
| Unverified email | Profile creation is refused (409) unless `user_metadata.email_verified` is true (`SUPABASE_REQUIRE_VERIFIED_EMAIL`, default on). Otherwise someone could register another person's address and be added to workspaces by email. Requires "Confirm email" on in Supabase. This claim was not live-verified against a real Supabase token |
| Avatar URL from user metadata | Editable by the user, so only `https://` URLs are stored (no tracking pixel over http); images render with `referrerPolicy=no-referrer` |
| Concurrent first requests | Unique key race handled by re-reading |

## Controls

- No password or Supabase secret ever stored or sent by this app. The browser holds only the project URL and the publishable key.
- CORS: single exact origin, only needed methods and headers.
- CSRF disabled deliberately: stateless bearer auth, no cookies.
- Validation on every body; allowlisted sort fields; LIKE wildcards escaped; JPA parameter binding throughout (no string-built SQL).
- Errors never include stack traces; 500 detail is generic.
- Security headers on the API (`nosniff`, frame deny) and in nginx.
- React escapes output; no `dangerouslySetInnerHTML` is used. Avatars use `referrerPolicy="no-referrer"`.
- Optimistic locking prevents lost updates; history writes are transactional.
- Secrets only through environment variables; `.env` is git-ignored.

## Known limits (honest list)

- **Browser token storage.** `supabase-js` keeps the session in browser storage, readable by script. An XSS bug would expose it. Mitigations: React escaping, no HTML injection, short token lifetime. Hardening step: add a CSP and consider a backend-for-frontend with HttpOnly cookies.
- **No rate limiting** in the app. Put the API behind a gateway or reverse proxy limit for production. Supabase rate-limits auth endpoints itself.
- **Swagger UI is public** (it documents, it does not authorize). Disable it in production if you prefer: set `springdoc.api-docs.enabled=false` and `springdoc.swagger-ui.enabled=false`.
- **Member lookup by email** reveals whether an account exists, but only to workspace owners.
- **Legacy HS256 secret** mode is a convenience; Supabase recommends asymmetric signing keys.
- Spring Boot 3.5 no longer gets free patches (ADR 0002).

## Review log (this release)

| Area | Checked | Result |
|---|---|---|
| Profile provisioning | Reviewed how a Supabase token becomes an application user | **Two gaps fixed:** unverified emails could create profiles (now refused by default); `avatar_url` from user-editable metadata could point at an http tracker (now https only). Unit tests added (`CurrentUserServiceTest`) |
| JWT validation | Reviewed `SupabaseJwtDecoder` and validators; unit tests cover expiry, issuer, audience, role, subject, foreign key, `alg:none`, garbage, HS256 rules | Logic reviewed; tests **not executed** (no Maven) |
| Workspace authorization | Reviewed every service path through `AccessService`; integration tests walk every route as a stranger and every role | Reviewed; tests **not executed** (no Maven, no Docker) |
| Database | Applied all five migrations to a real MySQL 8.0 server; inserted rows violating each CHECK, UNIQUE and FOREIGN KEY constraint (9 of 9 rejected); verified generated sort columns, cascade deletes, and the SQL shape of the dashboard aggregates | **Executed and passed.** JPQL-to-SQL translation by Hibernate was not exercised |
| Error handling | Reviewed `GlobalExceptionHandler`, security handlers | Reviewed; not executed |
| Edge: first sign-in race | Unique-key race re-reads the profile | Reviewed; unit test covers the happy path only |
| Deployment edge | `nginx.conf` run for real against the production bundle | Passed: SPA fallback, immutable asset caching (single header after a fix), 404 for missing assets, `/api` proxy, security headers |
