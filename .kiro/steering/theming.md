# Theming Implementation Standard

This document defines the required visual implementation patterns for all product UI.

## 1) Source of truth

The active design system is Apple Liquid Glass.

- Tokens live in `app/globals.css`
- Shared shell/surface primitives also live in `app/globals.css`
- If this file conflicts with older specs or migration notes, treat this file and `CLAUDE.md` as the current source of truth

## 2) Theme model

- Dark mode is the default baseline
- Light mode is enabled with `html[data-theme="light"]`
- Do not use class-based dark mode assumptions such as `.dark` or `darkMode: 'class'`
- Avoid route-level background paints that fight the shared shell

Required shell primitives:
- `ambient-background`
- `page-shell`
- `page-shell-content`

## 3) Core tokens

Prefer Liquid Glass tokens directly when styling product UI:

- Surfaces:
  - `--bg-deep`
  - `--bg-base`
  - `--bg-surface`
  - `--bg-surface-hover`
  - `--bg-surface-active`
  - `--bg-input`
- Borders:
  - `--border-subtle`
  - `--border-default`
  - `--border-strong`
  - `--border-focus`
- Text:
  - `--text-1`
  - `--text-2`
  - `--text-3`
- Accents:
  - `--accent`
  - `--accent-muted`
  - `--accent-2`
  - `--accent-2-muted`
  - `--accent-3`
  - `--accent-3-muted`
- Shape/spacing:
  - `--radius-*`
  - `--space-*`
- Blur/shadow:
  - `--blur-glass`
  - `--blur-nav`
  - `--shadow-card`
  - `--shadow-card-hover`
  - `--shadow-nav`
  - `--shadow-focus`

Older semantic aliases like `bg-card`, `bg-background`, and `bg-muted` still exist for compatibility, but they are not enough by themselves to define the intended visual result.

## 4) Surface rules

### App shell
- Let the shared shell provide the page backdrop
- Do not add per-route `bg-background` / `bg-muted` wrappers unless the screen is intentionally different

### Glass surfaces
Use glass for:
- nav bars
- cards
- toolbars
- popovers
- search/filter controls
- modals

Do not use glass blur for:
- dense text blocks
- legal copy containers
- list rows inside a card
- inner content wrappers that create card-within-card layering without purpose

### Navigation
- Full-width glass surface
- `32px` blur with saturation boost
- sticky at top
- no rounded outer corners

### Cards
- Main shell uses `--bg-surface`, subtle border, Liquid Glass blur, and shared card shadow
- Hover lift is `translateY(-3px)` with border/shadow elevation
- Inner card content should usually sit directly inside the shell; avoid unnecessary nested framed panels

## 5) Controls

### Buttons

Use the shared three-tier button hierarchy:

- Primary:
  - gradient accent fill
  - strongest emphasis
- Secondary:
  - bordered glass surface
  - medium emphasis
- Tertiary:
  - transparent at rest
  - reveals on hover

Do not invent one-off button color systems for individual pages.

### Filter tags

Filter bars should use the shared `filter-tag` behavior:
- pill radius
- glass background
- selected state via accent-muted background + accent border/text

Selection can be communicated directly through the highlighted tag state; do not require separate active-chip rows unless the UX truly benefits from them.

### Inputs/selects
- Inputs use the shared glass/input tokens
- Native select chrome needs enough right padding for the caret
- Search fields should keep icons explicitly visible above the input content

## 6) Layout guidance

- Maximum content width: `1240px`
- Prefer `page-shell-content`
- Search + tag bars should not be wrapped in an extra card unless there is a clear grouping reason
- Advanced filter sections should usually read as a lighter sub-section under the main toolbar, not an unrelated nested panel

## 7) Turbopack / generated CSS caveat

If Turbopack strips or rewrites a critical visual rule (for example `backdrop-filter`), use a localized inline-style fallback for the affected property on the component. Do not leave a visual regression in place just because the source CSS looks correct.

## 8) Testing guidance

When tests need UI-style assertions:
- Prefer assertions against shared design-system intent rather than stale palette assumptions
- Good examples:
  - Liquid Glass primitives exist (`glass-nav`, shell classes, explicit style props)
  - buttons follow primary/secondary/tertiary roles
  - tags expose selected state via `aria-pressed`
- Avoid asserting obsolete class recipes like `bg-card border border-border rounded-lg` as if they were the visual spec
