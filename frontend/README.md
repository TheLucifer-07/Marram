# Marram frontend

React 19 + Vite 8 + Tailwind CSS 3. JavaScript and JSX only.

## Commands

```bash
npm install
npm run dev       # http://localhost:5173, proxies /api to http://localhost:8080
npm run lint
npm test          # Vitest + React Testing Library
npm run build     # production bundle in dist/
```

## Environment

| Variable | Purpose |
|---|---|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Public `sb_publishable_…` key |
| `VITE_API_BASE_URL` | Optional API origin. Empty = same origin |

Only public values belong here. Vite exposes every `VITE_` variable to the browser.

## Structure

```
src/
├── main.jsx, App.jsx        providers and routes (app pages are lazy-loaded)
├── index.css                design tokens (CSS variables) for light and dark
├── lib/                     supabase client, axios client + Api map, constants, formatting, activity text
├── context/                 ThemeContext, AuthContext, WorkspaceContext
├── hooks.js                 useAsync, useDebounced
├── components/ui/           Button, Field, Modal, Drawer, Menu, Tabs, Tooltip, Toast, Badges, Avatar, AnimatedNumber, States, Pagination
├── components/dashboard/    KpiCard, ProjectHealth, MyWork, TeamPanel, Charts
├── components/marketing/    ProductPreview (landing sample data)
├── lib/motion.js            durations, easing, shared variants
├── components/app/          AppShell, ProtectedRoute, task list/filters/board, form modals
├── pages/                   Landing, Login, Register, AuthCallback, Onboarding, Dashboard, Projects,
│                            ProjectDetail, Tasks, TaskDetails, Members, Settings
└── test/                    Vitest suites
```

## Authentication state

`AuthContext` wraps `supabase-js` (PKCE flow, session persisted by the SDK, auto-refresh). After a session exists it calls `GET /auth/me`, which is where the backend verifies the token and returns the application profile. `ProtectedRoute` handles: not configured, restoring session, signed out (redirect with return path), profile load failure (retry), ready. The Axios client attaches the current access token to every request and retries once on 401 after a refresh, then signs the user out.

Google OAuth and email confirmation both return to `/auth/callback` on the origin currently serving the frontend. The Vercel rewrite keeps React Router callback routes available on production and preview deployments. Add each deployment origin's callback URL to Supabase Authentication → URL Configuration; keep the Supabase Site URL set to the canonical production origin.

## Theme system

All colors are RGB triplets in CSS variables under `:root`/`[data-theme='light']` and `[data-theme='dark']` in `src/index.css`; Tailwind maps names such as `bg-surface` and `text-muted` to them. `ThemeContext` sets `data-theme` on `<html>` and stores the choice in `localStorage`; an inline script in `index.html` applies it before first paint to avoid a flash. Charts use the same variables.

## API integration

Every endpoint is one function in `src/lib/api.js` (`Api.*`). Errors are normalized by `errorMessage()`, which prefers the server's problem `detail` or per-field `errors`. Permission flags (`canEdit`, `canChangeStatus`, `allowedTransitions`) come from the server; the UI hides what it cannot do but the backend is the enforcement point.

## Known limits

- The board loads up to 100 tasks of a project (the API's maximum page size).
- Drag-and-drop is pointer-only; the task page offers the same status changes by keyboard.
