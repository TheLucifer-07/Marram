# QA report

Date of this pass: 15 November 2026. Everything below was executed unless it says otherwise.

## Environment, and what it could and could not do

| Capability | Available | Notes |
|---|---|---|
| Headless Chromium 153 | Yes | Bundled through the `@sparticuz/chromium` npm package; software rendering |
| Real MySQL 8.0.46 | Yes | Installed from the Ubuntu archive; used to verify the migrations |
| JDK 21 (`javac`) | Yes | Used for syntax and cross-file symbol checks only |
| nginx 1.24 | Yes | Ran the real `frontend/nginx.conf` |
| `docker compose` CLI and Docker daemon | Yes, but no image pulls | `compose config` validated; builds impossible (Docker Hub unreachable) |
| Maven Central | **No** | Spring Boot cannot be compiled or tested |
| Supabase, Google OAuth | **No** | No credentials or network access |
| DNS and registrar lookups | **No** | Domain availability cannot be checked |

## Results

| Area | Result |
|---|---|
| Frontend lint | Pass, 0 problems |
| Frontend unit tests | **45 of 45 pass** (6 files) |
| Frontend production build | Pass (main bundle about 270 kB) |
| Browser matrix: 17 scenes x 2 themes x 6 viewports (1440, 1280, 1024, 768, 390, 360 px), final code | **198 captures. 0 axe violations (WCAG 2 A and AA, 2.1 AA, best practice), 0 horizontal-overflow cases, 0 console or page errors** |
| Interaction checks (`qa/interactions.mjs`) | **27 of 27 pass**: skip link, focus indicators, modal/drawer/mobile-nav focus trap, Escape, focus return, tab arrows, keyboard card move, theme persistence and no-flash, reduced motion, target size on mobile, CLS 0.000, long tasks within budget |
| Permission-aware UI as MEMBER, OAuth callback error (`qa/extra.mjs`) | **16 of 16 pass** |
| MySQL migrations V1 to V5 on a real server | Pass. 9 of 9 constraint violations rejected; generated sort columns, cascades and the SQL shape of the dashboard aggregates behave |
| `nginx.conf` against the production bundle | Pass: SPA fallback, immutable asset cache, 404 on missing assets, `/api` proxy, security headers |
| `docker compose config` | Pass; the required-variable guards fail as intended when a value is missing |
| Java source | **0 syntax errors; 0 unresolved references to our own classes** (all remaining `javac` errors are missing third-party dependencies). **Not compiled.** |
| Spring Boot unit tests, integration tests, Maven package | **Not run** |
| Docker image builds, `docker compose up` | **Not run** |
| Real sign-in (email and Google) | **Not run** |
| Frontend against the real backend | **Not run** (the browser pass used fixtures, see below) |

## What the browser pass used

The harness serves the production bundle, seeds a signed-in Supabase session into `localStorage`, stubs Supabase's HTTP endpoints, and answers `/api/v1/**` from `frontend/qa/fixtures.js`, which mirrors the backend DTOs and keeps dashboard numbers consistent with the task data. It validates the UI. It does not validate the backend, token verification or the integration between them.

## Defects found by this pass, and fixed

| Defect | How it was found | Fix |
|---|---|---|
| Amber priority text 2.5:1, status blue and green under 4.5:1 | axe color-contrast | Tokens re-derived and verified (see design-system.md) |
| White initials on amber avatars | axe | Fixed dark avatar tones |
| Finished tasks that had passed their due date read "25 d overdue" | Screenshot review | Finished tasks show a plain date |
| Dashboard left column ended 700 px above the right (dead space) | Screenshot review | Panels rebalanced; Task mix merges status and priority |
| KPI labels wrapped at 1280 px | Screenshot review | Shorter labels |
| On phones, Activity sat above Deadlines and Team | Screenshot review | Responsive panel order; two-up pairs at tablet width |
| Board filters stacked into four full-width rows on phones | Screenshot review | Two-column filter grid |
| Landing sections were invisible in full-page captures | Screenshot review | Harness scrolls to trigger reveals (not a product defect, but confirms content depends on intersection; see limits) |
| Horizontal overflow of 108 and 138 px on the mobile dashboard | Matrix, after a layout change | `min-w-0` on panels |
| Missing `<main>` landmarks, heading order, invalid `aside role=dialog`, duplicate landmarks | axe | Landmarks and roles corrected |
| No focus trap in modals, drawers or mobile nav; no skip link | Keyboard review and interaction run | `useDialogFocus`, skip link |
| Focus lost after a keyboard card move | Interaction run | Focus handed to the moved card |
| Kanban cards re-mounted on every render; KPI count-up re-rendered per frame; progress bars animated width | Animation review | See motion-system.md |
| Duplicate `Cache-Control` header on assets | nginx run | One header |
| Unverified emails could create profiles; avatar URL could be an http tracker | Security review | Verified-email requirement, https-only avatars, unit tests |
| Earlier "Java syntax OK" checks were vacuous (`javac` was not installed) | Discovered while re-checking | Real JDK installed and the check redone |

## Known limits

- **Landing reveal animations** use `whileInView`; content stays hidden until scrolled into view. Anchor links and normal scrolling trigger it. Consider rendering reveal content visible when JavaScript intersection events are unavailable.
- **Rendering performance** was measured with software rendering. Check on real devices.
- **Screen readers** were not used; ARIA roles, names and focus behavior were checked programmatically.
- **Real browsers other than Chromium** (Safari, Firefox) were not tested.
- The fixtures are a stand-in for the API; response shapes were written to match `Dto.java` by hand and could drift.
