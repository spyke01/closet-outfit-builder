# Performance Monitoring Setup

This document describes the comprehensive performance monitoring system implemented for the My AI Outfit application.

## Overview

The monitoring system tracks three key areas:
1. **Core Web Vitals** - Real-time performance metrics from users
2. **Bundle Size** - Automated tracking of JavaScript/CSS bundle sizes
3. **TypeScript Errors** - Continuous monitoring of type safety

## Core Web Vitals Tracking

### Implementation

Located in `lib/monitoring/web-vitals.ts`, the system tracks:
- **LCP** (Largest Contentful Paint) - Loading performance
- **FID** (First Input Delay) - Interactivity
- **CLS** (Cumulative Layout Shift) - Visual stability
- **FCP** (First Contentful Paint) - Initial render
- **TTFB** (Time to First Byte) - Server response time
- **INP** (Interaction to Next Paint) - Responsiveness

### Usage

The monitoring is automatically initialized after hydration via the `MonitoringProvider` in the root layout. Metrics are sent to `/api/monitoring/web-vitals` using `navigator.sendBeacon()` for reliability.

### API Endpoint

`app/api/monitoring/web-vitals/route.ts` receives metrics and validates them with Zod schemas. In production, these can be forwarded to:
- Google Analytics
- Vercel Analytics
- Custom analytics database
- APM services (Datadog, New Relic, etc.)

### Performance Score

The system calculates a 0-100 performance score based on:
- LCP: Good ≤2500ms, Poor >4000ms
- FID: Good ≤100ms, Poor >300ms
- CLS: Good ≤0.1, Poor >0.25

## Bundle Size Monitoring

### Automated Analysis

Two scripts provide comprehensive bundle analysis:

#### 1. `scripts/analyze-bundle-size.js`
- Compares current build with baseline
- Generates detailed reports
- Validates 20% reduction target
- Identifies large assets (>100KB)

#### 2. `scripts/bundle-analysis-ci.js`
- Runs in CI/CD pipeline
- Tracks trends over 30 builds
- Enforces size limits
- Alerts on regressions

### Size Limits

Configured in `.bundle-size-limits.json`:
- Total JS: 500KB
- Total CSS: 100KB
- Total Assets: 1MB
- Max Asset: 200KB

### CI/CD Integration

GitHub Actions workflow (`.github/workflows/bundle-analysis.yml`):
- Runs on every push/PR
- Generates bundle reports
- Comments on PRs with analysis
- Fails build if limits exceeded

### NPM Scripts

```bash
npm run analyze:bundle    # Analyze current bundle
npm run analyze:ci        # Run CI analysis with trends
npm run analyze:trends    # View trend analysis
```

## TypeScript Error Monitoring

### Implementation

`scripts/typescript-error-monitor.js` provides:
- Automated TypeScript compilation checks
- Error categorization (any types, strict null, etc.)
- Trend analysis over 30 builds
- Detailed error reports

### Error Categories

1. **Any Type Errors** (TS7006, TS7031)
   - Priority: HIGH
   - Target: Zero occurrences

2. **Strict Null Errors** (TS2531, TS2532, TS2533)
   - Priority: MEDIUM
   - Indicates missing null checks

3. **Other Errors**
   - Various TypeScript violations
   - Tracked but don't fail builds

### CI/CD Integration

GitHub Actions workflow (`.github/workflows/typescript-check.yml`):
- Runs on every push/PR
- Tracks error trends
- Comments on PRs with reports
- Fails if any type errors exist

### NPM Scripts

```bash
npm run typecheck           # Run TypeScript check
npm run typecheck:monitor   # Run with monitoring
npm run typecheck:watch     # Watch mode
```

## Trend Analysis

All monitoring systems track trends over time:

### Storage
- Bundle trends: `.bundle-trends/`
- TypeScript trends: `.typescript-trends/`
- Retains last 30 builds

### Metrics
- Current vs previous build delta
- 7-build rolling average
- Increasing/decreasing trends
- Regression detection

## Reports

Generated reports are saved to `docs/`:
- `bundle-size-validation.md` - Bundle analysis
- `typescript-errors.md` - TypeScript error report

## Alerts and Notifications

### Bundle Size Alerts
- ⚠️ Warning: >5% increase
- ❌ Failure: Size limits exceeded

### TypeScript Alerts
- ⚠️ Warning: Other TypeScript errors
- ❌ Failure: Any type errors detected

### Trend Alerts
- 📈 Increasing error/size trends
- 📉 Improving trends

## Integration with Development Workflow

### Pre-commit
Consider adding to Git hooks:
```bash
npm run typecheck:monitor
npm run analyze:ci
```

### Pull Requests
Automated comments provide:
- Bundle size comparison
- TypeScript error summary
- Trend analysis
- Actionable recommendations

### Continuous Monitoring
Run in CI/CD on:
- Every push to main/develop
- All pull requests
- Scheduled daily builds

## Best Practices

1. **Review Trends Regularly**
   - Check weekly for patterns
   - Address increasing trends early
   - Celebrate improvements

2. **Set Realistic Limits**
   - Adjust `.bundle-size-limits.json` as needed
   - Balance performance with features
   - Document limit changes

3. **Fix Any Types First**
   - Highest priority for type safety
   - Use proper interfaces
   - Enable strict mode incrementally

4. **Monitor Core Web Vitals**
   - Track real user metrics
   - Correlate with bundle changes
   - Optimize based on data

## Troubleshooting

### Bundle Analysis Fails
- Ensure `bundle-stats.json` exists
- Run `npm run build:analyze` first
- Check `.bundle-size-limits.json` syntax

### TypeScript Monitor Fails
- Verify TypeScript is installed
- Check `tsconfig.json` configuration
- Ensure all dependencies are installed

### Missing Trends
- Trends build up over time
- First run establishes baseline
- Need 2+ builds for comparison

## Future Enhancements

Consider adding:
- Real-time dashboards (Grafana, Datadog)
- Slack/Discord notifications
- Performance budgets per route
- Lighthouse CI integration
- Custom metric tracking
- A/B test performance comparison

## Validation

All monitoring systems include comprehensive tests:
- `lib/monitoring/__tests__/web-vitals.test.ts`
- `scripts/__tests__/bundle-analysis-ci.test.js`
- `scripts/__tests__/typescript-error-monitor.test.js`

Run tests with:
```bash
npm run test:run -- lib/monitoring scripts/__tests__
```

## Requirements Validation

This implementation validates:
- **Requirement 13.1**: Core Web Vitals tracking ✅
- **Requirement 13.2**: Bundle analysis automation ✅
- **Requirement 13.3**: TypeScript error monitoring ✅
