# Documentation Overview

This directory contains essential developer documentation for the My AI Outfit application. All documentation follows our [codebase maintenance guidelines](../.kiro/steering/codebase-maintenance.md).

## Documentation Structure

### Developer Guides

- **[Developer Onboarding](./developer-onboarding.md)** - Start here! Complete guide for new developers
- **[Code Review Checklist](./code-review-checklist.md)** - Required checklist before submitting PRs
- **[Optimization Patterns](./optimization-patterns.md)** - Vercel React best practices implementation guide
- **[CI/CD Workflow](./ci-cd-workflow.md)** - Continuous integration and deployment processes
- **[Performance Monitoring Setup](./performance-monitoring-setup.md)** - Monitoring and metrics configuration

### Steering Guides (Architecture & Standards)

Located in `.kiro/steering/` - these define how we build:

- **[Vercel React Best Practices](../.kiro/steering/vercel-react-best-practices.md)** - MANDATORY patterns for all code
- **[Product Overview](../.kiro/steering/product.md)** - Application purpose and features
- **[Tech Stack](../.kiro/steering/tech.md)** - Technologies and build system
- **[Project Structure](../.kiro/steering/structure.md)** - Directory organization and architecture
- **[Testing Best Practices](../.kiro/steering/testing-best-practices.md)** - Testing guidelines and patterns
- **[Property-Based Testing](../.kiro/steering/property-based-testing-patterns.md)** - PBT patterns and examples
- **[Test Failure Resolution](../.kiro/steering/test-failure-resolution.md)** - Debugging test failures
- **[Codebase Maintenance](../.kiro/steering/codebase-maintenance.md)** - Keeping the codebase clean

## Quick Start

### For New Developers

1. Read [Developer Onboarding](./developer-onboarding.md)
2. Review [Vercel React Best Practices](../.kiro/steering/vercel-react-best-practices.md)
3. Check [Code Review Checklist](./code-review-checklist.md) before your first PR

### For Code Reviews

Use the [Code Review Checklist](./code-review-checklist.md) to ensure:
- ✅ Vercel best practices followed
- ✅ No `any` types
- ✅ Accessibility compliance
- ✅ Bundle size within limits
- ✅ Tests added

### For Performance Work

1. Review [Optimization Patterns](./optimization-patterns.md)
2. Check [Performance Monitoring Setup](./performance-monitoring-setup.md)
3. Follow [Vercel React Best Practices](../.kiro/steering/vercel-react-best-practices.md)

## Documentation Principles

Following our [codebase maintenance guidelines](../.kiro/steering/codebase-maintenance.md):

### ✅ What We Keep
- Developer-facing guides that help with development
- Essential reference documentation
- Troubleshooting guides
- Architecture and standards (in steering)

### ❌ What We Remove
- Implementation summaries from task execution
- Builder-specific examples
- Duplicate documentation
- Temporary task artifacts

## Contributing to Documentation

When adding or updating documentation:

1. **Check for duplicates** - Consolidate rather than create new files
2. **Focus on developers** - Write for people building the application
3. **Keep it current** - Update docs when code changes
4. **Follow structure** - Use the appropriate location:
   - `docs/` - Developer guides and references
   - `.kiro/steering/` - Architecture and mandatory standards
   - `.kiro/specs/` - Feature specifications and tasks

## Documentation Standards

### File Naming
- Use kebab-case: `developer-onboarding.md`
- Be descriptive: `code-review-checklist.md` not `checklist.md`
- Avoid version numbers in names

### Content Structure
- Start with overview/purpose
- Include table of contents for long docs
- Use code examples liberally
- Add troubleshooting sections
- Include last updated date

### Markdown Style
- Use proper heading hierarchy (h1 → h2 → h3)
- Include code language in fenced blocks
- Use tables for comparisons
- Add links to related documentation

## Getting Help

If you can't find what you need:

1. Check the [Developer Onboarding](./developer-onboarding.md) guide
2. Search existing documentation
3. Ask in team chat
4. Create an issue if documentation is missing

---

**Last Updated**: February 2026
**Maintained By**: Development Team
