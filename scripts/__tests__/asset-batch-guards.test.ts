import { describe, expect, it } from "vitest";
import {
  type AssetPhase,
  assetRetryDelay,
  canSubmitAssetPhase,
  reserveAssetPhase,
  reservedAssetCost,
} from "../lib/asset-batch-guards";

describe("bulk asset inference protections", () => {
  it("honors numeric, dated, and body retry windows without imposing a permanent low rate", () => {
    const now = Date.parse("2026-11-07T02:00:00Z");
    expect(assetRetryDelay("90", "", 0, now)).toBe(90250);
    expect(assetRetryDelay("Sat, 07 Nov 2026 02:00:30 GMT", "", 0, now)).toBe(
      30250,
    );
    expect(
      assetRetryDelay(undefined, "Your rate limit resets in ~30s.", 0, now),
    ).toBe(30250);
    expect(assetRetryDelay("invalid", "", 2, now)).toBe(20250);
  });
  it("counts failed and ambiguous submissions against the budget", () => {
    const rows = [
      { generate: { state: "failed", reservedUsd: 0.075 } },
      { generate: { state: "submitting", reservedUsd: 0.075 } },
      { cleanup: { state: "succeeded", reservedUsd: 0.005 } },
    ];
    expect(reservedAssetCost(rows)).toBeCloseTo(0.155);
    const next = {};
    rows.push(next);
    expect(() => reserveAssetPhase(rows, next, "generate", 0.075, 0.2)).toThrow(
      "budget",
    );
  });
  it("reserves before the next worker can exceed the ceiling and does not double-reserve a resume", () => {
    const first = {}, second = {}, rows = [first, second];
    reserveAssetPhase(rows, first, "generate", 0.075, 0.1);
    expect(() => reserveAssetPhase(rows, second, "generate", 0.075, 0.1))
      .toThrow();
    reserveAssetPhase(rows, first, "generate", 0.075, 0.1);
    expect(reservedAssetCost(rows)).toBe(0.075);
  });
  it("allows only known unsubmitted phases or explicit rate-limit rejections to POST", () => {
    for (const state of ["queued", "rate_limited"]) {
      expect(canSubmitAssetPhase({ state, reservedUsd: 0.075 })).toBe(true);
    }
    for (
      const state of [
        "submitting",
        "starting",
        "processing",
        "succeeded",
        "failed",
        "rejected",
      ]
    ) {
      expect(canSubmitAssetPhase({ state, reservedUsd: 0.075 })).toBe(false);
    }
    const known: AssetPhase = {
      state: "rate_limited",
      id: "accepted-prediction",
      reservedUsd: 0.075,
    };
    expect(canSubmitAssetPhase(known)).toBe(false);
  });
});
