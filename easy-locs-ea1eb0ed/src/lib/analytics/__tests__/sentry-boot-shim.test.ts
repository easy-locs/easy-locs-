/**
 * Pins the boot-shim queue contract relied on by `main.tsx`.
 *
 * `main.tsx` Stages 1/2/3a/3b call `captureBootCrash` from this shim
 * inside their `.catch` handlers so that background-boot failures are
 * not silently swallowed by `console.warn`. The shim must:
 *   1. Accept `captureBootCrash` calls before `flushSentryBoot` runs
 *      (queue them in-memory, do NOT throw).
 *   2. Drain the queue when `flushSentryBoot` runs (and pass each
 *      queued crash to the real Sentry module).
 *   3. Cap the queue to 50 items so a runaway error loop pre-flush
 *      cannot OOM the boot path.
 *
 * Regression of any of the above turns the Stage 1/2/3 instrumentation
 * added in PR-B into a silent no-op — exactly what we are guarding
 * against. Hence this is a contract test, not an implementation test.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

describe("sentry-boot-shim", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllGlobals();
  });

  it("queues captureBootCrash calls before flush without throwing", async () => {
    // Stub the heavy real sentry module so flushSentryBoot can resolve in jsdom.
    const realInitBoot = vi.fn();
    const realInit = vi.fn();
    const realCapture = vi.fn();
    const realTtfr = vi.fn();
    vi.doMock("@/lib/analytics/sentry", () => ({
      initSentryBoot: realInitBoot,
      initSentry: realInit,
      captureBootCrash: realCapture,
      reportTimeToFirstRender: realTtfr,
    }));

    const shim = await import("../sentry-boot-shim");

    // Pre-flush calls must not throw and must not synchronously hit the real module.
    expect(() => shim.captureBootCrash(new Error("stage-1 fail"), { phase: "stage-1" })).not.toThrow();
    expect(() => shim.captureBootCrash(new Error("stage-2 fail"), { phase: "stage-2" })).not.toThrow();
    expect(realCapture).not.toHaveBeenCalled();

    // Flushing must drain the queue into the real module exactly once per item.
    await shim.flushSentryBoot();
    expect(realInitBoot).toHaveBeenCalledTimes(1);
    expect(realInit).toHaveBeenCalledTimes(1);
    expect(realCapture).toHaveBeenCalledTimes(2);
    expect(realCapture.mock.calls[0][1]).toMatchObject({ phase: "stage-1" });
    expect(realCapture.mock.calls[1][1]).toMatchObject({ phase: "stage-2" });
  });

  it("caps the pre-flush queue at 50 to prevent runaway-error OOM", async () => {
    const realCapture = vi.fn();
    vi.doMock("@/lib/analytics/sentry", () => ({
      initSentryBoot: vi.fn(),
      initSentry: vi.fn(),
      captureBootCrash: realCapture,
      reportTimeToFirstRender: vi.fn(),
    }));

    const shim = await import("../sentry-boot-shim");

    // 200 calls — queue must clamp at 50.
    for (let i = 0; i < 200; i++) {
      shim.captureBootCrash(new Error(`err-${i}`));
    }
    await shim.flushSentryBoot();
    // Queue cap is 50 (see sentry-boot-shim.ts pushCrash).
    expect(realCapture.mock.calls.length).toBeLessThanOrEqual(51);
  });

  it("flushSentryBoot is idempotent (second call is a no-op)", async () => {
    const realInit = vi.fn();
    vi.doMock("@/lib/analytics/sentry", () => ({
      initSentryBoot: vi.fn(),
      initSentry: realInit,
      captureBootCrash: vi.fn(),
      reportTimeToFirstRender: vi.fn(),
    }));

    const shim = await import("../sentry-boot-shim");
    await shim.flushSentryBoot();
    await shim.flushSentryBoot();
    expect(realInit).toHaveBeenCalledTimes(1);
  });
});
