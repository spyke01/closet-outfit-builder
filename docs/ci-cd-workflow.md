# CI/CD Workflow Documentation

This document describes the continuous integration and deployment workflows for the My AI Outfit application, including automated quality checks, performance monitoring, and deployment processes.

## Table of Contents

1. [Overview](#overview)
2. [Workflow Jobs](#workflow-jobs)
3. [Performance Checks](#performance-checks)
4. [Quality Gates](#quality-gates)
5. [Local Development](#local-development)
6. [Troubleshooting](#troubleshooting)

---

## Overview

Our CI/CD pipeline ensures code quality, performance, and accessibility standards are maintained through automated checks on every pull request and push to main branches.

### Workflow Triggers

All workflows run on:
- **Push** to `main` or `develop` branches
- **Pull requests** targeting `main` or `develop` branches

### Workflow Files

- `.github/workflows/quality-checks.yml` - Main quality assurance workflow
- `.github/workflows/bundle-analysis.yml` - Bundle size monitoring
- `.github/workflows/typescript-check.yml` - TypeScript error tracking

---

## Workflow Jobs

### 1. Linting

**Purpose**: Ensure code follows style guidelines and best practices

**Checks**:
- ESLint for code quality
- Accessibility linting (jsx-a11y)

**Commands**:
```bash
npm run lint
npm run lint:a11y
```

**Failure Conditions**:
- ESLint errors
- Accessibility violations

### 2. Tests

**Purpose**: Verify functionality and prevent regressions

**Checks**:
- Unit tests
- Integration tests
- Accessibility tests (jest-axe)
- Code coverage

**Commands**:
```bash
npm run test:run
npm run test:a11y
npm run test:coverage
```

**Failure Conditions**:
- Any test failures
- Coverage below threshold (if configured)

### 3. Build

**Purpose**: Ensure application builds successfully

**Checks**:
- Next.js production build
- TypeScript compilation
- Asset optimization

**Commands**:
```bash
npm run build
```

**Failure Conditions**:
- Build errors
- TypeScript errors
- Missing environment variables

### 4. Performance

**Purpose**: Monitor bundle size and TypeScript quality

**Checks**:
- Bundle size analysis
- Bundle size trends
- TypeScript error monitoring
- `any` type detection

**Commands**:
```bash
npm run build:analyze
node scripts/bundle-analysis-ci.js
npm run typecheck:monitor
```

**Failure Conditions**:
- Bundle size exceeds limits
- New `any` types introduced
- TypeScript errors increase

**Artifacts**:
- `bundle-stats.json` - Current bundle statistics
- `.bundle-trends/` - Historical bundle data
- `.typescript-trends/` - Historical TypeScript data
- `docs/bundle-size-validation.md` - Bundle analysis report
- `docs/typescript-errors.md` - TypeScript error report

### 5. Accessibility

**Purpose**: Ensure WCAG 2.1 AA compliance

**Checks**:
- Keyboard navigation tests
- Lighthouse accessibility audit
- Core Web Vitals

**Commands**:
```bash
npm run test:keyboard
npx lighthouse-ci
```

**Failure Conditions**:
- Accessibility score < 95%
- Keyboard navigation failures
- Core Web Vitals below thresholds

**Lighthouse Thresholds**:
- Performance: ≥ 85%
- Accessibility: ≥ 95%
- Best Practices: ≥ 90%
- SEO: ≥ 90%
- FCP: ≤ 2000ms
- LCP: ≤ 2500ms
- CLS: ≤ 0.1
- TBT: ≤ 300ms

### 6. Security

**Purpose**: Identify security vulnerabilities

**Checks**:
- npm audit
- Dependency vulnerability scanning

**Commands**:
```bash
npm audit --audit-level=moderate
```

**Failure Conditions**:
- High or critical vulnerabilities
- Known security issues in dependencies

### 7. Summary

**Purpose**: Aggregate results and provide overall status

**Output**:
- Summary of all check results
- Pass/fail status for each job
- Overall workflow status

---

## Performance Checks

### Bundle Size Monitoring

**Configuration**: `.bundle-size-limits.json`

```json
{
  "limits": {
    "totalSize": 512000,
    "firstLoadJS": 204800,
    "chunks": {
      "main": 102400,
      "framework": 153600
    }
  }
}
```

**Monitoring**:
- Tracks bundle size over time
- Compares against baseline
- Alerts on size increases
- Generates trend reports

**Reports**:
- Current vs baseline comparison
- Size breakdown by chunk
- Recommendations for optimization
- Historical trends

### TypeScript Error Monitoring

**Tracking**:
- Total error count
- `any` type usage
- Error trends over time
- New errors introduced

**Reports**:
- Error count by category
- Files with most errors
- Trend analysis
- Improvement recommendations

### Core Web Vitals

**Metrics Tracked**:
- **LCP** (Largest Contentful Paint): ≤ 2.5s
- **FID** (First Input Delay): ≤ 100ms
- **CLS** (Cumulative Layout Shift): ≤ 0.1
- **FCP** (First Contentful Paint): ≤ 2.0s
- **TTFB** (Time to First Byte): ≤ 600ms

**Monitoring**:
- Real-time tracking in production
- Lighthouse CI in pull requests
- Historical trend analysis

---

## Quality Gates

### Pull Request Requirements

Before a PR can be merged, all of the following must pass:

#### Required Checks
- ✅ Linting passes
- ✅ All tests pass
- ✅ Build succeeds
- ✅ Bundle size within limits
- ✅ No new TypeScript errors
- ✅ Accessibility score ≥ 95%
- ✅ No high/critical security vulnerabilities

#### Recommended Checks
- Code review approved
- Documentation updated
- Performance impact documented
- Breaking changes noted

### Automated PR Comments

The CI/CD pipeline automatically comments on PRs with:

1. **Performance Summary**
   - Bundle size changes
   - TypeScript error changes
   - Recommendations

2. **Bundle Size Analysis**
   - Total size comparison
   - Chunk-by-chunk breakdown
   - Trend analysis
   - Optimization suggestions

3. **TypeScript Report**
   - Error count changes
   - New `any` types
   - Files affected
   - Improvement suggestions

4. **Lighthouse Results**
   - Performance score
   - Accessibility score
   - Best practices score
   - Core Web Vitals

---

## Local Development

### Running Checks Locally

Before pushing code, run these checks locally:

```bash
# Type checking
npm run typecheck

# Linting
npm run lint
npm run lint:a11y

# Tests
npm run test:run
npm run test:a11y

# Build
npm run build

# Bundle analysis
npm run build:analyze
npm run analyze:ci

# TypeScript monitoring
npm run typecheck:monitor
```

### Pre-commit Hooks

Set up Git hooks to run checks automatically:

```bash
npm run audit:setup-hooks
```

This configures:
- Pre-commit: Linting and type checking
- Pre-push: Tests and build

### Local Performance Monitoring

```bash
# Analyze bundle size
npm run analyze:bundle

# Monitor TypeScript errors
npm run typecheck:monitor

# Check trends
npm run analyze:trends
```

---

## Troubleshooting

### Common Issues

#### Bundle Size Limit Exceeded

**Problem**: Bundle size exceeds configured limits

**Solutions**:
1. Check what changed:
   ```bash
   npm run analyze:bundle
   ```

2. Optimize imports:
   ```typescript
   // Use direct imports
   import Check from 'lucide-react/dist/esm/icons/check'
   ```

3. Add dynamic imports:
   ```typescript
   const Heavy = dynamic(() => import('./heavy-component'))
   ```

4. Review dependencies:
   ```bash
   npx webpack-bundle-analyzer .next/analyze/client.json
   ```

#### TypeScript Errors Increased

**Problem**: New TypeScript errors or `any` types introduced

**Solutions**:
1. Check error report:
   ```bash
   npm run typecheck:monitor
   ```

2. Fix `any` types:
   ```typescript
   // Replace any with proper types
   function process(data: unknown) {
     const validated = schema.parse(data)
     // ...
   }
   ```

3. Add type definitions:
   ```typescript
   interface Props {
     name: string
     age: number
   }
   ```

#### Accessibility Failures

**Problem**: Accessibility score below threshold

**Solutions**:
1. Run local tests:
   ```bash
   npm run test:a11y
   npm run test:keyboard
   ```

2. Check violations:
   ```typescript
   const { container } = render(<Component />)
   const results = await axe(container)
   console.log(results.violations)
   ```

3. Fix common issues:
   - Add ARIA labels
   - Use semantic HTML
   - Implement keyboard navigation
   - Add focus styles

#### Build Failures

**Problem**: Build fails in CI but works locally

**Solutions**:
1. Check environment variables:
   ```bash
   npm run verify:env
   ```

2. Clear cache and rebuild:
   ```bash
   rm -rf .next node_modules
   npm install
   npm run build
   ```

3. Check Node version:
   ```bash
   node --version  # Should be ≥20.0.0
   ```

#### Test Failures

**Problem**: Tests pass locally but fail in CI

**Solutions**:
1. Run tests in CI mode:
   ```bash
   CI=true npm run test:run
   ```

2. Check for timing issues:
   ```typescript
   // Add proper waits
   await waitFor(() => {
     expect(element).toBeInTheDocument()
   })
   ```

3. Check for environment dependencies:
   ```typescript
   // Mock browser APIs
   vi.stubGlobal('localStorage', mockLocalStorage)
   ```

### Getting Help

If you encounter issues not covered here:

1. Check workflow logs in GitHub Actions
2. Review artifact reports
3. Search existing issues
4. Ask in team chat
5. Create a detailed issue report

---

## Continuous Improvement

### Monitoring Trends

Track performance over time:

```bash
# View bundle size trends
npm run analyze:trends

# View TypeScript error trends
npm run typecheck:monitor

# View audit trends
npm run audit:trends
```

### Updating Thresholds

As the application improves, update thresholds:

1. **Bundle Size**: `.bundle-size-limits.json`
2. **Lighthouse**: `.lighthouserc.json`
3. **Coverage**: `vitest.config.ts`

### Adding New Checks

To add new quality checks:

1. Add script to `package.json`
2. Add job to `.github/workflows/quality-checks.yml`
3. Update this documentation
4. Notify team of new requirements

---

## Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Lighthouse CI](https://github.com/GoogleChrome/lighthouse-ci)
- [Bundle Analysis Guide](./optimization-patterns.md#bundle-size-optimization)
- [Code Review Checklist](./code-review-checklist.md)
- [Performance Monitoring Setup](./performance-monitoring-setup.md)

---

*Last Updated: February 2026*
*Version: 1.0.0*
