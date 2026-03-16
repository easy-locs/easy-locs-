import { describe, it, expect, beforeEach } from "vitest";
import { TaskQueue, JobScheduler } from "@/lib/task-queue";

describe("Task Queue — AX", () => {
  describe("TaskQueue", () => {
    it("enqueues and processes tasks", async () => {
      const q = new TaskQueue({ concurrency: 2 });
      const results: number[] = [];

      q.enqueue("t1", async () => { results.push(1); return 1; });
      q.enqueue("t2", async () => { results.push(2); return 2; });

      await q.drain();
      expect(results).toContain(1);
      expect(results).toContain(2);
      expect(q.stats().completed).toBe(2);
    });

    it("respects priority order", async () => {
      const q = new TaskQueue({ concurrency: 1 });
      const order: string[] = [];

      // Pause to control ordering
      q.pause();
      q.enqueue("low", async () => { order.push("low"); }, { priority: "low" });
      q.enqueue("critical", async () => { order.push("critical"); }, { priority: "critical" });
      q.enqueue("high", async () => { order.push("high"); }, { priority: "high" });
      q.resume();

      await q.drain();
      expect(order[0]).toBe("critical");
      expect(order[1]).toBe("high");
      expect(order[2]).toBe("low");
    });

    it("cancels pending task", async () => {
      const q = new TaskQueue({ concurrency: 1 });
      q.pause();
      const id = q.enqueue("cancel-me", async () => {});
      expect(q.cancel(id)).toBe(true);
      expect(q.getTask(id)?.status).toBe("cancelled");
    });

    it("retries failed tasks", async () => {
      let attempts = 0;
      const q = new TaskQueue({ concurrency: 1, retryDelayMs: 10 });
      q.enqueue("retry", async () => {
        attempts++;
        if (attempts < 3) throw new Error("fail");
        return "ok";
      }, { maxRetries: 3 });

      await q.drain();
      expect(attempts).toBe(3);
    });

    it("prune removes completed tasks", async () => {
      const q = new TaskQueue({ concurrency: 2 });
      q.enqueue("a", async () => {});
      q.enqueue("b", async () => {});
      await q.drain();
      const pruned = q.prune();
      expect(pruned).toBe(2);
      expect(q.size).toBe(0);
    });

    it("stats reports correctly", async () => {
      const q = new TaskQueue({ concurrency: 5 });
      q.enqueue("a", async () => {});
      await q.drain();
      const s = q.stats();
      expect(s.completed).toBe(1);
      expect(s.total).toBe(1);
    });

    it("pause and resume work", () => {
      const q = new TaskQueue();
      q.pause();
      expect(q.isPaused).toBe(true);
      q.resume();
      expect(q.isPaused).toBe(false);
    });
  });

  describe("JobScheduler", () => {
    it("schedules and stops a job", async () => {
      const scheduler = new JobScheduler();
      let count = 0;
      const id = scheduler.schedule("test-job", 50, async () => { count++; });

      await new Promise((r) => setTimeout(r, 160));
      scheduler.stop(id);
      expect(count).toBeGreaterThanOrEqual(2);
    });

    it("stopAll clears all jobs", () => {
      const scheduler = new JobScheduler();
      scheduler.schedule("a", 100, async () => {});
      scheduler.schedule("b", 100, async () => {});
      scheduler.stopAll();
      expect(scheduler.list()).toHaveLength(0);
    });

    it("list returns active jobs", () => {
      const scheduler = new JobScheduler();
      scheduler.schedule("x", 1000, async () => {});
      expect(scheduler.list()).toHaveLength(1);
      expect(scheduler.list()[0].name).toBe("x");
      scheduler.stopAll();
    });
  });
});
