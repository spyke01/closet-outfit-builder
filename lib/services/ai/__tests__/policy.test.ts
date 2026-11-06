import { describe, expect, it } from "vitest";
import { resolveAiPolicy, maxTaskCostMicros } from "../policy";
describe("server AI policy", () => {
  it("has finite defaults and bounded output", () =>
    expect(resolveAiPolicy(() => undefined)).toMatchObject({
      enabled: true,
      globalDailyMicros: 25000000,
      globalMonthlyMicros: 250000000,
      maxInflight: 2,
      maxOutputTokens: 1024,
    }));
  it.each(["0", "-1", "NaN", "Infinity", "1000000"])(
    "rejects an unsafe budget value %s",
    (value) =>
      expect(() =>
        resolveAiPolicy((key) =>
          key === "AI_DAILY_BUDGET_USD" ? value : undefined,
        ),
      ).toThrow("AI_POLICY_UNAVAILABLE"),
  );
  it("reserves a conservative combined image and cleanup ceiling", () => {
    expect(maxTaskCostMicros("wardrobe_image", "google/imagen-4")).toBe(100000);
    expect(
      maxTaskCostMicros("background_removal", "851-labs/background-remover"),
    ).toBe(50000);
  });
});
