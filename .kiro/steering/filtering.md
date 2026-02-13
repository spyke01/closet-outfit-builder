# Filtering UX Standard

This document defines required patterns for filter/search interfaces on app pages (for example Wardrobe and Outfits).

## 1) Toolbar structure

Use a two-layer filter model:

1. Primary toolbar (always visible)
- Search input (always visible)
- Quick filters/facets (high-frequency options)
- Context actions when relevant

2. Advanced filters (progressive disclosure)
- Secondary controls behind a toggle button (for example "More Filters")
- Use `aria-expanded` on the toggle button
- Keep advanced controls in a bordered card/surface under the toolbar

## 2) Active filter feedback

When any filter is active:
- Show active-filter chips/tokens near the toolbar
- Each chip must be removable directly
- Provide a single `Clear all` action

Do not require users to reopen advanced controls to understand current filter state.

## 3) URL state contract (Vercel/Next.js style)

Filter state must be reflected in URL query params so it is shareable and bookmarkable.

Rules:
- Read initial state from `useSearchParams()`
- Write updates with `router.replace(...)` and `{ scroll: false }`
- Remove params for default values (do not keep noisy defaults in URL)
- Keep parameter names short and stable (for example `q`, `filter`, `sort`, `tags`, `categories`, `view`, `layout`)

## 4) shadcn-style interaction patterns

Follow shadcn data-table toolbar conventions:
- Compact control groups
- Clear visual selected state for facet buttons (`aria-pressed` where applicable)
- Reset actions only shown when filters are active
- Prefer small, composable controls over one large form

## 5) Accessibility requirements

- Every input/select needs a programmatic label (`label` or `sr-only` label)
- Filter toggle buttons require `aria-label` and `aria-expanded`
- Toggle/facet buttons should expose pressed state via `aria-pressed`
- Interactive chips must be keyboard operable

## 6) Theming requirements

Use semantic tokens only:
- `bg-card`, `bg-background`, `bg-muted`
- `text-foreground`, `text-muted-foreground`
- `border-border`
- `bg-primary`, `text-primary-foreground`
- `focus:ring-ring`

Avoid hardcoded neutral palette classes for filter UI.

## 7) Performance requirements

- Keep filtered result computation in `useMemo`
- Use `startTransition` for non-urgent filter updates where needed
- Avoid redundant renders from unstable dependencies (sync effects should key off stable values, for example `searchParams.toString()`)

## 8) Testing requirements

Tests must verify:
- Search is available without opening advanced filters
- Advanced controls toggle correctly
- Active filters are represented and removable
- `Clear all` resets state
- URL-state sync for key filters where implemented

