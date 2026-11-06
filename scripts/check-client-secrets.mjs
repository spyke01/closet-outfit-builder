// Compare exact private local credential values against the built browser bundle.
// Report counts and file names only; never print a credential or matching excerpt.
import fs from "node:fs/promises";
import path from "node:path";
import nextEnv from "@next/env";
const { loadEnvConfig } = nextEnv;
const { combinedEnv } = loadEnvConfig(process.cwd(), false, {
  info() {},
  error() {},
});
const secrets = Object.entries(combinedEnv).filter(
  ([name, value]) =>
    !name.startsWith("NEXT_PUBLIC_") &&
    /SECRET|TOKEN|API_KEY|SERVICE_ROLE|PASSWORD/.test(name) &&
    typeof value === "string" &&
    value.length >= 8 &&
    !/^(your_|example|placeholder|xxx)/i.test(value),
);
if (!secrets.length)
  throw new Error("No private credential values were available to compare.");
const files = [];
async function walk(directory) {
  for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) await walk(file);
    else if (/\.(js|json|map|css)$/.test(file)) files.push(file);
  }
}
await walk(".next/static");
if (!files.length)
  throw new Error("Build the application before scanning browser assets.");
const matches = [];
for (const file of files) {
  const content = await fs.readFile(file, "utf8");
  if (secrets.some(([, value]) => content.includes(value))) matches.push(file);
}
const evidence = {
  checkedAt: new Date().toISOString(),
  scope:
    "Exact private local values in built browser assets; not a production or historical exposure audit",
  credentialsCompared: secrets.length,
  browserAssetsChecked: files.length,
  matchingFiles: matches,
  passed: matches.length === 0,
};
await fs.writeFile(
  "docs/experience-implementation/client-secret-validation.json",
  JSON.stringify(evidence, null, 2) + "\n",
);
console.log(JSON.stringify(evidence, null, 2));
if (matches.length) process.exitCode = 1;
