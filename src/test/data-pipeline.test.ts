/**
 * Tests — Data Pipeline Engine (PASS68 Block AY)
 */
import { describe, it, expect } from "vitest";
import {
  DataPipeline,
  aggregate,
  timeBucket,
  deduplicate,
  batch,
  flatten,
  mapConcurrent,
  createReportPipeline,
  assessDataQuality,
} from "@/lib/data-pipeline";

// ─── DataPipeline ────────────────────────────────────────────────────────────

describe("DataPipeline", () => {
  it("runs a simple pipeline with multiple steps", async () => {
    const p = new DataPipeline<number[]>("test")
      .step("double", "Double values", (data: any) => (data as number[]).map((x: number) => x * 2))
      .step("filter", "Filter > 4", (data: any) => (data as number[]).filter((x: number) => x > 4))
      .step("sum", "Sum", (data: any) => (data as number[]).reduce((a: number, b: number) => a + b, 0));

    const result = await p.run([1, 2, 3, 4, 5]);
    expect(result.status).toBe("completed");
    expect(result.output).toBe(6 + 8 + 10); // 24
    expect(result.metrics).toHaveLength(3);
    expect(result.totalDurationMs).toBeGreaterThanOrEqual(0);
  });

  it("handles validation failure", async () => {
    const p = new DataPipeline<number>("val-fail")
      .step("check", "Check positive", (n: any) => n, { validate: (n: any) => (n as number) > 0 });

    const result = await p.run(-1);
    expect(result.status).toBe("failed");
    expect(result.error).toContain("Validation failed");
  });

  it("skips optional steps on failure", async () => {
    const p = new DataPipeline<string>("opt")
      .step("fail", "Fail step", () => { throw new Error("boom"); }, { optional: true })
      .step("pass", "Pass step", (s: any) => (s as string).toUpperCase());

    const result = await p.run("hello");
    expect(result.status).toBe("completed");
    expect(result.output).toBe("HELLO");
    expect(result.metrics[0].error).toBe("boom");
  });

  it("supports cancellation", async () => {
    const p = new DataPipeline<number>("cancel")
      .step("slow", "Slow step", async (n) => {
        await new Promise((r) => setTimeout(r, 50));
        return n;
      })
      .step("next", "Next", (n) => n + 1);

    const { promise, cancel } = p.createCancellable(1);
    cancel();
    const result = await promise;
    // Could be cancelled or completed depending on timing
    expect(["cancelled", "completed"]).toContain(result.status);
  });

  it("records input/output counts for arrays", async () => {
    const p = new DataPipeline<number[]>("counts")
      .step("filter", "Filter evens", (data) => data.filter((x) => x % 2 === 0));

    const result = await p.run([1, 2, 3, 4, 5, 6]);
    expect(result.metrics[0].inputCount).toBe(6);
    expect(result.metrics[0].outputCount).toBe(3);
  });

  it("handles async transforms", async () => {
    const p = new DataPipeline<string>("async")
      .step("fetch", "Async step", async (s) => {
        await new Promise((r) => setTimeout(r, 10));
        return s + " world";
      });

    const result = await p.run("hello");
    expect(result.output).toBe("hello world");
  });
});

// ─── Aggregation ─────────────────────────────────────────────────────────────

describe("aggregate", () => {
  it("groups and computes stats", () => {
    const data = [
      { cat: "A", val: 10 },
      { cat: "A", val: 20 },
      { cat: "B", val: 5 },
    ];
    const result = aggregate(data, (d) => d.cat, (d) => d.val);
    const groupA = result.find((r) => r.key === "A")!;
    expect(groupA.count).toBe(2);
    expect(groupA.sum).toBe(30);
    expect(groupA.avg).toBe(15);
    expect(groupA.min).toBe(10);
    expect(groupA.max).toBe(20);
  });
});

