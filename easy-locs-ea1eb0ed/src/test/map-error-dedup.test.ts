import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("@/lib/observability/structured-logger", () => ({
  structuredLogger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
  },
}));

vi.mock("@/lib/analytics/event-bus", () => ({
  trackEvent: vi.fn(),
}));

vi.mock("@/services/db", () => ({
  db: { from: vi.fn().mockReturnValue({ insert: vi.fn().mockResolvedValue({ data: null, error: null }) }) },
}));

describe("classifyMapError — error classification", () => {
  let classifyMapError: typeof import("@/lib/analytics/map-error-analytics").classifyMapError;

  beforeEach(async () => {
    vi.resetModules();
    const mod = await import("@/lib/analytics/map-error-analytics");
    classifyMapError = mod.classifyMapError;
  });

  it("classifies token errors", () => {
    expect(classifyMapError("Access token expired")).toBe("token");
    expect(classifyMapError("401 Unauthorized")).toBe("token");
    expect(classifyMapError("403 not authorized")).toBe("token");
    expect(classifyMapError("Invalid token provided")).toBe("token");
  });

  it("classifies WebGL errors", () => {
    expect(classifyMapError("WebGL context lost")).toBe("webgl");
    expect(classifyMapError("3D rendering failed")).toBe("webgl");
    expect(classifyMapError("GPU acceleration unavailable")).toBe("webgl");
  });

  it("classifies network errors", () => {
    expect(classifyMapError("Network request failed")).toBe("network");
    expect(classifyMapError("Failed to load map library")).toBe("network");
    expect(classifyMapError("Connection timeout")).toBe("network");
    expect(classifyMapError("fetch error")).toBe("network");
    expect(classifyMapError("Device is offline")).toBe("network");
  });

  it("classifies init failures", () => {
    expect(classifyMapError("Map init failed")).toBe("init_failure");
    expect(classifyMapError("Container not found")).toBe("init_failure");
    expect(classifyMapError("Constructor error")).toBe("init_failure");
  });

  it("returns unknown for unrecognized errors", () => {
    expect(classifyMapError("Something went wrong")).toBe("unknown");
    expect(classifyMapError("")).toBe("unknown");
  });
});

describe("trackMapError — dedup and route-awareness", () => {
  let trackMapError: typeof import("@/lib/analytics/map-error-analytics").trackMapError;
  let getRecentErrorBuffer: typeof import("@/lib/analytics/map-error-analytics").getRecentErrorBuffer;
  let trackEvent: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    vi.resetModules();
    vi.useFakeTimers();

    vi.mock("@/lib/observability/structured-logger", () => ({
      structuredLogger: {
        error: vi.fn(),
        warn: vi.fn(),
        info: vi.fn(),
      },
    }));
    vi.mock("@/lib/analytics/event-bus", () => ({
      trackEvent: vi.fn(),
    }));
    vi.mock("@/services/db", () => ({
      db: { from: vi.fn().mockReturnValue({ insert: vi.fn().mockResolvedValue({ data: null, error: null }) }) },
    }));

    const mod = await import("@/lib/analytics/map-error-analytics");
    trackMapError = mod.trackMapError;
    getRecentErrorBuffer = mod.getRecentErrorBuffer;
    const eventBus = await import("@/lib/analytics/event-bus");
    trackEvent = eventBus.trackEvent as ReturnType<typeof vi.fn>;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("tracks first error and adds to buffer", () => {
    trackMapError({ component: "LiveMap", errorMessage: "WebGL context lost" });
    const buffer = getRecentErrorBuffer();
    expect(buffer.length).toBeGreaterThanOrEqual(1);
    const last = buffer[buffer.length - 1];
    expect(last.component).toBe("LiveMap");
    expect(last.errorType).toBe("webgl");
  });

  it("deduplicates identical errors within 10s window", () => {
    trackMapError({ component: "LiveMap", errorMessage: "WebGL context lost" });
    const callCount1 = trackEvent.mock.calls.length;

    trackMapError({ component: "LiveMap", errorMessage: "WebGL context lost" });
    const callCount2 = trackEvent.mock.calls.length;

    expect(callCount2).toBe(callCount1);
  });

  it("allows same error after dedup window expires", () => {
    trackMapError({ component: "LiveMap", errorMessage: "WebGL context lost" });
    const callCount1 = trackEvent.mock.calls.length;

    vi.advanceTimersByTime(11_000);

    trackMapError({ component: "LiveMap", errorMessage: "WebGL context lost" });
    const callCount2 = trackEvent.mock.calls.length;

    expect(callCount2).toBe(callCount1 + 1);
  });

  it("route-awareness: same error on different routes is NOT deduped", () => {
    Object.defineProperty(window, "location", {
      value: { pathname: "/geo" },
      writable: true,
      configurable: true,
    });

    trackMapError({ component: "UnifiedMap", errorMessage: "Network failure" });
    const callCount1 = trackEvent.mock.calls.length;

    Object.defineProperty(window, "location", {
      value: { pathname: "/property" },
      writable: true,
      configurable: true,
    });

    trackMapError({ component: "UnifiedMap", errorMessage: "Network failure" });
    const callCount2 = trackEvent.mock.calls.length;

    expect(callCount2).toBe(callCount1 + 1);
  });

  it("dedup key includes component — different components are not deduped", () => {
    trackMapError({ component: "MapA", errorMessage: "Network failure" });
    const callCount1 = trackEvent.mock.calls.length;

    trackMapError({ component: "MapB", errorMessage: "Network failure" });
    const callCount2 = trackEvent.mock.calls.length;

    expect(callCount2).toBe(callCount1 + 1);
  });

  it("dedup key includes error type — different error types on same component are not deduped", () => {
    trackMapError({ component: "LiveMap", errorMessage: "WebGL context lost" });
    const callCount1 = trackEvent.mock.calls.length;

    trackMapError({ component: "LiveMap", errorMessage: "Network failure" });
    const callCount2 = trackEvent.mock.calls.length;

    expect(callCount2).toBe(callCount1 + 1);
  });

  it("records route in error buffer entries", () => {
    Object.defineProperty(window, "location", {
      value: { pathname: "/properties/123" },
      writable: true,
      configurable: true,
    });

    trackMapError({ component: "PropertyMap", errorMessage: "Token expired" });
    const buffer = getRecentErrorBuffer();
    const last = buffer[buffer.length - 1];
    expect(last.route).toBe("/properties/123");
  });

  it("buffer does not exceed MAX_ERROR_BUFFER limit", () => {
    for (let i = 0; i < 250; i++) {
      vi.advanceTimersByTime(11_000);
      trackMapError({ component: `Map${i}`, errorMessage: `Error ${i}` });
    }
    const buffer = getRecentErrorBuffer();
    expect(buffer.length).toBeLessThanOrEqual(200);
  });
});
