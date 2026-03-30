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
- Advanced controls may be a lighter section under the toolbar instead of a full card

## 2) Active filter feedback

Selected quick tags/facets should usually communicate state directly through their highlighted appearance.

Rules:
- Use `aria-pressed` for toggle-style quick filters
- Highlight the selected state in place instead of requiring a separate active-chip row
- `Clear all` is optional and should appear only when it improves the workflow
- Do not force a second summary row if the selected tags are already obvious in the primary toolbar

## 3) URL state contract (Vercel/Next.js style)

Filter state must be reflected in URL query params so it is shareable and bookmarkable.

Rules:
- Read initial state from `useSearchParams()`
- Write updates with `router.replace(...)` and `{ scroll: false }`
- Remove params for default values (do not keep noisy defaults in URL)
- Keep parameter names short and stable (for example `q`, `filter`, `sort`, `tags`, `categories`, `view`, `layout`)

## 4) Interaction patterns

Follow the product's Liquid Glass toolbar conventions:
- Compact control groups
- Clear visual selected state for facet buttons (`aria-pressed` where applicable)
- Search and quick tags should share one row on desktop when space allows
- Prefer small, composable controls over one large form

## 5) Accessibility requirements

- Every input/select needs a programmatic label (`label` or `sr-only` label)
- Filter toggle buttons require `aria-label` and `aria-expanded`
- Toggle/facet buttons should expose pressed state via `aria-pressed`
- Interactive chips must be keyboard operable

## 6) Theming requirements

Use the Liquid Glass filter treatment:
- Search inputs use the shared input/search tokens and keep the icon explicitly visible
- Quick filters use the `filter-tag` styling:
  - `padding: 7px 14px`
  - pill radius
  - glass background
  - subtle border at rest
  - accent-muted selected state with accent border/text
- Avoid hardcoded neutral palette classes for filter UI

## 7) Performance requirements

- Keep filtered result computation in `useMemo`
- Use `startTransition` for non-urgent filter updates where needed
- Avoid redundant renders from unstable dependencies (sync effects should key off stable values, for example `searchParams.toString()`)

## 8) Testing requirements

Tests must verify:
- Search is available without opening advanced filters
- Advanced controls toggle correctly
- Selected quick filters expose clear pressed/selected state
- `Clear all` behavior only when that control exists on the page
- URL-state sync for key filters where implemented
