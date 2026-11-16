# Supabase and Google OAuth setup

Dashboard labels change over time. If a menu name differs, check the current Supabase docs for Auth providers and redirect URLs.

## 1. Create the project

1. supabase.com → New project. Note the **Project URL** (`https://<ref>.supabase.co`).
2. Project Settings → API Keys: copy the **publishable key** (`sb_publishable_…`). Do not use the secret or `service_role` key anywhere in this app.
3. Project Settings → JWT Keys: make sure the project uses an **asymmetric signing key** (ECC P-256 or RSA). The JWKS URL `https://<ref>.supabase.co/auth/v1/.well-known/jwks.json` must return at least one key. If it returns none you are on the legacy secret: migrate, or set `SUPABASE_JWT_SECRET` as a fallback.

## 2. Email and password

Authentication → Sign In / Providers → Email: enabled. Turn **Confirm email** on. The backend refuses to create a profile for an unverified email (`SUPABASE_REQUIRE_VERIFIED_EMAIL=true`), so with confirmation off new email/password users would be rejected until you set that variable to `false`, which also reopens the risk of someone registering another person's address. Built-in email sending is rate-limited; configure custom SMTP for real use.

## 3. Redirect URLs

Authentication → URL Configuration:
- **Site URL**: your production URL (for local work, `http://localhost:5173`).
- **Redirect URLs** (allow list), add each:
  - `http://localhost:5173/auth/callback`
  - `http://localhost:3000/auth/callback` (Docker Compose)
  - `https://YOUR-DOMAIN/auth/callback`

## 4. Google OAuth

1. Google Cloud Console → create or select a project.
2. APIs & Services → OAuth consent screen: user type External; app name, support email; scopes `openid`, `email`, `profile`. While in Testing, add your Google accounts as test users.
3. APIs & Services → Credentials → Create credentials → OAuth client ID → **Web application**.
   - Authorized JavaScript origins: `http://localhost:5173`, `http://localhost:3000`, `https://YOUR-DOMAIN`.
   - Authorized redirect URI: `https://<ref>.supabase.co/auth/v1/callback` (this is Supabase's callback, not the app's).
4. Copy the **Client ID** and **Client secret**.
5. Supabase → Authentication → Sign In / Providers → Google: enable, paste both, save.

## 5. Test Google login

Run the app, click **Continue with Google**, choose an account. Expected: redirect to `/auth/callback`, then `/app` (or onboarding for a new user). If you land on the login page with an error, check: redirect URL in Supabase allow list, the Google redirect URI exactly equals the Supabase callback, test-user list while the consent screen is in Testing.

## 6. Production notes

Set the Site URL to the production domain, add production origins to Google, use custom SMTP, keep the publishable key in the frontend build only.
