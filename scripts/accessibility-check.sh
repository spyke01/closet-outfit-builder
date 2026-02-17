#!/bin/bash

# Accessibility Pre-commit Check Script
# This script runs accessibility linting before commits to prevent regressions

echo "🔍 Running accessibility checks..."

REPORT_FILE=".a11y-lint-report.json"

# Run ESLint once and save a machine-readable report.
npm run lint -- --quiet --format=json -o "$REPORT_FILE"

echo "Running ESLint accessibility rules..."
node -e '
const fs = require("fs");
const reportPath = process.argv[1];
const report = JSON.parse(fs.readFileSync(reportPath, "utf8"));
const a11yMessages = report
  .flatMap(file => file.messages || [])
  .filter(msg => typeof msg.ruleId === "string" && msg.ruleId.startsWith("jsx-a11y"));
if (a11yMessages.length === 0) {
  console.info("No accessibility violations found in ESLint output.");
  process.exit(0);
}
for (const msg of a11yMessages.slice(0, 20)) {
  console.info(`${msg.ruleId}: ${msg.message}`);
}
' "$REPORT_FILE"

# Count accessibility violations
VIOLATIONS=$(node -e '
const fs = require("fs");
const report = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
const count = report
  .flatMap(file => file.messages || [])
  .filter(msg => typeof msg.ruleId === "string" && msg.ruleId.startsWith("jsx-a11y"))
  .length;
process.stdout.write(String(count));
' "$REPORT_FILE")

echo "Found $VIOLATIONS accessibility violations"

if [ "$VIOLATIONS" -gt 0 ]; then
    echo "❌ Accessibility violations found! Please fix before committing."
    echo "Run 'npm run lint' to see detailed violations."
    rm -f "$REPORT_FILE"
    exit 1
else
    echo "✅ No accessibility violations found!"
    rm -f "$REPORT_FILE"
    exit 0
fi
