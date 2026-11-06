import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";
const base = {
  NODE_ENV: "production",
  NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "fixture-public-key",
  SUPABASE_SERVICE_ROLE_KEY: "fixture-private-service-key",
  OPENWEATHER_API_KEY: "fixture-weather-key",
  OPENAI_API_KEY: "fixture-private-openai-key",
  REPLICATE_API_TOKEN: "fixture-private-replicate-token",
};
const run = (env: Record<string, string | undefined> = {}) =>
  spawnSync(process.execPath, ["scripts/verify-production-env.js"], {
    env: { ...base, ...env },
    encoding: "utf8",
  });
describe("production environment verification", () => {
  it("passes a valid setup without printing credential values", () => {
    const result = run();
    expect(result.status).toBe(0);
    for (const value of Object.values(base).filter((value) =>
      value.startsWith("fixture-"),
    ))
      expect(result.stdout + result.stderr).not.toContain(value);
  });
  it.each([
    "OPENAI_API_KEY",
    "REPLICATE_API_TOKEN",
    "SUPABASE_SERVICE_ROLE_KEY",
  ])("fails when %s is missing", (name) => {
    expect(run({ [name]: "" }).status).toBe(1);
  });
  it("allows a controlled AI-disabled deployment before provider keys are configured", () => {
    expect(
      run({ AI_ENABLED: "false", OPENAI_API_KEY: "", REPLICATE_API_TOKEN: "" })
        .status,
    ).toBe(0);
  });
  it("rejects private credential names exposed through NEXT_PUBLIC", () => {
    const result = run({
      NEXT_PUBLIC_OPENAI_API_KEY: "fixture-exposed-private-key",
    });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("must remain server-only");
    expect(result.stdout + result.stderr).not.toContain(
      "fixture-exposed-private-key",
    );
  });
  it("rejects invalid budget, concurrency, and provider settings", () => {
    for (const env of [
      { AI_DAILY_BUDGET_USD: "Infinity" },
      { AI_MAX_INFLIGHT_PER_USER: "0" },
      { AI_MAX_OUTPUT_TOKENS: "9000" },
      { AI_ENABLED: "no" },
      { AI_TEXT_PROVIDER: "arbitrary" },
    ])
      expect(run(env).status).toBe(1);
  });
});
