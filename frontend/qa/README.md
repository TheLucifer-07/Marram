# Browser QA harness

Developer tooling, not part of the shipped app. It drives a real headless Chromium against the **production build** to check every page in both themes at six viewports, plus keyboard, focus, reduced-motion and performance behavior.

## What it fakes, and what it does not

- **Supabase:** a signed-in session is seeded into `localStorage` and Supabase's HTTP endpoints are stubbed. This does not exercise real sign-in or Google OAuth.
- **API:** requests to `/api/v1/**` are answered from `qa/fixtures.js`, which mirrors the backend DTOs and keeps the dashboard numbers consistent with the task data (including stateful status moves). This verifies the **UI**, not the Spring backend. The fixtures are never imported by the app.

## Run

```bash
cd frontend
npm ci
npm i --no-save @sparticuz/chromium playwright-core axe-core   # QA-only deps, not saved to package.json

npm run qa -- --viewports=desktop,mobile --themes=light,dark   # screenshots + overflow + console + axe, into qa/shots
npm run qa:interactions                                          # keyboard / focus / theme / reduced motion / CLS
sh qa/run-all.sh                                                 # the full 6-viewport matrix (about 25 minutes)
```

Viewports: desktop 1440, laptop 1280, tablet-l 1024, tablet 768, mobile 390, mobile-s 360. `--only=dashboard,tasks` narrows scenes. `python3 qa/sheet.py out.png 400 3 a.png b.png ...` builds a contact sheet.

Notes: the bundled Chromium is single-process, so the scripts start a fresh browser per group. Software rendering makes chart animation slow; the harness waits longer on chart pages. Performance numbers are relative signals, not budgets.
