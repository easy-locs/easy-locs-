import { describe, it, expect } from "vitest";
import { StateMachine, executeWorkflow } from "@/lib/state-machine";
import type { WorkflowStep } from "@/lib/state-machine";

describe("State Machine — AW", () => {
  const createBookingMachine = () =>
    new StateMachine({
      id: "booking",
      initial: "draft" as const,
      context: { attempts: 0 },
      transitions: [
        { from: "draft", event: "submit", to: "pending" },
        { from: "pending", event: "approve", to: "confirmed" },
        { from: "pending", event: "reject", to: "cancelled" },
        { from: "confirmed", event: "complete", to: "completed" },
        { from: ["draft", "pending"] as any, event: "cancel", to: "cancelled" },
        {
          from: "pending", event: "retry", to: "pending",
          guard: (ctx) => ctx.attempts < 3,
          effect: (ctx) => ({ ...ctx, attempts: ctx.attempts + 1 }),
        },
      ],
    });

  describe("Basic transitions", () => {
    it("starts in initial state", () => {
      const m = createBookingMachine();
      expect(m.current).toBe("draft");
    });

    it("transitions on valid event", () => {
      const m = createBookingMachine();
      expect(m.send("submit")).toBe(true);
      expect(m.current).toBe("pending");
    });

    it("rejects invalid event", () => {
      const m = createBookingMachine();
      expect(m.send("approve" as any)).toBe(false);
      expect(m.current).toBe("draft");
    });
  });

  describe("Guards and effects", () => {
    it("guard blocks transition", () => {
      const m = createBookingMachine();
      m.send("submit");
      m.send("retry"); // attempts=1
      m.send("retry"); // attempts=2
      m.send("retry"); // attempts=3
      expect(m.send("retry")).toBe(false); // blocked by guard
    });

    it("effect updates context", () => {
      const m = createBookingMachine();
      m.send("submit");
      m.send("retry");
      expect(m.context.attempts).toBe(1);
    });
  });

  describe("can() and allowedEvents()", () => {
    it("can checks validity", () => {
      const m = createBookingMachine();
      expect(m.can("submit")).toBe(true);
      expect(m.can("approve" as any)).toBe(false);
    });

    it("allowedEvents lists valid events", () => {
      const m = createBookingMachine();
      expect(m.allowedEvents()).toContain("submit");
      expect(m.allowedEvents()).toContain("cancel");
    });
  });

  describe("History and reset", () => {
    it("tracks history", () => {
      const m = createBookingMachine();
      m.send("submit");
      m.send("approve");
      expect(m.history).toEqual(["draft", "pending", "confirmed"]);
    });

    it("reset restores initial", () => {
      const m = createBookingMachine();
      m.send("submit");
      m.reset();
      expect(m.current).toBe("draft");
      expect(m.context.attempts).toBe(0);
    });
  });

  describe("subscribe", () => {
    it("notifies on transitions", () => {
      const m = createBookingMachine();
      const states: string[] = [];
      m.subscribe((s) => states.push(s.current));
      m.send("submit");
      m.send("approve");
      expect(states).toEqual(["pending", "confirmed"]);
    });

    it("unsubscribe works", () => {
      const m = createBookingMachine();
      const states: string[] = [];
      const unsub = m.subscribe((s) => states.push(s.current));
      m.send("submit");
      unsub();
      m.send("approve");
      expect(states).toEqual(["pending"]);
    });
  });

  describe("Workflow Engine", () => {
    it("executes steps in order", async () => {
      const steps: WorkflowStep<{ log: string[] }> = [
        { id: "a", execute: async (ctx) => ({ log: [...ctx.log, "a"] }) },
        { id: "b", execute: async (ctx) => ({ log: [...ctx.log, "b"] }) },
      ] as any;
      const result = await executeWorkflow(steps as any, { log: [] });
      expect(result.success).toBe(true);
      expect(result.context.log).toEqual(["a", "b"]);
      expect(result.completedSteps).toEqual(["a", "b"]);
    });

    it("compensates on failure", async () => {
      const compensated: string[] = [];
      const steps: WorkflowStep<{}>[] = [
        {
          id: "a",
          execute: async (ctx) => ctx,
          compensate: async (ctx) => { compensated.push("a"); return ctx; },
        },
        { id: "b", execute: async () => { throw new Error("fail"); } },
      ];
      const result = await executeWorkflow(steps, {});
      expect(result.success).toBe(false);
      expect(result.failedStep).toBe("b");
      expect(compensated).toContain("a");
    });

    it("retries before failing", async () => {
      let attempts = 0;
      const steps: WorkflowStep<{}>[] = [
        {
          id: "flaky",
          retries: 2,
          execute: async (ctx) => {
            attempts++;
            if (attempts < 3) throw new Error("flaky");
            return ctx;
          },
        },
      ];
      const result = await executeWorkflow(steps, {});
      expect(result.success).toBe(true);
      expect(attempts).toBe(3);
    });
  });
});
