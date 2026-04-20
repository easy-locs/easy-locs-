import { describe, it, expect } from "vitest";

/**
 * Step 2 — `@/services/db` must be module-eval-safe.
 *
 * Invariant: every forwarded supabase property (`rpc`, `storage`, `functions`,
 * `auth`, `channel`, `removeChannel`, `getChannels`, `removeAllChannels`) on
 * `db` MUST be a lazy getter, not an eagerly-copied data value.
 *
 * Rationale: the previous `Object.assign(_from, { storage: supabase.storage,
 * ... })` construction read all seven properties at module evaluation time.
 * If the underlying supabase client threw on any of those reads (for example
 * the guarded proxy when env vars are missing — see the Step 1 change), the
 * throw propagated out of module evaluation and poisoned every file that
 * transitively imported `db` — including `AuthContext` — producing a blank
 * screen before the first React commit.
 *
 * This test enforces the lazy shape structurally so future refactors cannot
 * silently reintroduce eager reads.
 */
describe("services/db — lazy property bridge", () => {
  it("exposes every supabase property as a getter, never as an eager value", async () => {
    const mod = await import("@/services/db");
    const LAZY_PROPS = [
      "rpc",
      "storage",
      "functions",
      "auth",
      "channel",
      "removeChannel",
      "getChannels",
      "removeAllChannels",
    ] as const;

    for (const prop of LAZY_PROPS) {
      const desc = Object.getOwnPropertyDescriptor(mod.db, prop);
      expect(desc, `descriptor for db.${prop}`).toBeDefined();
      // Lazy getter means `get` is a function AND `value` is absent.
      expect(
        typeof desc?.get === "function",
        `db.${prop} must be a getter (Step 2 invariant); found descriptor: ${JSON.stringify({
          hasGet: typeof desc?.get,
          hasValue: typeof desc?.value !== "undefined",
        })}`,
      ).toBe(true);
      expect(
        typeof desc?.value === "undefined",
        `db.${prop} must not be an eagerly-copied data value`,
      ).toBe(true);
    }

    // `from` is a function, exposed as a data property by design — it is the
    // callable surface of `db` itself. Keep it as a data value.
    const fromDesc = Object.getOwnPropertyDescriptor(mod.db, "from");
    expect(typeof fromDesc?.value).toBe("function");
  });
});
