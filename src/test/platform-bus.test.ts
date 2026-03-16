import { describe, it, expect, vi } from "vitest";
import { platformBus } from "@/lib/shared/platform-bus";

describe("Platform Bus", () => {
  it("emits and receives events", () => {
    const handler = vi.fn();
    const unsub = platformBus.on("orbit:message_sent", handler);
    platformBus.emit("orbit:message_sent", { threadId: "t1" }, "orbit");
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0].payload).toEqual({ threadId: "t1" });
    unsub();
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
    const u1 = platformBus.on("wallet:balance_updated", h1);
    const u2 = platformBus.on("wallet:balance_updated", h2);
    platformBus.emit("wallet:balance_updated", {}, "wallet");
    expect(h1).toHaveBeenCalled();
    expect(h2).toHaveBeenCalled();
    u1(); u2();
  });

  it("event includes timestamp and source", () => {
    const handler = vi.fn();
    const unsub = platformBus.on("system:sync_completed", handler);
    platformBus.emit("system:sync_completed", {}, "system");
    const event = handler.mock.calls[0][0];
    expect(event.source).toBe("system");
    expect(event.timestamp).toBeGreaterThan(0);
    unsub();
  });

  it("getLog returns recent events", () => {
    platformBus.emit("deal:created", { id: "d1" }, "orbit");
    const log = platformBus.getLog();
    expect(log.length).toBeGreaterThan(0);
    expect(log.some((e: any) => e.type === "deal:created")).toBe(true);
  });
});
