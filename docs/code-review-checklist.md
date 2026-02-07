# Code Review Checklist

This checklist ensures all code changes follow Vercel React best practices and maintain high quality standards. Use this during code reviews and before merging pull requests.

## General Code Quality

### TypeScript
- [ ] No `any` types used (use proper types or `unknown` with type guards)
- [ ] All function parameters have explicit types
- [ ] All function return types are explicit
- [ ] Zod schemas used for runtime validation
- [ ] No TypeScript errors or warnings
- [ ] Proper use of generics where applicable

### Code Organization
- [ ] Components follow single responsibility principle
- [ ] Business logic extracted to hooks or utilities
- [ ] No duplicate code (DRY principle)
- [ ] Proper file naming conventions followed
- [ ] Imports organized (external, internal, relative)
- [ ] No unused imports or variables

## Performance

### Bundle Size
- [ ] Icons imported directly (not barrel imports)
- [ ] Heavy components (>50KB) use dynamic imports
- [ ] Third-party libraries deferred when non-critical
- [ ] No unnecessary dependencies added
- [ ] Tree-shaking friendly import patterns used
- [ ] Bundle size impact checked and documented

### Data Fetching
- [ ] Independent async operations parallelized with `Promise.all()`
- [ ] Early return optimization applied where applicable
- [ ] Strategic Suspense boundaries added
- [ ] React.cache() used for per-request deduplication
- [ ] LRU cache considered for cross-request caching
- [ ] No waterfall patterns introduced

### Server Components
- [ ] Server Actions have authentication checks
- [ ] Minimal data serialization across RSC boundaries
- [ ] Server Components used by default (client components only when needed)
- [ ] `'use client'` directive only where necessary
- [ ] No sensitive data exposed in client components

### Client-Side Performance
- [ ] SWR used for data fetching (not useEffect)
- [ ] Event listeners use `{ passive: true }` where applicable
- [ ] Event listeners properly cleaned up
- [ ] Functional setState used to prevent stale closures
- [ ] Expensive computations memoized with useMemo
- [ ] Callbacks memoized with useCallback
- [ ] React transitions used for non-urgent updates

### Rendering
- [ ] Static JSX hoisted outside components
- [ ] SVG animations use wrapper div for hardware acceleration
- [ ] Content-visibility used for long lists (>50 items)
- [ ] Conditional rendering uses explicit ternary (not &&)
- [ ] No hydration mismatches
- [ ] Images have explicit width/height to prevent CLS

### JavaScript Performance
- [ ] Index Maps used for repeated lookups (not array.find)
- [ ] RegExp hoisted or memoized
- [ ] Immutable array operations (toSorted, toReversed)
- [ ] Early returns implemented where possible
- [ ] Function results cached when appropriate
- [ ] DOM operations batched to avoid layout thrashing

## Accessibility

### Semantic HTML
- [ ] Proper HTML elements used (`<button>`, `<a>`, `<label>`)
- [ ] No `<div onClick>` for interactive elements
- [ ] Heading hierarchy maintained (h1-h6)
- [ ] Form elements properly associated with labels
- [ ] Links use `<Link>` component for navigation

### ARIA
- [ ] Icon-only buttons have `aria-label`
- [ ] Decorative icons have `aria-hidden="true"`
- [ ] Live regions use `aria-live="polite"` or `"assertive"`
- [ ] Form errors have `aria-invalid` and `aria-describedby`
- [ ] Modals have `role="dialog"` and `aria-modal="true"`
- [ ] Custom interactive elements have proper ARIA roles

### Keyboard Navigation
- [ ] All interactive elements keyboard accessible
- [ ] Tab order logical and intuitive
- [ ] Focus traps implemented for modals
- [ ] Keyboard shortcuts documented
- [ ] `onKeyDown`/`onKeyUp` handlers for custom interactions
- [ ] Skip links provided for main content

### Focus Management
- [ ] `:focus-visible` used instead of `:focus`
- [ ] No `outline-none` without replacement
- [ ] Focus styles clearly visible
- [ ] `focus-within` used for grouped controls
- [ ] Focus restored after modal close

### Forms
- [ ] Labels have `htmlFor` attribute
- [ ] Proper input types used (email, tel, url, number)
- [ ] Autocomplete attributes added
- [ ] `inputMode` set for mobile keyboards
- [ ] Spellcheck disabled for emails/codes/usernames
- [ ] Errors shown inline with proper ARIA
- [ ] Submit button enabled until request starts
- [ ] Paste operations not blocked

### Motion & Animation
- [ ] `prefers-reduced-motion` respected
- [ ] Only `transform` and `opacity` animated
- [ ] No `transition: all` used
- [ ] Animations interruptible
- [ ] Proper `transform-origin` set

### Images
- [ ] All images have appropriate alt text
- [ ] Decorative images have `alt=""`
- [ ] Images have explicit width/height
- [ ] `loading="lazy"` for below-fold images
- [ ] `priority` or `fetchpriority="high"` for critical images

