#!/bin/bash

# Accessibility Pre-commit Check Script
# This script runs accessibility linting before commits to prevent regressions

echo "🔍 Running accessibility checks..."

# Run ESLint with accessibility rules
echo "Running ESLint accessibility rules..."
npm run lint -- --quiet --format=compact | grep -E "(jsx-a11y|accessibility)" || true

# Count accessibility violations
VIOLATIONS=$(npm run lint -- --quiet --format=json | jq '[.[] | .messages[] | select(.ruleId | startswith("jsx-a11y"))] | length' 2>/dev/null || echo "0")

echo "Found $VIOLATIONS accessibility violations"

if [ "$VIOLATIONS" -gt 0 ]; then
    echo "❌ Accessibility violations found! Please fix before committing."
    echo "Run 'npm run lint' to see detailed violations."
    exit 1
else
    echo "✅ No accessibility violations found!"
    exit 0
fi