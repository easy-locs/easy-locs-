import { describe, it, expect, beforeEach } from "vitest";
import {
  isGhostModeActive,
  activateGhostMode,
  deactivateGhostMode,
} from "@/lib/app-security";

describe("App Security — Ghost Mode", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it("ghost mode is off by default", () => {
    expect(isGhostModeActive()).toBe(false);
  });

  it("activateGhostMode enables ghost mode", () => {
    activateGhostMode();
    expect(isGhostModeActive()).toBe(true);
  });

  it("deactivateGhostMode disables ghost mode", () => {
    activateGhostMode();
    expect(isGhostModeActive()).toBe(true);
    deactivateGhostMode();
    expect(isGhostModeActive()).toBe(false);
  });

  it("double activate is idempotent", () => {
    activateGhostMode();
    activateGhostMode();
    expect(isGhostModeActive()).toBe(true);
  });

  it("deactivate when already off is safe", () => {
    deactivateGhostMode();
    expect(isGhostModeActive()).toBe(false);
  });
});