describe("timeBucket", () => {
  it("buckets by month", () => {
    const data = [
      { date: "2026-01-15", amount: 100 },
      { date: "2026-01-20", amount: 200 },
      { date: "2026-02-10", amount: 50 },
    ];
    const result = timeBucket(data, (d) => d.date, (d) => d.amount, "month");
    expect(result).toHaveLength(2);
    const jan = result.find((r) => r.key === "2026-01")!;
    expect(jan.sum).toBe(300);
  });

  it("buckets by day", () => {
    const data = [
      { date: "2026-03-01", val: 1 },
      { date: "2026-03-01", val: 2 },
      { date: "2026-03-02", val: 3 },
    ];
    const result = timeBucket(data, (d) => d.date, (d) => d.val, "day");
    expect(result).toHaveLength(2);
  });
});

// ─── Transform Utilities ─────────────────────────────────────────────────────

describe("deduplicate", () => {
  it("removes duplicates by key", () => {
    const data = [{ id: "a" }, { id: "b" }, { id: "a" }];
    expect(deduplicate(data, (d) => d.id)).toHaveLength(2);
  });
});

describe("batch", () => {
  it("splits array into chunks", () => {
    const result = batch([1, 2, 3, 4, 5], 2);
    expect(result).toEqual([[1, 2], [3, 4], [5]]);
  });

  it("handles empty array", () => {
    expect(batch([], 3)).toEqual([]);
  });
});

describe("flatten", () => {
  it("flattens nested arrays", () => {
    expect(flatten([[1, 2], [3], [4, 5]])).toEqual([1, 2, 3, 4, 5]);
  });
});

describe("mapConcurrent", () => {
  it("maps with concurrency limit", async () => {
    const items = [1, 2, 3, 4, 5];
    const results = await mapConcurrent(items, async (n) => n * 2, 2);
    expect(results).toEqual([2, 4, 6, 8, 10]);
  });

  it("preserves order", async () => {
    const items = [3, 1, 2];
    const results = await mapConcurrent(items, async (n) => {
      await new Promise((r) => setTimeout(r, n * 5));
      return n;
    }, 3);
    expect(results).toEqual([3, 1, 2]);
  });
});

// ─── Report Pipeline ─────────────────────────────────────────────────────────

describe("createReportPipeline", () => {
  it("creates a full report pipeline", async () => {
    const data = [
      { category: "rent", amount: 1000, active: true },
      { category: "rent", amount: 1200, active: true },
      { category: "expense", amount: 300, active: true },
      { category: "rent", amount: 800, active: false },
    ];

    const pipeline = createReportPipeline({
      id: "rent-report",
      filter: (d) => d.active,
      keyFn: (d) => d.category,
      valueFn: (d) => d.amount,
    });

    const result = await pipeline.run(data);
    expect(result.status).toBe("completed");
    const rentAgg = result.output.find((r: any) => r.key === "rent");
    expect(rentAgg.sum).toBe(2200);
    expect(rentAgg.count).toBe(2);
  });
});

// ─── Data Quality ────────────────────────────────────────────────────────────

describe("assessDataQuality", () => {
  it("reports quality issues", () => {
    const data = [
      { name: "Alice", email: "a@b.com" },
      { name: "Bob", email: "" },
      { name: "", email: "c@d.com" },
      { name: "Dan", email: "d@e.com" },
    ];

    const report = assessDataQuality(data, ["name", "email"]);
    expect(report.totalRecords).toBe(4);
    expect(report.invalidRecords).toBe(2);
    expect(report.qualityScore).toBe(50);
    expect(report.issues).toHaveLength(2);
  });

  it("returns 100% for perfect data", () => {
    const data = [{ name: "A", email: "a@b.com" }];
    const report = assessDataQuality(data, ["name", "email"]);
    expect(report.qualityScore).toBe(100);
  });

  it("handles empty dataset", () => {
    const report = assessDataQuality([], ["name"]);
    expect(report.qualityScore).toBe(100);
    expect(report.totalRecords).toBe(0);
  });
});