## Testing

### Test Coverage
- [ ] Unit tests added for new functions
- [ ] Component tests added for new components
- [ ] Integration tests for complex workflows
- [ ] Property-based tests for universal properties
- [ ] Edge cases covered
- [ ] Error scenarios tested

### Test Quality
- [ ] Tests are deterministic (no flaky tests)
- [ ] Tests use realistic data
- [ ] Mocks are minimal and necessary
- [ ] Tests focus on behavior, not implementation
- [ ] Test names clearly describe what's tested
- [ ] Accessibility tests included (jest-axe)

### Performance Tests
- [ ] Bundle size limits checked
- [ ] Performance regression tests added
- [ ] Core Web Vitals monitored
- [ ] No performance degradation introduced

## Security

### Authentication & Authorization
- [ ] Server Actions validate authentication
- [ ] Authorization checks performed
- [ ] User can only access own data
- [ ] No sensitive data in client components
- [ ] API keys not exposed to client

### Input Validation
- [ ] All inputs validated with Zod schemas
- [ ] SQL injection prevented (using ORM)
- [ ] XSS prevented (React escaping + CSP)
- [ ] CSRF protection in place
- [ ] Rate limiting considered

### Data Privacy
- [ ] PII properly handled
- [ ] Data encrypted in transit (HTTPS)
- [ ] Sensitive data not logged
- [ ] User consent obtained where required

## Documentation

### Code Documentation
- [ ] Complex logic has explanatory comments
- [ ] Public APIs documented with JSDoc
- [ ] Type definitions exported and documented
- [ ] README updated if needed
- [ ] Breaking changes documented

### Change Documentation
- [ ] PR description explains what and why
- [ ] Related issues linked
- [ ] Screenshots/videos for UI changes
- [ ] Migration guide for breaking changes
- [ ] Performance impact documented

## Git & CI/CD

### Commits
- [ ] Commit messages follow convention
- [ ] Commits are atomic and focused
- [ ] No sensitive data in commits
- [ ] No large files committed

### CI/CD
- [ ] All tests pass
- [ ] Linting passes
- [ ] Type checking passes
- [ ] Build succeeds
- [ ] Bundle size within limits
- [ ] No new accessibility violations

## Mobile & Responsive

### Responsive Design
- [ ] Mobile-first approach used
- [ ] Breakpoints tested (mobile, tablet, desktop)
- [ ] Touch targets minimum 44px
- [ ] Horizontal scroll handled properly
- [ ] Safe area insets respected

### Touch Interactions
- [ ] `touch-action: manipulation` used
- [ ] Touch events have `{ passive: true }`
- [ ] Gestures work on touch devices
- [ ] No hover-only interactions

## Browser Compatibility

- [ ] Tested in Chrome/Edge
- [ ] Tested in Firefox
- [ ] Tested in Safari
- [ ] Polyfills added if needed
- [ ] Feature detection used for new APIs

## Deployment

### Pre-Deployment
- [ ] Environment variables configured
- [ ] Database migrations ready
- [ ] Feature flags configured
- [ ] Monitoring alerts set up
- [ ] Rollback plan documented

### Post-Deployment
- [ ] Smoke tests pass
- [ ] Core Web Vitals monitored
- [ ] Error rates monitored
- [ ] User feedback collected

---

## Quick Reference

### Must-Have Before Merge
1. ✅ All tests pass
2. ✅ No TypeScript errors
3. ✅ No accessibility violations
4. ✅ Bundle size within limits
5. ✅ Code reviewed by at least one person
6. ✅ Documentation updated

### Nice-to-Have
- Performance benchmarks run
- Accessibility manually tested
- Cross-browser testing completed
- Mobile devices tested
- Load testing performed

---

## Review Process

### For Reviewers
1. **First Pass**: Check general code quality and structure
2. **Second Pass**: Verify performance and accessibility
3. **Third Pass**: Test functionality manually
4. **Final Pass**: Check documentation and tests

### For Authors
1. **Self-Review**: Go through this checklist before requesting review
2. **Address Feedback**: Respond to all review comments
3. **Update Tests**: Add tests for any bugs found in review
4. **Update Docs**: Keep documentation in sync with code

---

## Automated Checks

These checks run automatically in CI/CD:

```bash
# Type checking
npm run type-check

# Linting
npm run lint
npm run lint:a11y

# Testing
npm run test:run
npm run test:a11y
npm run test:coverage

# Bundle analysis
npm run build
node scripts/bundle-analysis-ci.js

# Performance monitoring
node scripts/typescript-error-monitor.js
```

---

## Resources

- [Optimization Patterns Guide](./optimization-patterns.md)
- [Performance Monitoring Setup](./performance-monitoring-setup.md)
- [Vercel React Best Practices](https://vercel.com/blog/react-best-practices)
- [Next.js Documentation](https://nextjs.org/docs)
- [WCAG Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)

---

*Last Updated: February 2026*
*Version: 1.0.0*
