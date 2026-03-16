import { describe, it, expect, vi, beforeEach } from "vitest";
import { platformBus } from "@/lib/shared/platform-bus";

describe("Platform Bus", () => {
  beforeEach(() => {
    platformBus.offAll?.();
  });

  it("emits and receives events", () => {
    const handler = vi.fn();
    platformBus.on("orbit:message_sent", handler);
    platformBus.emit("orbit:message_sent", { threadId: "t1" });
    expect(handler).toHaveBeenCalledWith({ threadId: "t1" });
  });

  it("off removes listener", () => {
    const handler = vi.fn();
    platformBus.on("orbit:message_sent", handler);
    platformBus.off("orbit:message_sent", handler);
    platformBus.emit("orbit:message_sent", { threadId: "t1" });
    expect(handler).not.toHaveBeenCalled();
  });

  it("multiple listeners on same event", () => {
    const h1 = vi.fn();
    const h2 = vi.fn();
    platformBus.on("wallet:transfer_sent", h1);
    platformBus.on("wallet:transfer_sent", h2);
    platformBus.emit("wallet:transfer_sent", { amount: 100 });
    expect(h1).toHaveBeenCalled();
    expect(h2).toHaveBeenCalled();
  });
});
