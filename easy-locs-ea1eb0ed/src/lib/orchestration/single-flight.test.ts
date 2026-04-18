import { describe, it, expect, vi } from "vitest";
import { SingleFlight } from "./single-flight";

describe("SingleFlight", () => {
  it("collapses concurrent callers into one execution", async () => {
    const sf = new SingleFlight();
    const fn = vi.fn(async () => {
      await new Promise((r) => setTimeout(r, 10));
      return 42;
    });

    const [a, b, c] = await Promise.all([
      sf.run("k", fn),
      sf.run("k", fn),
      sf.run("k", fn),
    ]);

    expect(fn).toHaveBeenCalledTimes(1);
    expect(a).toBe(42);
    expect(b).toBe(42);
    expect(c).toBe(42);
  });

  it("runs again after a successful completion", async () => {
    const sf = new SingleFlight();
    const fn = vi.fn(async () => "ok");
    await sf.run("k", fn);
    await sf.run("k", fn);
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("emits the documented state transitions", async () => {
    const sf = new SingleFlight();
    const states: string[] = [];
    sf.on((_k, from, to) => states.push(`${from}->${to}`));
    await sf.run("k", async () => "x");
    expect(states).toEqual(["idle->running", "running->succeeded"]);
  });

  it("times out a stuck flow and surfaces the timeout state", async () => {
    const sf = new SingleFlight();
    const states: string[] = [];
    sf.on((_k, _f, to) => states.push(to));

    await expect(
      sf.run("k", () => new Promise(() => {}), { timeoutMs: 20 }),
    ).rejects.toThrow(/single-flight timeout/);

    expect(states).toContain("timeout");
    expect(sf.isRunning("k")).toBe(false);
  });

  it("propagates errors and frees the slot for retry", async () => {
    const sf = new SingleFlight();
    await expect(
      sf.run("k", async () => {
        throw new Error("nope");
      }),
    ).rejects.toThrow("nope");

    const result = await sf.run("k", async () => "recovered");
    expect(result).toBe("recovered");
  });
});
