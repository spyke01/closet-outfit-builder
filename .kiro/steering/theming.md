# Theming Implementation Standard

This document defines the required color and surface implementation patterns for all app UI.

## 1) Principle: semantic tokens first

Always use semantic Tailwind tokens backed by CSS variables in `app/globals.css`.

Use:
- `bg-background`, `bg-card`, `bg-muted`
- `text-foreground`, `text-muted-foreground`
- `border-border`
- `bg-primary`, `text-primary-foreground`
- `bg-secondary`, `text-secondary-foreground`
- `ring-ring`

Avoid:
- `slate-*`, `stone-*`, `gray-*` for app theming
- hardcoded `bg-white`, `text-white`, `border-gray-*` for primary UI surfaces

## 2) Never combine conflicting background classes

Do not combine multiple base surface classes on the same element.

Invalid:
- `bg-white bg-card`
- `bg-muted bg-card`
- `bg-white bg-background`

Valid:
- `bg-card`
- `bg-background`
- `bg-muted`

## 3) Light/dark handling

Semantic tokens already map light/dark via CSS variables.  
Do not add redundant `dark:*` color overrides unless there is a true, intentional variant that tokens cannot express.

## 4) Component recipes

### App page shell
- Page root: `bg-background text-foreground`
- Section/card: `bg-card border border-border rounded-lg`

### Image wells/placeholders
- Use `bg-muted` (not `bg-card` + `bg-muted` together)

### Buttons
- Primary CTA:
  - `bg-primary text-primary-foreground hover:opacity-90`
- Secondary/neutral:
  - `bg-card border border-border text-foreground hover:bg-muted`
- Inline action link:
  - `text-primary hover:underline`

### Inputs/selects/textarea
- Match this baseline:
  - `bg-background border border-border text-foreground placeholder:text-muted-foreground`
  - `focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring`
  - `rounded-md shadow-sm`

### Alerts/messages
- Success/info in app context:
  - prefer token surfaces (for example `bg-secondary/20 border-secondary/40`)
- Error:
  - `bg-destructive/10 border-destructive/30 text-destructive`

### Top bar and nav
- `bg-card border-b border-border`
- Active nav item:
  - `bg-primary text-primary-foreground`
- Inactive nav item:
  - `text-muted-foreground hover:bg-muted hover:text-foreground`

### Loading/skeleton states
- Fallback nav/skeleton surfaces must use semantic tokens:
  - `bg-card` for bar backgrounds
  - `bg-muted` for pulsing blocks
- This prevents white flashes during route transitions.

### Filter toolbars
- Toolbar container: `bg-card border border-border rounded-lg`
- Search input: semantic input recipe (`bg-card border-border text-foreground focus:ring-ring`)
- Quick filter pills:
  - Selected: `bg-primary text-primary-foreground border-primary`
  - Unselected: `bg-card text-muted-foreground border-border hover:bg-muted`
- Active filter chips:
  - `bg-card border border-border text-foreground`

## 5) Route transition + Suspense rule

Any layout `Suspense` fallback that visually replaces themed UI must use the same semantic token surfaces as the final component.

Required check:
- No fallback should include `bg-white` for app-shell elements.

## 6) AI affordance icon standard

Use one shared icon for AI-specific UI affordances:
- Component: `components/ai-icon.tsx`
- API: `<AIIcon className="w-4 h-4" />`
- Visual meaning: "this action/state is AI-driven"

Use `AIIcon` for:
- AI generation/regeneration CTAs
- AI planning buttons
- AI alerts/messages where the message itself is AI-originated

Do **not** use `AIIcon` for:
- Generic submit/save/update buttons
- Generic cancel/close/back actions
- Non-AI destructive actions (delete/remove)

Implementation rules:
- Keep icon placement consistent: left of label with `inline-flex items-center gap-2`.
- Reuse `AIIcon`; do not introduce alternate AI icons (`Wand2`, custom sparkles, etc.) in product UI.

## 7) Testing rules for theming

When testing themed components:
- Assert semantic classes (`bg-card`, `text-foreground`, `border-border`) where class checks are needed.
- Prefer behavior and accessibility assertions over exact class chains.
- Do not assert legacy palette scale classes (`text-blue-*`, `dark:text-gray-*`, etc.) unless explicitly intentional.

## 8) Migration checklist for touched files

For any modified UI file:
1. Remove hardcoded neutral scale colors.
2. Remove conflicting dual surface classes.
3. Verify form controls use the standard input recipe.
4. Verify buttons use primary/secondary token recipes.
5. Verify skeletons/fallbacks use semantic surfaces.
6. Update tests if they assert obsolete color classes.
7. If adding AI-specific CTA/alert UI, use `AIIcon` and avoid AI icon usage on generic submit/cancel flows.
