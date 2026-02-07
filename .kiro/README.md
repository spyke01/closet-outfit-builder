# Kiro Directory

This directory contains Kiro-specific configuration, specifications, and steering documents. It is safe to commit to version control as it contains no secrets or credentials.

## Directory Structure

```
.kiro/
├── specs/              # Feature specifications and implementation plans
│   ├── feature-name/
│   │   ├── requirements.md
│   │   ├── design.md
│   │   └── tasks.md
│   └── ...
├── steering/           # Architecture guidelines and mandatory standards
│   ├── vercel-react-best-practices.md  # CRITICAL: Required patterns
│   ├── product.md
│   ├── tech.md
│   ├── structure.md
│   ├── testing-best-practices.md
│   ├── property-based-testing-patterns.md
│   ├── test-failure-resolution.md
│   └── codebase-maintenance.md
├── .gitignore         # Prevents secrets from being committed
└── README.md          # This file
```

## Purpose

### Specs Directory
Contains feature specifications following the spec-driven development methodology:
- **requirements.md** - User stories and acceptance criteria
- **design.md** - Technical design and architecture decisions
- **tasks.md** - Implementation task list with status tracking

### Steering Directory
Contains mandatory guidelines that shape how we build the application:
- **Architecture patterns** - How to structure code
- **Best practices** - Required coding standards
- **Testing guidelines** - How to write and maintain tests
- **Maintenance rules** - Keeping the codebase clean

## Safety and Security

### ✅ Safe to Commit
- All `.md` files (documentation)
- Specification files
- Steering guides
- Configuration templates (`.example` files)

### ❌ Never Commit (Blocked by .gitignore)
- Environment variables (`.env*`)
- API keys and tokens
- Credentials and secrets
- Private configuration
- User-specific data
- Temporary files

### Protection Mechanisms

1. **`.gitignore`** - Comprehensive rules prevent secrets from being committed
2. **File patterns** - Blocks files with `secret`, `credential`, `password`, `token` in names
3. **Environment files** - All `.env*` files blocked except `.example` files
4. **Review process** - Code reviews check for accidentally committed secrets

## Using Steering Documents

Steering documents are **mandatory guidelines** that must be followed:

### Critical Documents

1. **[Vercel React Best Practices](./steering/vercel-react-best-practices.md)**
   - Direct imports (no barrel imports)
   - Dynamic imports for heavy components
   - Parallel async operations
   - Server Action security
   - Accessibility requirements
   - Type safety (no `any` types)

2. **[Codebase Maintenance](./steering/codebase-maintenance.md)**
   - What to keep vs remove
   - Documentation standards
   - Code organization principles

3. **[Testing Best Practices](./steering/testing-best-practices.md)**
   - Unit testing patterns
   - Property-based testing
   - Test failure resolution

### How to Use

**Before writing code:**
1. Review relevant steering documents
2. Check if patterns exist for your use case
3. Follow established patterns

**During code review:**
1. Verify code follows steering guidelines
2. Check against code review checklist
3. Ensure no anti-patterns introduced

**When updating patterns:**
1. Update steering documents first
2. Communicate changes to team
3. Update existing code gradually

## Spec-Driven Development

### Creating a New Spec

1. Create directory: `.kiro/specs/feature-name/`
2. Write `requirements.md` with user stories
3. Design `design.md` with technical approach
4. Generate `tasks.md` with implementation steps

### Working with Specs

- **Requirements** define WHAT we're building
- **Design** defines HOW we'll build it
- **Tasks** define the step-by-step implementation

### Task Status Tracking

Tasks use markdown checkboxes:
- `[ ]` - Not started
- `[-]` - In progress
- `[x]` - Completed
- `[~]` - Queued

## Best Practices

### Documentation
- Keep steering docs up-to-date
- Update specs as requirements change
- Document architectural decisions
- Remove obsolete specifications

### Security
- Never commit secrets
- Review .gitignore regularly
- Audit for accidentally committed credentials
- Use environment variables for sensitive data

### Maintenance
- Archive completed specs
- Update steering docs when patterns change
- Remove outdated guidelines
- Keep documentation focused and relevant

## Contributing

### Adding Steering Documents

1. Identify a pattern worth documenting
2. Write clear, actionable guidelines
3. Include code examples
4. Add to this README
5. Communicate to team

### Updating Specifications

1. Discuss changes with stakeholders
2. Update requirements first
3. Adjust design if needed
4. Update tasks to reflect changes
5. Communicate impact to team

## Resources

- [Main Documentation](../docs/README.md)
- [Developer Onboarding](../docs/developer-onboarding.md)
- [Code Review Checklist](../docs/code-review-checklist.md)

## Questions?

If you have questions about:
- **Steering documents** - Ask in architecture channel
- **Specifications** - Ask product/feature owner
- **Security concerns** - Report immediately to team lead

---

**Important**: This directory is designed to be committed to version control. The `.gitignore` file ensures no secrets are accidentally committed. If you need to store sensitive information, use environment variables or secure secret management systems.

---

**Last Updated**: February 2026
**Maintained By**: Development Team
