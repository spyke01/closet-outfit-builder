#!/usr/bin/env node
import { config } from "dotenv";

if (process.env.NODE_ENV !== "production" && process.env.NETLIFY !== "true") {
  config({ path: ".env.local", quiet: true });
}
const failures = [];
const requireVariable = (name) => {
  const set = Boolean(process.env[name]?.trim());
  console.info(`${name}: ${set ? "set" : "missing"}`);
  if (!set) failures.push(`${name} is required.`);
};
for (const name of [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "OPENWEATHER_API_KEY",
])
  requireVariable(name);
const privateNames = [
  "OPENAI_API_KEY",
  "REPLICATE_API_TOKEN",
  "SUPABASE_SERVICE_ROLE_KEY",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "ADMIN_IMPERSONATION_SECRET",
];
for (const name of privateNames) {
  if (process.env[`NEXT_PUBLIC_${name}`])
    failures.push(
      `Remove NEXT_PUBLIC_${name}; this credential must remain server-only.`,
    );
}
if (
  process.env.AI_ENABLED &&
  !["true", "false"].includes(process.env.AI_ENABLED)
)
  failures.push("AI_ENABLED must be true or false.");
const provider = process.env.AI_TEXT_PROVIDER || "openai";
if (!["openai", "replicate"].includes(provider))
  failures.push("AI_TEXT_PROVIDER must be openai or replicate.");
if (process.env.AI_ENABLED !== "false") {
  requireVariable(
    provider === "replicate" ? "REPLICATE_API_TOKEN" : "OPENAI_API_KEY",
  );
  // Clothing illustrations and background cleanup also use Replicate.
  if (provider !== "replicate") requireVariable("REPLICATE_API_TOKEN");
}
for (const [name, maximum, integer] of [
  ["AI_DAILY_BUDGET_USD", 10000, false],
  ["AI_MONTHLY_BUDGET_USD", 100000, false],
  ["AI_USER_MONTHLY_BUDGET_USD", 10000, false],
  ["AI_MAX_INFLIGHT_PER_USER", 20, true],
  ["AI_MAX_OUTPUT_TOKENS", 2048, true],
]) {
  const raw = process.env[name];
  if (raw === undefined || raw === "") continue;
  const value = Number(raw);
  if (
    !Number.isFinite(value) ||
    value <= 0 ||
    value > maximum ||
    (integer && !Number.isInteger(value))
  )
    failures.push(`${name} is outside the supported policy range.`);
}
for (const message of failures) console.error(message);
console.info(
  failures.length
    ? "Environment verification failed."
    : "Environment verification passed. Credential values were not printed.",
);
process.exit(failures.length ? 1 : 0);
