import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { platformBus } from "@/lib/shared/platform-bus";

describe("Platform Bus", () => {
  const unsubs: (() => void)[] = [];

  beforeEach(() => {
    platformBus.clear();
    platformBus.clearLogs();
  });

  afterEach(() => {
    unsubs.forEach((u) => u());
    unsubs.length = 0;
    platformBus.clear();
    platformBus.clearLogs();
  });

  it("emits and receives events", () => {
    const handler = vi.fn();
    unsubs.push(platformBus.on("orbit:message_sent", handler));
    platformBus.emit("orbit:message_sent", { threadId: "t1" }, "orbit");
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0].payload).toEqual({ threadId: "t1" });
  });

  it("unsubscribe stops events", () => {
    const handler = vi.fn();
    const unsub = platformBus.on("wallet:transfer_sent", handler);
    unsub();
    platformBus.emit("wallet:transfer_sent", { amount: 100 }, "wallet");
    expect(handler).not.toHaveBeenCalled();
  });

  it("multiple listeners on same event", () => {
    const h1 = vi.fn();
    const h2 = vi.fn();
    unsubs.push(platformBus.on("wallet:balance_updated", h1));
    unsubs.push(platformBus.on("wallet:balance_updated", h2));
    platformBus.emit("wallet:balance_updated", {}, "wallet");
    expect(h1).toHaveBeenCalled();
    expect(h2).toHaveBeenCalled();
  });

  it("event includes timestamp and source", () => {
    const handler = vi.fn();
    unsubs.push(platformBus.on("system:sync_completed", handler));
    platformBus.emit("system:sync_completed", {}, "system");
    const event = handler.mock.calls[0][0];
    expect(event.source).toBe("system");
    expect(event.timestamp).toBeGreaterThan(0);
  });

  it("getLog returns recent events", () => {
    platformBus.emit("deal:created", { id: "d1" }, "marketplace");
    const log = platformBus.getLog();
    expect(log.length).toBeGreaterThan(0);
    expect(log.some((e: any) => e.type === "deal:created")).toBe(true);
  });
});
