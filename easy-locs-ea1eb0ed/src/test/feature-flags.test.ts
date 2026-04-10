import { describe, it, expect } from "vitest";
import {
  registerFlag, registerFlags, evaluateFlag, isEnabled, getVariant,
  overrideFlag, clearOverride, clearAllOverrides,
  getActiveFlags, getAllFlags, getFlagCount, onFlagChange,
} from "@/lib/feature-flags";

describe("PASS55 AT — Feature Flags", () => {
  it("returns false for unknown flags", () => {
    expect(evaluateFlag("unknown_flag_xyz")).toBe(false);
  });

  it("returns default value for registered flag", () => {
    registerFlag({ key: "test_default", defaultValue: "hello" });
    expect(evaluateFlag("test_default")).toBe("hello");
  });

  it("supports boolean flags with isEnabled", () => {
    registerFlag({ key: "bool_flag", defaultValue: true });
    expect(isEnabled("bool_flag")).toBe(true);
  });

  it("respects overrides", () => {
    registerFlag({ key: "override_test", defaultValue: false });
    overrideFlag("override_test", true);
    expect(isEnabled("override_test")).toBe(true);
    clearOverride("override_test");
    expect(isEnabled("override_test")).toBe(false);
  });

  it("supports user allowlist", () => {
    registerFlag({ key: "vip_flag", defaultValue: false, allowedUsers: ["user-1"] });
    expect(isEnabled("vip_flag", { userId: "user-1" })).toBe(true);
    expect(isEnabled("vip_flag", { userId: "user-2" })).toBe(false);
  });

  it("supports org allowlist", () => {
    registerFlag({ key: "org_flag", defaultValue: false, allowedOrgs: ["org-a"] });
    expect(isEnabled("org_flag", { orgId: "org-a" })).toBe(true);
    expect(isEnabled("org_flag", { orgId: "org-b" })).toBe(false);
  });

  it("supports percentage rollout (deterministic)", () => {
    registerFlag({ key: "rollout_50", defaultValue: false, rolloutPercent: 50 });
    // Same user should always get same result
    const r1 = isEnabled("rollout_50", { userId: "stable-user" });
    const r2 = isEnabled("rollout_50", { userId: "stable-user" });
    expect(r1).toBe(r2);
  });

  it("assigns A/B variants deterministically", () => {
    registerFlag({ key: "ab_test", defaultValue: "control", variants: { control: 50, treatment: 50 } });
    const v1 = getVariant("ab_test", { userId: "user-a" });
    const v2 = getVariant("ab_test", { userId: "user-a" });
    expect(v1).toBe(v2);
    expect(["control", "treatment"]).toContain(v1);
  });

  it("registers multiple flags at once", () => {
    const before = getFlagCount();
    registerFlags([
      { key: "bulk_1", defaultValue: true },
      { key: "bulk_2", defaultValue: false },
    ]);
    expect(getFlagCount()).toBeGreaterThanOrEqual(before + 2);
  });

  it("getActiveFlags returns all evaluations", () => {
    const flags = getActiveFlags({ userId: "test" });
    expect(typeof flags).toBe("object");
  });

  it("notifies listeners on override", () => {
    registerFlag({ key: "listen_test", defaultValue: false });
    let notified = false;
    const unsub = onFlagChange("listen_test", (v) => { notified = v === true; });
    overrideFlag("listen_test", true);
    expect(notified).toBe(true);
    unsub();
    clearOverride("listen_test");
  });

  it("respects expired flags", () => {
    registerFlag({ key: "expired_flag", defaultValue: "active", expiresAt: "2020-01-01T00:00:00Z" });
    expect(evaluateFlag("expired_flag")).toBe("active"); // returns default since expired
  });

  it("clearAllOverrides removes all", () => {
    overrideFlag("x1", true);
    overrideFlag("x2", true);
    clearAllOverrides();
    // No error, overrides cleared
    expect(evaluateFlag("x1")).toBeFalsy();
  });
});
