# Audit Process Quick Start Guide

## 🚀 Getting Started (5 minutes)

### 1. Setup Pre-commit Hooks
```bash
npm run audit:setup-hooks
```
This installs Git hooks that automatically check code quality before each commit.

### 2. Run Your First Audit
```bash
npm run audit:continuous
```
This runs a comprehensive audit and generates a report in the `audits/` directory.

### 3. Check Results
```bash
npm run audit:status
```
View audit schedule status and recent results.

## 📋 Daily Workflow

### Before Committing Code
Pre-commit hooks run automatically, but you can test manually:
```bash
npm run audit:pre-commit
```

### Fix Common Issues
```bash
# Fix ESLint violations
npm run lint

# Check TypeScript errors
npx tsc --noEmit

# Fix security vulnerabilities
npm audit fix

# Run accessibility tests
npm run test:a11y
```

## 🔧 Available Commands

| Command | Purpose | When to Use |
|---------|---------|-------------|
| `npm run audit:setup-hooks` | Install Git pre-commit hooks | Once after cloning repo |
| `npm run audit:pre-commit` | Quick pre-commit checks | Before committing code |
| `npm run audit:continuous` | Full comprehensive audit | Weekly or before releases |
| `npm run audit:schedule run` | Run scheduled audit | Manual audit execution |
| `npm run audit:trends` | Generate trends report | Monthly review |
| `npm run audit:status` | Show audit status | Check current state |

## 🎯 Understanding Results

### Audit Report Structure
```json
{
  "summary": {
    "totalChecks": 10,
    "passedChecks": 8,
    "failedChecks": 2,
    "criticalIssues": 0
  },
  "recommendations": [
    "Fix ESLint violations to improve code quality"
  ]
}
```

### Priority Levels
- 🔴 **Critical**: Security vulnerabilities, build failures
- 🟡 **High**: Code quality issues, accessibility violations
- 🟢 **Low**: Style issues, minor optimizations

## 🚨 Common Issues & Solutions

### "Pre-commit hook failed"
**Cause**: Code quality issues detected
**Solution**: 
1. Run `npm run audit:pre-commit` to see details
2. Fix reported issues
3. Commit again

### "TypeScript errors found"
**Cause**: Type safety violations
**Solution**: Run `npx tsc --noEmit` and fix type errors

### "Security vulnerabilities detected"
**Cause**: Outdated or vulnerable dependencies
**Solution**: Run `npm audit fix` to update packages

### "Accessibility violations found"
**Cause**: WCAG compliance issues
**Solution**: 
1. Run `npm run lint:a11y` for details
2. Add proper ARIA labels, alt text, etc.
3. Test with `npm run test:keyboard`

## 📊 Monitoring Your Progress

### View Latest Results
```bash
# Check latest audit report
cat audits/latest-audit-report.json

# View trends over time
npm run audit:trends
```

### Key Metrics to Track
- **Pass Rate**: Aim for >95%
- **Critical Issues**: Keep at 0
- **Test Coverage**: Maintain >80%
- **Failed Checks**: Keep under 3

## 🔄 Integration Tips

### For VS Code Users
Add to `.vscode/tasks.json`:
```json
{
  "label": "Run Audit",
  "type": "shell",
  "command": "npm run audit:pre-commit",
  "group": "test"
}
```

### For CI/CD Integration
Add to your pipeline:
```yaml
- name: Run Audit
  run: npm run audit:continuous
- name: Upload Reports
  uses: actions/upload-artifact@v3
  with:
    name: audit-reports
    path: audits/
```

## 🆘 Need Help?

### Quick Diagnostics
```bash
# Test all audit components
npm run audit:continuous

# Check Git hooks are installed
ls -la .git/hooks/pre-commit

# Verify audit configuration
cat audits/audit-schedule.json
```

### Common Commands for Troubleshooting
```bash
# Reset Git hooks
npm run audit:setup-hooks

# Clean and reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Check Node.js version (requires 18+)
node --version
```

### Getting Support
1. Check audit reports for specific error details
2. Review `audits/CONTINUOUS_AUDIT_PROCESS.md` for detailed documentation
3. Run diagnostics with `npm run audit:status`

## 🎉 Success!

Once you see:
- ✅ Pre-commit hooks passing
- ✅ Audit reports with high pass rates
- ✅ Consistent code quality metrics

You're successfully using the continuous audit process! 

The system will now help maintain code quality automatically while providing insights for continuous improvement.