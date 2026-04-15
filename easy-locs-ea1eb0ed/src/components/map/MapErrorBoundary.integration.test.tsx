import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { MapErrorBoundary } from "./MapErrorBoundary";

vi.mock("@/lib/observability/structured-logger", () => ({
  structuredLogger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    critical: vi.fn(),
    timed: vi.fn(),
    getBuffer: vi.fn(() => []),
    getRecentByDomain: vi.fn(() => []),
    getErrorsByDomain: vi.fn(() => []),
    setMinLevel: vi.fn(),
    flush: vi.fn(() => []),
  },
}));

vi.mock("@/lib/analytics/event-bus", () => ({
  trackEvent: vi.fn(),
  onEvent: vi.fn(() => () => {}),
  drainEvents: vi.fn(() => []),
}));

import { structuredLogger } from "@/lib/observability/structured-logger";
import { trackEvent } from "@/lib/analytics/event-bus";

function CrashingChild() {
  throw new Error("Simulated map crash");
}

describe("MapErrorBoundary integration — analytics pipeline", () => {
  const originalConsoleWarn = console.warn;
  const originalConsoleError = console.error;

  beforeEach(() => {
    console.warn = vi.fn();
    console.error = vi.fn();
    vi.clearAllMocks();
  });

  afterEach(() => {
    console.warn = originalConsoleWarn;
    console.error = originalConsoleError;
  });

  it("calls structuredLogger.error with error_boundary_crash payload on child crash", () => {
    render(
      <MapErrorBoundary>
        <CrashingChild />
      </MapErrorBoundary>,
    );

    expect(screen.getByText("Map unavailable")).toBeInTheDocument();

    expect(structuredLogger.error).toHaveBeenCalledTimes(1);
    expect(structuredLogger.error).toHaveBeenCalledWith(
      "maps",
      "error_boundary_crash",
      "Simulated map crash",
      expect.objectContaining({
        result: "failure",
        error_classification: "runtime",
        payload_summary: expect.objectContaining({
          component: "MapErrorBoundary",
        }),
      }),
    );
  });

  it("calls trackEvent with map.load_failure and runtime error_type on child crash", () => {
    render(
      <MapErrorBoundary>
        <CrashingChild />
      </MapErrorBoundary>,
    );

    expect(trackEvent).toHaveBeenCalledTimes(1);
    expect(trackEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "map.load_failure",
        metadata: expect.objectContaining({
          component: "MapErrorBoundary",
          error_type: "runtime",
          error_message: "Simulated map crash",
        }),
      }),
    );
  });

  it("includes component_stack in both structured log and event payload", () => {
    render(
      <MapErrorBoundary>
        <CrashingChild />
      </MapErrorBoundary>,
    );

    const logCall = vi.mocked(structuredLogger.error).mock.calls[0];
    const logExtra = logCall[3] as Record<string, unknown>;
    const logPayload = logExtra.payload_summary as Record<string, unknown>;
    expect(logPayload).toHaveProperty("component_stack");

    const eventCall = vi.mocked(trackEvent).mock.calls[0];
    const eventArg = eventCall[0] as { metadata: Record<string, unknown> };
    expect(eventArg.metadata).toHaveProperty("component_stack");
  });
});
