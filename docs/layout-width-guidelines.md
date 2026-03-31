# Layout Width Guidelines

## Purpose
Use page width as a product decision, not a one-off class choice. The right width depends on whether the screen is primarily for reading, editing, or operating a dense workspace.

These rules are based on the repo's current responsive shell patterns and align with Vercel/Next.js priorities:
- keep reading surfaces constrained for scanability
- let task-heavy UIs use available desktop space instead of forcing unnecessary scrolling
- preserve consistent gutters across mobile, tablet, landscape tablet, and desktop

## Width tiers

### `page-shell-content`
- Max content width: `1240px`
- Use for:
  - marketing pages
  - legal pages
  - settings
  - detail pages
  - form flows where the user reads linearly
- Why:
  - keeps text measure comfortable
  - prevents sparse layouts on large screens
  - works well when content is stacked rather than multi-pane

### `page-shell-content page-shell-content--wide`
- Max content width: `1600px`
- Use for:
  - planner screens
  - dashboards with several columns
  - calendar and scheduling views
  - split layouts with a primary workspace plus an inspector, rail, or side panel
  - dense grids where horizontal space directly improves usability
- Why:
  - reduces unnecessary vertical scrolling
  - gives multi-pane task UIs room to breathe
  - keeps a cap so content does not become visually detached on ultrawide monitors

### `page-shell-content page-shell-content--full`
- Width: full viewport minus responsive gutters
- Use sparingly for:
  - canvas-like workspaces
  - drag/drop layout builders
  - maps, media review, or highly visual boards
  - cases where the main surface is not text-led and benefits from nearly all available width
- Requirements:
  - child content should still define local max widths for text-heavy sections
  - do not use this for long-form reading or standard forms

## Responsive rules
- Mobile: width tiers should mostly differ by gutters, not by layout caps. Content should collapse to single-column before width changes matter.
- Tablet: prefer layout shifts first, width expansion second. A cramped multi-pane tablet layout should stack or reprioritize before it tries to stay side-by-side.
- Desktop: use `--wide` when the page has multiple simultaneous tasks competing for horizontal space.
- Ultrawide: do not let everything go edge-to-edge by default. Prefer `--wide` before `--full`.

## Decision rule
Ask these in order:
1. Is the page mainly for reading or filling a single linear form?
   - Use standard width.
2. Does the page show a primary workspace plus a persistent side rail, inspector, or secondary pane?
   - Use wide width.
3. Is the page effectively a canvas where added width directly improves manipulation rather than readability?
   - Consider full width.

## Codebase review

### Implement now
- `app/(app)/calendar/calendar-page-client.tsx`
  - Multi-pane planner with a persistent editor rail.
- `app/(app)/calendar/page.tsx`
  - Error state should match the main calendar shell.
- `app/(app)/calendar/trips/trips-page-client.tsx`
  - Planner layout with create controls, trip list, and detail workspace.
- `app/(app)/calendar/trips/page.tsx`
  - Error state should match the main trip planner shell.

### Strong candidates for future widening
- `components/analytics/analytics-dashboard.tsx`
  - Dense dashboard cards and charts would benefit from more horizontal room.
- `app/(app)/outfits/outfits-page-client.tsx`
  - Grid browsing could use a wider shell if the filter rail and collection density continue to grow.

### Keep standard width
- marketing pages using `1240px`
- auth flows
- legal pages
- settings and sizes flows
- item and outfit detail pages unless they become multi-pane workspaces
