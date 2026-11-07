import { afterEach, describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { spawnSync } from "node:child_process";

const directories: string[] = [];
afterEach(() => {
  for (const directory of directories.splice(0)) {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});
function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "closet-asset-lock-"));
  directories.push(root);
  const stage = path.join(root, "tmp/wardrobe-refresh-2026-11-06");
  fs.mkdirSync(stage, { recursive: true });
  const ledger = JSON.stringify({
    startedAt: "fixture",
    budgetUsd: 70,
    rows: [],
    rateGapMs: 1250,
    nextCreateAt: 0,
  });
  fs.writeFileSync(path.join(stage, "ledger.json"), ledger);
  fs.writeFileSync(path.join(stage, "run.lock"), "existing-owner");
  return { root, stage, ledger };
}
function run(root: string, args: string[]) {
  return spawnSync(process.execPath, [
    "--import",
    path.resolve("node_modules/tsx/dist/loader.mjs"),
    path.resolve("scripts/refresh-wardrobe-library.ts"),
    ...args,
  ], {
    cwd: root,
    encoding: "utf8",
    timeout: 7000,
    env: {
      ...process.env,
      REPLICATE_API_TOKEN: "synthetic-no-inference-fixture",
    },
  });
}
describe("exclusive asset batch writer", () => {
  it("holds paid work until the confirmed credit dependency is explicitly cleared", () => {
    const { root, stage } = fixture();
    fs.rmSync(path.join(stage, "run.lock"));
    const l = JSON.parse(
      fs.readFileSync(path.join(stage, "ledger.json"), "utf8"),
    );
    l.stopReason = "Awaiting provider credit: confirmed low balance";
    const bytes = JSON.stringify(l);
    fs.writeFileSync(path.join(stage, "ledger.json"), bytes);
    const denied = run(root, ["--run"]);
    expect(denied.status).not.toBe(0);
    expect(denied.stderr).toContain("Credit confirmation required");
    expect(fs.readFileSync(path.join(stage, "ledger.json"), "utf8")).toBe(
      bytes,
    );
    expect(fs.existsSync(path.join(stage, "run.lock"))).toBe(false);
    const emptyResume = run(root, ["--run", "--resume-funded", "--limit=0"]);
    expect(emptyResume.status).toBe(0);
    expect(
      JSON.parse(fs.readFileSync(path.join(stage, "ledger.json"), "utf8"))
        .stopReason,
    ).toBeUndefined();
  });
  it("prevents asset publication from racing an active generation writer", () => {
    const { root, stage, ledger } = fixture();
    const result = spawnSync(process.execPath, [
      path.resolve("scripts/apply-wardrobe-refresh.mjs"),
      "--apply",
    ], { cwd: root, encoding: "utf8", timeout: 7000 });
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("EEXIST");
    expect(fs.readFileSync(path.join(stage, "ledger.json"), "utf8")).toBe(
      ledger,
    );
    expect(fs.readFileSync(path.join(stage, "run.lock"), "utf8")).toBe(
      "existing-owner",
    );
  });
  it("rejects a second paid worker before reading or changing its ledger", () => {
    const { root, stage, ledger } = fixture(), result = run(root, ["--run"]);
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("EEXIST");
    expect(fs.readFileSync(path.join(stage, "ledger.json"), "utf8")).toBe(
      ledger,
    );
    expect(fs.readFileSync(path.join(stage, "run.lock"), "utf8")).toBe(
      "existing-owner",
    );
  });
  it("keeps a dry run read-only while the writer is active", () => {
    const { root, stage, ledger } = fixture(), result = run(root, []);
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("read-only: worker active");
    expect(fs.readFileSync(path.join(stage, "ledger.json"), "utf8")).toBe(
      ledger,
    );
  });
});
