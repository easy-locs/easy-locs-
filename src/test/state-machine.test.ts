import { describe, it, expect } from "vitest";
import {
  StateMachine, runWorkflow, createLeaseMachine, createPaymentMachine,
} from "@/lib/state-machine";

describe("StateMachine", () => {
  it("starts in initial state", () => {
    const m = createLeaseMachine();
    expect(m.state).toBe("draft");
  });

  it("transitions on valid events", () => {
    const m = createLeaseMachine();
    expect(m.send("submit")).toBe(true);
    expect(m.state).toBe("pending");
  });

  it("rejects invalid events", () => {
    const m = createLeaseMachine();
    expect(m.send("approve")).toBe(false);
    expect(m.state).toBe("draft");
  });

  it("reports available events", () => {
    const m = createLeaseMachine();
    expect(m.availableEvents()).toEqual(["submit"]);
  });

  it("can() checks transitions", () => {
    const m = createLeaseMachine();
    expect(m.can("submit")).toBe(true);
    expect(m.can("terminate")).toBe(false);
  });

  it("matches states", () => {
    const m = createLeaseMachine();
    expect(m.matches("draft")).toBe(true);
    expect(m.matches("active", "draft")).toBe(true);
  });

  it("tracks history", () => {
    const m = createLeaseMachine();
    m.send("submit");
    m.send("approve");
    expect(m.getHistory()).toHaveLength(2);
  });

  it("notifies subscribers", () => {
    const m = createLeaseMachine();
    const states: string[] = [];
    m.subscribe(s => states.push(s));
    m.send("submit");
    expect(states).toEqual(["pending"]);
  });

  it("reset returns to initial", () => {
    const m = createLeaseMachine();
    m.send("submit");
    m.reset();
    expect(m.state).toBe("draft");
  });
});

describe("PaymentMachine", () => {
  it("flows through happy path", () => {
    const m = createPaymentMachine();
    m.send("process");
    m.send("complete");
    expect(m.state).toBe("completed");
  });

  it("handles failure and retry", () => {
    const m = createPaymentMachine();
    m.send("process");
    m.send("fail");
    expect(m.state).toBe("failed");
    m.send("retry");
    expect(m.state).toBe("processing");
  });
});

describe("Workflow Engine", () => {
  it("runs all steps in sequence", async () => {
    const result = await runWorkflow([
      { id: "s1", execute: async (ctx: number) => ctx + 1 },
      { id: "s2", execute: async (ctx: number) => ctx * 2 },
    ], 1);
    expect(result.success).toBe(true);
    expect(result.context).toBe(4);
    expect(result.completedSteps).toEqual(["s1", "s2"]);
  });

  it("rolls back on failure", async () => {
    const result = await runWorkflow([
      { id: "s1", execute: async (ctx: number) => ctx + 10, rollback: async (ctx: number) => ctx - 10 },
      { id: "s2", execute: async () => { throw new Error("boom"); } },
    ], 0);
    expect(result.success).toBe(false);
    expect(result.failedStep).toBe("s2");
    expect(result.context).toBe(0);
  });

  it("retries failed steps", async () => {
    let attempts = 0;
    const result = await runWorkflow([
      { id: "s1", retries: 2, execute: async (ctx: number) => {
        attempts++;
        if (attempts < 3) throw new Error("retry");
        return ctx + 1;
      }},
    ], 0);
    expect(result.success).toBe(true);
    expect(attempts).toBe(3);
  });
});
