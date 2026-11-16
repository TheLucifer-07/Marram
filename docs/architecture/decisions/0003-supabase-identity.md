# ADR 0003: Supabase for identity, Spring Boot for authorization

**Decision.** Supabase Auth handles registration, login, Google OAuth and token issuing. Spring Boot verifies tokens locally and owns all authorization from MySQL membership data. No second JWT system, no password column.

**Verification.** Asymmetric signing keys (ES256, RS256) are verified with the project JWKS at `{SUPABASE_URL}/auth/v1/.well-known/jwks.json` (checked against Supabase's JWT documentation). Claims validated: issuer `{SUPABASE_URL}/auth/v1`, expiry, audience `authenticated`, non-empty subject, `role = authenticated`. HS256 is rejected unless the optional legacy secret is configured; Supabase itself recommends migrating legacy projects to asymmetric keys.

**Identity mapping.** `users.supabase_user_id` (unique) is the link. The profile row is created on the first authenticated request from the token's email and `user_metadata` (name, avatar).

**Consequences.** Access tokens stay valid until they expire (Supabase default: one hour) even if the Supabase user is deleted; role changes in MySQL apply immediately. A user deleted and re-created in Supabase gets a new subject and is refused with a conflict if the old profile still holds the email; resolve by deleting or re-linking the old `users` row.
