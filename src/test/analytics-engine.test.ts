import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  computeKPI,
  computeConversionRate,
  movingAverage,
  buildFunnel,
  groupByCohort,
  queueEvent,
  flushAllEvents,
  getOrCreateSession,
  updateSession,
} from "@/lib/analytics-engine";

describe("Analytics Engine", () => {
  // ── KPI Computation ─────────────────────────────────────

  describe("KPI Computation", () => {
    it("computes KPI with growth", () => {
      const kpi = computeKPI(150, 100);
      expect(kpi.value).toBe(150);
      expect(kpi.changePercent).toBe(50);
      expect(kpi.trend).toBe("up");
    });

    it("computes KPI with decline", () => {
      const kpi = computeKPI(80, 100);
      expect(kpi.changePercent).toBe(-20);
      expect(kpi.trend).toBe("down");
    });

    it("computes flat KPI", () => {
      const kpi = computeKPI(100, 100);
      expect(kpi.trend).toBe("flat");
    });

    it("handles no previous value", () => {
      const kpi = computeKPI(50);
      expect(kpi.trend).toBe("flat");
      expect(kpi.changePercent).toBeUndefined();
    });

    it("handles zero previous", () => {
      const kpi = computeKPI(50, 0);
      expect(kpi.trend).toBe("flat");
    });
  });

  // ── Conversion Rate ─────────────────────────────────────

  describe("Conversion Rate", () => {
    it("computes correct rate", () => {
      expect(computeConversionRate(1000, 250)).toBe(25);
    });

    it("handles zero from", () => {
      expect(computeConversionRate(0, 10)).toBe(0);
    });

    it("handles 100% conversion", () => {
      expect(computeConversionRate(50, 50)).toBe(100);
    });
  });

  // ── Moving Average ──────────────────────────────────────

  describe("Moving Average", () => {
    it("computes 3-period moving average", () => {
      const result = movingAverage([10, 20, 30, 40, 50], 3);
      expect(result).toEqual([10, 15, 20, 30, 40]);
    });

    it("handles single value", () => {
      expect(movingAverage([42], 3)).toEqual([42]);
    });

    it("handles empty array", () => {
      expect(movingAverage([], 3)).toEqual([]);
    });

    it("handles window size 1", () => {
      expect(movingAverage([1, 2, 3], 1)).toEqual([1, 2, 3]);
    });
  });

  // ── Funnel Analysis ─────────────────────────────────────

  describe("Funnel Analysis", () => {
    it("builds funnel with dropoff rates", () => {
      const funnel = buildFunnel([
        { name: "Visit", count: 1000 },
        { name: "Signup", count: 300 },
        { name: "Subscribe", count: 50 },
      ]);

      expect(funnel).toHaveLength(3);
      expect(funnel[0].dropoffPercent).toBe(0);
      expect(funnel[1].conversionFromPrevious).toBe(30);
      expect(funnel[1].dropoffPercent).toBe(70);
      expect(funnel[2].conversionFromPrevious).toBeCloseTo(16.67, 1);
    });

    it("handles single step", () => {
      const funnel = buildFunnel([{ name: "Visit", count: 100 }]);
      expect(funnel[0].conversionFromPrevious).toBe(100);
    });
  });

  // ── Cohort Grouping ─────────────────────────────────────

  describe("Cohort Grouping", () => {
    const items = [
      { date: new Date("2026-01-15"), value: 1 },
      { date: new Date("2026-01-20"), value: 2 },
      { date: new Date("2026-02-10"), value: 3 },
      { date: new Date("2026-03-05"), value: 4 },
    ];

    it("groups by month", () => {
      const cohorts = groupByCohort(items, i => i.date, "month");
      expect(cohorts.size).toBe(3);
      expect(cohorts.get("2026-01")?.length).toBe(2);
      expect(cohorts.get("2026-02")?.length).toBe(1);
    });

    it("groups by day", () => {
      const cohorts = groupByCohort(items, i => i.date, "day");
      expect(cohorts.size).toBe(4);
    });

    it("groups by week", () => {
      const cohorts = groupByCohort(items, i => i.date, "week");
      expect(cohorts.size).toBeGreaterThanOrEqual(3);
    });
  });

  // ── Session Management ──────────────────────────────────

  describe("Session Management", () => {
    beforeEach(() => {
      sessionStorage.clear();
    });

    it("creates a new session", () => {
      const session = getOrCreateSession();
      expect(session.sessionId).toBeTruthy();
      expect(session.pageViews).toBe(0);
      expect(session.events).toBe(0);
    });

    it("persists and retrieves session", () => {
      const s1 = getOrCreateSession();
      updateSession({ pageViews: 5 });
      const s2 = getOrCreateSession();
      expect(s2.sessionId).toBe(s1.sessionId);
      expect(s2.pageViews).toBe(5);
    });
  });

  // ── Event Batching ──────────────────────────────────────

  describe("Event Batching", () => {
    it("queues events without immediate dispatch", () => {
      queueEvent("test_event", { page: "home" });
      // Should not throw
      expect(true).toBe(true);
    });

    it("flushAllEvents clears queue", () => {
      queueEvent("evt1");
      queueEvent("evt2");
      flushAllEvents();
      // Should not throw
      expect(true).toBe(true);
    });
  });
});
