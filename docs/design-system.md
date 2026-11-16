# Design system

## Brand

**Marram**, "Hold the work together." Logo: three grass blades rising from one root point, the tallest in amber (`LogoMark`, `public/favicon.svg`); artwork `GrassArt`. Personality: practical, calm, precise. See [ADR 0001](architecture/decisions/0001-product-name.md).

## Principles

Information density suited to a work tool; one accent (spruce) with restrained status colors; hierarchy from weight, size and position rather than boxes everywhere; every control does something; both themes designed, not inverted.

## Tokens (`frontend/src/index.css`, mapped in `tailwind.config.js`)

### Color: surface hierarchy

| Token | Light | Dark | Role |
|---|---|---|---|
| `bg` | #F6F7F4 | #0D1411 | Page |
| `nav` | #F0F3EE | #0A100D | Sidebar |
| `surface` | #FFFFFF | #141E1A | Cards, inputs |
| `raised` | #FFFFFF | #202E27 | Menus, popovers, drawers (lighter than the page in dark mode so layers read as raised) |
| `sunken` | #EEF1EC | #1B2822 | Hover, subtle fills, tracks |
| `line` | #DAE1D9 | #2A3A33 | Borders, dividers |
| `ink` / `muted` | #14201B / #586860 | #E6EEE9 / #94A69C | Text |
| `primary` / `primary-soft` | #19634F / #E0EEE8 | #46BD96 / #18362C | Actions, selection |
| `accent` | #C98A12 | #ECAC34 | Logo's central blade, art highlight |
| `danger` | #B82C2C | #F07070 | Errors, overdue |
| Status | todo #586860, progress #245CC8, review #7048CD, blocked #B82C2C, done #1C7848 | lightened equivalents | Dots, donut, board |
| Priority | low, medium, high, urgent | lightened equivalents | Bars, chart |

Status and priority are never conveyed by color alone: each has a label or a bar count.

### Contrast (computed, WCAG 2.x)

Minimum ratio of each text color over every surface it is drawn on. All meet AA (4.5:1) for normal text. They were tightened after axe flagged the first set (amber priority text was 2.5:1, status blue and green were below 4.5:1 in light).

| Text token | Light | Dark |
|---|---|---|
| ink | 14.03 | 11.09 |
| muted | 4.93 | 5.11 |
| primary | 5.98 | 5.60 |
| danger | 5.11 | 4.53 |
| s-todo / p-low | 4.93 | 5.11 |
| s-progress / p-medium | 5.11 | 5.06 |
| s-review | 5.02 | 5.01 |
| s-done | 4.59 | 6.29 |
| p-high | 4.94 | 6.56 |

White initials on avatar tones: 5.33 to 7.15. Primary button text: 7.15 (light), 7.92 (dark). The accent amber is used only for graphics and the logo (3:1 non-text rule), never for small text.

### Elevation
`--elev-1` hairline for cards (`shadow-raise`), `--elev-2` for hovered cards and dragged items (`shadow-lift`), `--elev-3` for floating layers (`shadow-pop`). In dark mode shadows are black and stronger; separation also comes from the lighter `raised` surface.

### Stacking
`z-sticky` 20 (top bar), `z-nav` 30, `z-overlay` 40 (menus, mobile nav), `z-modal` 50, `z-toast` 60, `z-tooltip` 70.

### Shape and spacing
Radius 4 / 6 / 8 / 12 px by role (inputs and buttons 6, cards 12, chips full). 4 px spacing grid via Tailwind. Page max width 1320 px, content padding 16/24/32 px by breakpoint.

### Breakpoints
`xs` 390, Tailwind `sm` 640, `md` 768, `lg` 1024 (sidebar appears, board becomes columns), `xl` 1280 (dashboard two-column), `2xl` 1536.

### Typography
Bricolage Grotesque (headings, numbers in KPIs) and Public Sans (UI), both variable and self-hosted. Application screens use 24 to 28 px titles, 14 px body, 11 px uppercase eyebrows with letter-spacing; the landing page uses larger display sizes. Numbers use `tabular-nums`.

### Motion
See [motion-system.md](design/motion-system.md).

## Components (one component per job)

| Group | Components |
|---|---|
| Actions | Button (primary/secondary/ghost/danger, 3 sizes, loading), Menu (keyboard-operable action menu) |
| Forms | TextInput, PasswordInput (show/hide), TextArea, Select |
| Overlays | Modal, ConfirmDialog, Drawer, Tooltip, Toast |
| Navigation | AppShell (collapsible sidebar, workspace switcher, mobile drawer), Tabs (sliding indicator) |
| Data display | KpiCard, AnimatedNumber, StatusBadge, PriorityMark, RoleBadge, Avatar, Pagination, charts (`StatusDonut`, `PriorityBars`, `TrendChart`) |
| Feedback | Skeleton, PageLoader, EmptyState, ErrorState |
| Layout | PageHeader, `.card`, `.card-hover`, `.eyebrow` |

## Theming

`data-theme` on `<html>`; tokens swap, components do not. Toggle on landing, auth, onboarding and app. Persisted in `localStorage` (`marram.theme`), applied before first paint, switched with a short color transition.

## Accessibility

Visible focus ring, labelled controls, `role="alert"` errors, `aria-pressed` toggles, tab roles with arrow-key support, menu roles with arrow keys and Escape, dialog roles with focus return, accessible progress bars, text summaries on charts, a keyboard path for every drag action.

## Assets

No third-party imagery. The logo, frame artwork and product previews are original SVG/React. Fonts: Bricolage Grotesque and Public Sans via `@fontsource-variable/*` (SIL OFL 1.1).
