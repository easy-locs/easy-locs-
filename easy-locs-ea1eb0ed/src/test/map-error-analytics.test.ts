import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("@sentry/react", () => ({
  addBreadcrumb: vi.fn(),
  captureMessage: vi.fn(),
}));

vi.mock("@/lib/analytics/event-bus", () => ({
  trackEvent: vi.fn(),
}));

describe("trackMapError — classification and dedup integration", () => {
  let trackMapError: typeof import("@/lib/analytics/map-error-analytics").trackMapError;
  let classifyMapError: typeof import("@/lib/analytics/map-error-analytics").classifyMapError;
  let structuredLogger: typeof import("@/lib/observability/structured-logger").structuredLogger;
  let trackEvent: typeof import("@/lib/analytics/event-bus").trackEvent;

  beforeEach(async () => {
    vi.useFakeTimers();

    vi.resetModules();

    vi.mock("@sentry/react", () => ({
      addBreadcrumb: vi.fn(),
      captureMessage: vi.fn(),
    }));
    vi.mock("@/lib/analytics/event-bus", () => ({
      trackEvent: vi.fn(),
    }));

    const analytics = await import("@/lib/analytics/map-error-analytics");
    const logger = await import("@/lib/observability/structured-logger");
    const eventBus = await import("@/lib/analytics/event-bus");

    trackMapError = analytics.trackMapError;
    classifyMapError = analytics.classifyMapError;
    structuredLogger = logger.structuredLogger;
    trackEvent = eventBus.trackEvent;

    vi.spyOn(structuredLogger, "error");
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe("classifyMapError produces correct error_type", () => {
    const cases: Array<[string, string]> = [
      ["Invalid access token provided", "token"],
      ["401 Unauthorized", "token"],
      ["403 forbidden", "token"],
      ["not authorized to access", "token"],
      ["expired token detected", "token"],
      ["WebGL context lost", "webgl"],
      ["3D rendering not supported", "webgl"],
      ["GPU acceleration unavailable", "webgl"],
      ["Network error fetching tiles", "network"],
      ["Failed to load map library", "network"],
      ["Connection timeout", "network"],
      ["Device is offline", "network"],
      ["fetch failed", "network"],
      ["Map init error", "init_failure"],
      ["Container not found", "init_failure"],
      ["Constructor threw an error", "init_failure"],
      ["Something completely unexpected", "unknown"],
      ["", "unknown"],
    ];

    it.each(cases)('classifies "%s" as %s', (message, expectedType) => {
      expect(classifyMapError(message)).toBe(expectedType);
    });
  });

  describe("trackMapError sends correct error_type to logger and event bus", () => {
    it("auto-classifies token errors and passes error_type in payloads", () => {
      trackMapError({
        component: "LiveMap",
        errorMessage: "Invalid access token provided",
      });

      expect(structuredLogger.error).toHaveBeenCalledTimes(1);
      const logCall = vi.mocked(structuredLogger.error).mock.calls[0];
      expect(logCall[0]).toBe("maps");
      expect(logCall[1]).toBe("load_failure");
      expect(logCall[3]).toMatchObject({
        error_classification: "token",
        payload_summary: expect.objectContaining({
          component: "LiveMap",
          error_type: "token",
        }),
      });

      expect(trackEvent).toHaveBeenCalledTimes(1);
      expect(trackEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "map.load_failure",
          metadata: expect.objectContaining({
            component: "LiveMap",
            error_type: "token",
            error_message: "Invalid access token provided",
          }),
        }),
      );
    });

    it("auto-classifies webgl errors", () => {
      trackMapError({
        component: "PropertyMap",
        errorMessage: "WebGL context lost",
      });

      const logCall = vi.mocked(structuredLogger.error).mock.calls[0];
      expect(logCall[3]).toMatchObject({
        error_classification: "webgl",
        payload_summary: expect.objectContaining({ error_type: "webgl" }),
      });

      expect(trackEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({ error_type: "webgl" }),
        }),
      );
    });

    it("auto-classifies network errors", () => {
      trackMapError({
        component: "SearchMap",
        errorMessage: "Network error fetching tiles",
      });

      const logCall = vi.mocked(structuredLogger.error).mock.calls[0];
      expect(logCall[3]).toMatchObject({
        error_classification: "network",
        payload_summary: expect.objectContaining({ error_type: "network" }),
      });
    });

    it("respects explicit errorType override", () => {
      trackMapError({
        component: "LiveMap",
        errorMessage: "Something weird",
        errorType: "init_failure",
      });

      const logCall = vi.mocked(structuredLogger.error).mock.calls[0];
      expect(logCall[3]).toMatchObject({
        error_classification: "init_failure",
        payload_summary: expect.objectContaining({ error_type: "init_failure" }),
      });

      expect(trackEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({ error_type: "init_failure" }),
        }),
      );
    });
  });

  describe("dedup window suppresses duplicate errors", () => {
    it("suppresses duplicate errors within the 10s dedup window", () => {
      trackMapError({
        component: "LiveMap",
        errorMessage: "Invalid access token provided",
      });
      expect(structuredLogger.error).toHaveBeenCalledTimes(1);
      expect(trackEvent).toHaveBeenCalledTimes(1);

      trackMapError({
        component: "LiveMap",
        errorMessage: "Invalid access token provided",
      });
      expect(structuredLogger.error).toHaveBeenCalledTimes(1);
      expect(trackEvent).toHaveBeenCalledTimes(1);
    });

    it("allows the same error after the dedup window expires", () => {
      trackMapError({
        component: "LiveMap",
        errorMessage: "WebGL context lost",
      });
      expect(structuredLogger.error).toHaveBeenCalledTimes(1);

      vi.advanceTimersByTime(10_001);

      trackMapError({
        component: "LiveMap",
        errorMessage: "WebGL context lost",
      });
      expect(structuredLogger.error).toHaveBeenCalledTimes(2);
    });

    it("allows different error types from the same component concurrently", () => {
      trackMapError({
        component: "LiveMap",
        errorMessage: "Invalid access token provided",
      });
      trackMapError({
        component: "LiveMap",
        errorMessage: "WebGL context lost",
      });

      expect(structuredLogger.error).toHaveBeenCalledTimes(2);
      expect(trackEvent).toHaveBeenCalledTimes(2);
    });

    it("allows the same error type from different components concurrently", () => {
      trackMapError({
        component: "LiveMap",
        errorMessage: "Invalid access token provided",
      });
      trackMapError({
        component: "PropertyMap",
        errorMessage: "expired token detected",
      });

      expect(structuredLogger.error).toHaveBeenCalledTimes(2);
      expect(trackEvent).toHaveBeenCalledTimes(2);
    });

    it("dedup is keyed by classification, not raw message text", () => {
      trackMapError({
        component: "LiveMap",
        errorMessage: "Invalid access token provided",
      });
      trackMapError({
        component: "LiveMap",
        errorMessage: "401 Unauthorized",
      });

      expect(structuredLogger.error).toHaveBeenCalledTimes(1);
      expect(trackEvent).toHaveBeenCalledTimes(1);
    });

    it("unknown classification flows through trackMapError metadata correctly", () => {
      trackMapError({
        component: "LiveMap",
        errorMessage: "Something completely unexpected happened",
      });

      const logCall = vi.mocked(structuredLogger.error).mock.calls[0];
      expect(logCall[3]).toMatchObject({
        error_classification: "unknown",
        payload_summary: expect.objectContaining({ error_type: "unknown" }),
      });

      expect(trackEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({ error_type: "unknown" }),
        }),
      );
    });
  });
});
