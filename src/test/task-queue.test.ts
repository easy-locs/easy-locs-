import { describe, it, expect, beforeEach } from "vitest";
import { TaskQueue, JobScheduler } from "@/lib/task-queue";

describe("TaskQueue", () => {
  let queue: TaskQueue;
  beforeEach(() => { queue = new TaskQueue(2); });

  it("adds and processes tasks", async () => {
    const task = queue.add({ id: "t1", name: "Test", execute: async () => 42 });
    await new Promise(r => setTimeout(r, 50));
    expect(task.status).toBe("completed");
    expect(task.result).toBe(42);
  });

  it("respects concurrency", async () => {
    let running = 0; let maxRunning = 0;
    const slow = () => new Promise<void>(r => {
      running++; maxRunning = Math.max(maxRunning, running);
      setTimeout(() => { running--; r(); }, 30);
    });
    queue.add({ id: "t1", name: "A", execute: slow });
    queue.add({ id: "t2", name: "B", execute: slow });
    queue.add({ id: "t3", name: "C", execute: slow });
    await new Promise(r => setTimeout(r, 200));
    expect(maxRunning).toBeLessThanOrEqual(2);
  });

  it("cancels queued tasks", () => {
    const q = new TaskQueue(0); // no auto-run
    q.add({ id: "t1", name: "A", execute: async () => {} });
    expect(q.cancel("t1")).toBe(true);
  });

  it("handles priority ordering", () => {
    const q = new TaskQueue(0);
    q.add({ id: "lo", name: "Low", priority: "low", execute: async () => {} });
    q.add({ id: "hi", name: "High", priority: "critical", execute: async () => {} });
    const tasks = q.all();
    expect(tasks[0].id).toBe("hi");
  });

  it("emits events", async () => {
    const events: string[] = [];
    queue.on("added", () => events.push("added"));
    queue.on("completed", () => events.push("completed"));
    queue.add({ id: "t1", name: "Test", execute: async () => {} });
    await new Promise(r => setTimeout(r, 50));
    expect(events).toContain("added");
    expect(events).toContain("completed");
  });

  it("retries failed tasks", async () => {
    let attempts = 0;
    const task = queue.add({
      id: "t1", name: "Retry", maxRetries: 2,
      execute: async () => { attempts++; if (attempts < 3) throw new Error("fail"); return "ok"; },
    });
    await new Promise(r => setTimeout(r, 200));
    expect(task.status).toBe("completed");
    expect(attempts).toBe(3);
  });

  it("pause/resume works", async () => {
    queue.pause();
    queue.add({ id: "t1", name: "Test", execute: async () => 1 });
    await new Promise(r => setTimeout(r, 50));
    expect(queue.size).toBe(1);
    queue.resume();
    await new Promise(r => setTimeout(r, 50));
    expect(queue.size).toBe(0);
  });
});

describe("JobScheduler", () => {
  it("schedules and lists jobs", () => {
    const scheduler = new JobScheduler();
    scheduler.schedule({ id: "j1", name: "Test", intervalMs: 60000, execute: async () => {} });
    expect(scheduler.list()).toHaveLength(1);
    scheduler.clear();
  });

  it("unschedules jobs", () => {
    const scheduler = new JobScheduler();
    scheduler.schedule({ id: "j1", name: "Test", intervalMs: 60000, execute: async () => {} });
    scheduler.unschedule("j1");
    expect(scheduler.list()).toHaveLength(0);
  });
});
