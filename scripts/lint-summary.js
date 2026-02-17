#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const reportPath = process.argv[2] ?? ".lint-report.json";

if (!fs.existsSync(reportPath)) {
  console.error(`Lint report not found: ${reportPath}`);
  process.exit(1);
}

const report = JSON.parse(fs.readFileSync(reportPath, "utf8"));

const ruleCounts = new Map();
const dirCounts = new Map();
let total = 0;
let errors = 0;
let warnings = 0;

for (const file of report) {
  const relativePath = path.relative(process.cwd(), file.filePath);
  const topDir = relativePath.split(path.sep)[0] || relativePath;

  for (const message of file.messages) {
    total += 1;
    if (message.severity === 2) {
      errors += 1;
    } else {
      warnings += 1;
    }

    const rule = message.ruleId ?? "unknown";
    ruleCounts.set(rule, (ruleCounts.get(rule) ?? 0) + 1);
    dirCounts.set(topDir, (dirCounts.get(topDir) ?? 0) + 1);
  }
}

const topRules = [...ruleCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 20);
const topDirectories = [...dirCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15);

const summary = {
  total,
  errors,
  warnings,
  topRules,
  topDirectories,
};

console.info("Lint summary");
console.info(JSON.stringify(summary, null, 2));
fs.writeFileSync(".lint-summary.json", JSON.stringify(summary, null, 2));
