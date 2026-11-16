# Motion system

Source: `frontend/src/lib/motion.js`. Motion explains state change, keeps continuity between views and confirms actions. It is never decoration.

## Principles

1. **Transform and opacity only.** No animated width/height/top/left except progress bars (a one-shot width fill) and the sidebar's `grid-template-columns` transition.
2. **Fast for feedback, slower for entrances.** Feedback 80 to 220 ms. Entrances up to 400 ms. Data visuals up to 700 ms, once.
3. **One easing family.** `ease.out = cubic-bezier(0.22, 1, 0.36, 1)` for almost everything; springs only for indicators that follow input.
4. **Never block interaction.** Nothing waits for an animation before it can be clicked or typed into.
5. **Respect the user.** `MotionConfig reducedMotion="user"` (in `main.jsx`) turns off transform animation; `AnimatedNumber` renders the final value immediately; a global `prefers-reduced-motion` rule in `index.css` shortens CSS transitions to ~0.
6. **No layout shift.** Skeletons match final dimensions; entrance motion starts from a small offset, not from zero size.
7. **Do not animate everything.** Lists stagger once on load, not on every refresh.

## Tokens

| Token | Value | Used for |
|---|---|---|
| `duration.instant` | 80 ms | Press feedback |
| `duration.fast` | 140 ms | Menus, tooltips, exits |
| `duration.base` | 220 ms | Modals, page transitions |
| `duration.slow` | 400 ms | Entrance of sections and cards |
| `duration.chart` | 700 ms | Chart draw, number count-up, progress fill |
| `ease.out` | (0.22, 1, 0.36, 1) | Default |
| `transitions.popover` | 140 ms | Menus, tooltips, workspace switcher, onboarding step |
| `transitions.overlay` | 200 ms | Modals |
| `transitions.drawer` | 260 ms | Drawer, mobile navigation |
| `transitions.fill` / `hero` | 600 ms | Progress bars / landing entrance |
| `spring.snappy` | stiffness 520, damping 38 | Nav indicator, tab underline, card reflow |
| CSS `--dur-*`, `--ease-out` | same values | Plain CSS transitions |

## Reusable patterns

| Pattern | Where | How |
|---|---|---|
| `fadeUp` + `stagger()` | Dashboard panels and KPI row, project cards, landing sections | Parent uses `stagger(gap)`, children `variants={fadeUp}` |
| `page` | Route changes in `AppShell` | Keyed `motion.div`, 6 px rise and fade, 220 ms |
| `pop` | Dialog-style surfaces | Scale 0.97 to 1 with a 6 px rise |
| Sliding indicator | Sidebar active item, Tabs | Framer `layoutId` shared element with `spring.snappy` |
| Count-up | KPI values (`AnimatedNumber`) | 700 ms from the previous value, so refreshes animate the change |
| Progress fill | Project health, project cards | One-shot width from 0 on mount, 600 ms |
| Status beam | Landing sample, dashboard | Static on landing; segments sized by data |
| Chart draw | Recharts `animationDuration` 600 to 800 ms | Once on mount |
| Overlays | Modal, Drawer, Menu, Tooltip, Toast | Fade plus small scale/translate; drawers slide 260 ms |
| Sidebar collapse | `AppShell` | Grid column width transition 300 ms; labels removed, tooltips appear |
| Mobile nav | `AppShell` | 240 ms slide-in with scrim |
| Button press | `Button` | `active:scale-[0.97]`, 150 ms |
| Card hover | `.card-hover` | Border tint and elevation, 200 ms |
| Kanban | `KanbanBoard` | Cards use `layout="position"` spring when they change column; dragged card fades to 40%; legal drop target tints primary with a "Drop to move here" slot; illegal target tints red with "This move is not allowed"; completing a task pulses the card once (700 ms) |
| Theme switch | `ThemeContext` | `html.theme-anim` adds 260 ms color transitions for 320 ms after a deliberate toggle only. An inline script sets `data-theme` before first paint, so there is no flash |

## Do and do not

- Do reuse these variants. Do not add a one-off duration to a component.
- Do not animate list items on every data refresh.
- Do not animate `box-shadow` on large lists (hover elevation is limited to single cards).
- Do keep keyboard focus visible during and after transitions; dialogs return focus to their trigger.

## Review log (this release)

Every animation was reviewed for performance, consistency, accessibility and reduced motion.

| Finding | Fix |
|---|---|
| KPI count-up re-rendered React on every frame (about 42 renders per card) | `AnimatedNumber` now writes to the text node directly; zero React renders during the count |
| Progress bars animated `width` (layout property) | Now `scaleX` from the left edge (transform only) |
| Kanban card component was declared inside the board's render, so every card re-mounted on each render, defeating layout animation and costing performance | Cards are rendered by a function with stable keys; `layout` is enabled only while a move is in flight, so idle boards do no layout measurement |
| Timings were ad-hoc numbers in a dozen components | Consolidated into named `transitions` and `spring` tokens in `lib/motion.js`; the only remaining one-off is the per-card stagger delay in the landing preview |
| After a keyboard card move, focus was lost (the card re-mounts in its new column) | Focus is handed to the moved card's menu button |
| Dialogs, drawers and the mobile nav did not trap focus | `useDialogFocus`: focus in on open, Tab and Shift+Tab contained, Escape closes, focus returns to the opener |

Accepted trade-offs: the sidebar collapse animates `grid-template-columns` (a layout property) for 300 ms, once per user action; recharts draws its own SVG animation (600 to 800 ms, once).

## Verification status

Measured in headless Chromium 153 with software rendering (`frontend/qa/`):

- Reduced motion (`prefers-reduced-motion: reduce`): KPI numbers show their final values on first paint and no element is mid-transform after load. Checked by `qa/interactions.mjs`.
- Stored dark theme is applied before first paint (no flash). Checked.
- Dashboard cumulative layout shift 0.000; long tasks (over 50 ms) within the budget set in the script.
- Focus, trap, Escape and focus-return behavior for modal, drawer, mobile nav and menus; keyboard card move end to end; tab arrow keys. All pass.

Not measured: real-device frame rates, GPU-accelerated rendering, or screen readers announcing live changes. Software rendering slows chart animation, so absolute timings are not representative; check on real hardware.
