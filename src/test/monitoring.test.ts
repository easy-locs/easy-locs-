import { describe, it, expect } from "vitest";
import {
  pushEvent,
  getMonitoringEvents,
  resolveEvent,
  clearEvents,
  getEventSummary,
  logger,
} from "@/lib/monitoring";

describe("Monitoring Service", () => {
  beforeEach(() => clearEvents());

  describe("pushEvent", () => {
    it("adds event to store", () => {
      pushEvent({ type: "error", source: "test", message: "Test error" });
      const events = getMonitoringEvents();
      expect(events.length).toBe(1);
      expect(events[0].message).toBe("Test error");
      expect(events[0].severity).toBe("error");
    });

    it("auto-assigns severity from type", () => {
      pushEvent({ type: "warning", source: "test", message: "warn" });
      pushEvent({ type: "performance", source: "test", message: "perf" });
      const events = getMonitoringEvents();
      expect(events.find(e => e.message === "warn")?.severity).toBe("warning");
      expect(events.find(e => e.message === "perf")?.severity).toBe("info");
    });

    it("deduplicates rapid identical events", () => {
      pushEvent({ type: "error", source: "test", message: "Same error" });
      pushEvent({ type: "error", source: "test", message: "Same error" });
      pushEvent({ type: "error", source: "test", message: "Same error" });
      const events = getMonitoringEvents();
      expect(events.length).toBe(1);
      expect(events[0].count).toBe(3);
    });

    it("allows custom severity override", () => {
      pushEvent({ type: "error", source: "test", message: "critical!", severity: "critical" });
      expect(getMonitoringEvents()[0].severity).toBe("critical");
    });
  });

  describe("resolveEvent", () => {
    it("marks event as resolved", () => {
      const evt = pushEvent({ type: "error", source: "test", message: "fix me" });
      resolveEvent(evt!.id);
      expect(getMonitoringEvents()[0].resolved).toBe(true);
    });
  });

  describe("clearEvents", () => {
    it("removes all events", () => {
      pushEvent({ type: "error", source: "a", message: "1" });
      pushEvent({ type: "warning", source: "b", message: "2" });
      clearEvents();
      expect(getMonitoringEvents().length).toBe(0);
    });
  });

  describe("getEventSummary", () => {
    it("returns correct counts", () => {
      pushEvent({ type: "error", source: "a", message: "err1" });
      pushEvent({ type: "error", source: "b", message: "err2", severity: "critical" });
      pushEvent({ type: "warning", source: "c", message: "warn1" });
      pushEvent({ type: "performance", source: "d", message: "perf1" });

      const summary = getEventSummary();
      expect(summary.total).toBe(4);
      expect(summary.errors).toBe(2);
      expect(summary.warnings).toBe(1);
      expect(summary.performance).toBe(1);
      expect(summary.critical).toBe(1);
    });
  });

  describe("logger", () => {
    it("exports all log levels", () => {
      expect(typeof logger.info).toBe("function");
      expect(typeof logger.warn).toBe("function");
      expect(typeof logger.error).toBe("function");
      expect(typeof logger.critical).toBe("function");
    });
  });
});
