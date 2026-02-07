# Codebase Maintenance Guidelines

This document provides guidelines for maintaining a clean, production-ready codebase and preventing unnecessary bloat.

## Code Organization Principles

### Avoid Demo Components
- **Never create** components in `lib/examples/` or similar demo directories
- **Focus on production code** - all components should serve the actual application
- **Remove unused components** immediately after refactoring or feature changes
- **Use Storybook or similar tools** for component documentation instead of demo directories
- **Clean up test pages** - remove `app/test-*` directories after development is complete

### Documentation Management
- **Keep summaries as task artifacts** - implementation summaries belong in task documentation, not root-level files
- **Avoid root-level implementation files** like `*_IMPLEMENTATION.md`, `*_SUMMARY.md`
- **Focus on user-facing documentation** - README with consolidated setup and deployment instructions
- **Remove builder-specific references** from all documentation
- **Maintain steering guides** - keep `.kiro/steering/` documentation updated with current architecture
- **Consolidate duplicate documentation** - avoid multiple files covering the same topics

### Component Consolidation
- **Avoid enhanced duplicates** - don't create `Enhanced*`, `Optimized*`, or `Responsive*` versions of existing components
- **Consolidate functionality** into original components instead of creating variants
- **Remove duplicate components** immediately after consolidating features
- **Use composition patterns** instead of creating multiple similar components

### Development Artifacts Cleanup
- **Remove development scripts** that are only used during task execution
- **Clean up build artifacts** like optimization reports and temporary files
- **Remove unused utilities and hooks** that aren't used in production
- **Keep only production-necessary files** in the repository

## File Management Rules

### What to Keep
- **Production components** that are actively used in the application
- **Essential utilities** and hooks used by production code
- **User-facing documentation** that helps with application usage
- **Configuration files** needed for build and deployment
- **Test files** for production code

### What to Remove
- **Demo/example components** not used in production
- **Implementation summary documents** from task execution
- **Duplicate enhanced components** that replicate existing functionality
- **Unused utilities and hooks** not referenced in production
- **Development-only scripts** and build artifacts
- **Builder-specific documentation** and references
- **Duplicate documentation files** that repeat README content

### Regular Maintenance Tasks
1. **Audit unused imports** and remove them
2. **Check for dead code** and eliminate it
3. **Review component usage** and consolidate duplicates
4. **Clean up documentation** to focus on application usage
5. **Remove temporary files** and build artifacts
6. **Update dependencies** and remove unused packages

## Documentation Standards

### Focus Areas
- **Application usage** - how to use and maintain the application
- **Development setup** - getting started with development
- **Deployment instructions** - consolidated in README for simplicity
- **Troubleshooting** - common issues and solutions
- **Architecture overview** - high-level system design in steering guides

### Avoid
- **Builder-specific examples** and implementation details
- **Task execution summaries** and implementation logs
- **Framework-specific showcases** that don't serve users
- **Temporary documentation** created during development tasks
- **Duplicate documentation** that repeats information from README

## Code Quality Guidelines

### Component Development
- **Single responsibility** - each component should have one clear purpose
- **Server vs Client components** - use server components by default, add `'use client'` only when needed
- **Reusable design** - components should be composable and flexible
- **Consistent naming** - follow Next.js and React naming conventions
- **Proper testing** - all production components should have tests
- **Accessibility compliance** - ensure all components are accessible
- **Zod validation** - validate all props and data with Zod schemas

### Performance Considerations
- **Bundle size monitoring** - keep track of bundle size and optimize regularly
- **Unused code elimination** - remove dead code and unused imports
- **Efficient imports** - use tree-shaking friendly import patterns
- **Dynamic imports** - use Next.js dynamic imports for code splitting
- **Server-side optimization** - leverage SSR/ISR for better performance
- **Image optimization** - use Next.js Image component with proper sizing
- **Database optimization** - optimize Supabase queries and use proper indexing

## Enforcement

### Code Review Checklist
- [ ] No demo or example components added
- [ ] No implementation summary files in root directory
- [ ] No duplicate enhanced components
- [ ] All new components are used in production
- [ ] Documentation focuses on application usage
- [ ] No builder-specific references in documentation
- [ ] Unused imports and dead code removed
- [ ] Tests added for new production code

### Automated Checks
- **Linting rules** to catch unused imports and dead code
- **Bundle size monitoring** to prevent bloat
- **Dependency analysis** to identify unused packages
- **Documentation review** to ensure focus on application usage

This document should be referenced during all development work to maintain a clean, focused codebase that serves the application's users rather than accumulating development artifacts.