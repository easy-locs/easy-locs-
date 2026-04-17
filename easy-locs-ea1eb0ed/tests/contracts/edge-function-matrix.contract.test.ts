/**
 * Contract matrix CI gate.
 *
 * Re-runs `scripts/edge-function-contract-matrix.ts --ci` from inside vitest so
 * the build fails when:
 *   1. A new `functions.invoke('name', ...)` or `/functions/v1/name` call is
 *      introduced in `src/` whose target function does not exist on disk
 *      (orphaned frontend call), OR
 *   2. The committed matrix artifact in `docs/` is out of date.
 *
 * This test does NOT fail on orphaned edge functions (functions on disk with
 * no caller). Those are expected — webhooks, crons and consolidation
 * candidates — and are reported in the markdown artifact for follow-up.
 */
import { describe, it, expect } from "vitest";
import { spawnSync } from "node:child_process";
import * as path from "node:path";

const ROOT = path.resolve(__dirname, "..", "..");

describe("Contract: frontend ↔ edge function matrix", () => {
  it("has no orphaned frontend calls and the artifact is up to date", () => {
    const result = spawnSync(
      "npx",
      ["tsx", "scripts/edge-function-contract-matrix.ts", "--ci"],
      { cwd: ROOT, encoding: "utf8" },
    );
    const out = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
    if (result.status !== 0) {
      // Surface the script's own error report in the failure message.
      throw new Error(`Contract matrix CI check failed:\n${out}`);
    }
    expect(out).toMatch(/Contract matrix verified/);
  }, 60_000);
});
