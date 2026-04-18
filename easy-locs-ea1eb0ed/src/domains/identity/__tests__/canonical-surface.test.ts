import { describe, it, expect } from "vitest";

import * as identity from "@/domains/identity";
import * as wallet from "@/domains/wallet";
import * as orbit from "@/domains/orbit";

/**
 * Phase 1 canonical-surface contract test.
 *
 * Asserts that the three canonical domain entry points expose the names the
 * rest of the platform is allowed to depend on. This is a lightweight
 * regression guard (Phase 12 contract) — if a future refactor accidentally
 * removes a canonical export, this test fails fast and points at the
 * single canonical module to fix.
 */

describe("Phase 1 — canonical domain surfaces", () => {
  it("identity surface exposes the canonical user service + helpers", () => {
    expect(identity.userService).toBeDefined();
    expect(typeof identity.fetchBaseProfile).toBe("function");
    expect(typeof identity.updateProfile).toBe("function");
    expect(typeof identity.getOrbitProfile).toBe("function");
  });

  it("wallet surface exposes the canonical wallet service factory", () => {
    expect(typeof wallet.createWalletService).toBe("function");
  });

  it("orbit surface exposes canonical messaging + the realtime manager", () => {
    expect(typeof orbit.sendTextMessage).toBe("function");
    expect(typeof orbit.createDirectConversation).toBe("function");
    expect(typeof orbit.markConversationRead).toBe("function");
    expect(orbit.realtimeManager).toBeDefined();
  });
});
