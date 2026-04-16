import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

vi.mock("@/lib/analytics/map-error-analytics", () => ({
  trackMapError: vi.fn(),
}));

describe("useMapErrorHandler — unit", () => {
  let useMapErrorHandler: typeof import("@/hooks/useMapErrorHandler").useMapErrorHandler;
  let trackMapError: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    vi.resetModules();
    vi.mock("@/lib/analytics/map-error-analytics", () => ({
      trackMapError: vi.fn(),
    }));
    const mod = await import("@/hooks/useMapErrorHandler");
    useMapErrorHandler = mod.useMapErrorHandler;
    const analytics = await import("@/lib/analytics/map-error-analytics");
    trackMapError = analytics.trackMapError as ReturnType<typeof vi.fn>;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("initializes with null error state", () => {
    const { result } = renderHook(() => useMapErrorHandler("TestComponent"));
    expect(result.current.mapError).toBeNull();
  });

  it("sets error message via handleMapError", () => {
    const { result } = renderHook(() => useMapErrorHandler("LiveMap"));
    act(() => {
      result.current.handleMapError("Network error");
    });
    expect(result.current.mapError).toBe("Network error");
  });

  it("clears error via clearMapError", () => {
    const { result } = renderHook(() => useMapErrorHandler("LiveMap"));
    act(() => {
      result.current.handleMapError("Token expired");
    });
    expect(result.current.mapError).toBe("Token expired");
    act(() => {
      result.current.clearMapError();
    });
    expect(result.current.mapError).toBeNull();
  });

  it("calls trackMapError with component name and message", () => {
    const { result } = renderHook(() => useMapErrorHandler("PropertyMap"));
    act(() => {
      result.current.handleMapError("WebGL not supported");
    });
    expect(trackMapError).toHaveBeenCalledWith(
      expect.objectContaining({
        component: "PropertyMap",
        errorMessage: "WebGL not supported",
      })
    );
  });

  it("passes additional context to trackMapError", () => {
    const { result } = renderHook(() => useMapErrorHandler("SearchMap"));
    act(() => {
      result.current.handleMapError("Init failure", {
        lat: 25.2,
        lng: 55.27,
        zoom: 12,
        errorType: "init_failure",
      });
    });
    expect(trackMapError).toHaveBeenCalledWith(
      expect.objectContaining({
        component: "SearchMap",
        errorMessage: "Init failure",
        lat: 25.2,
        lng: 55.27,
        zoom: 12,
        errorType: "init_failure",
      })
    );
  });

  it("tracks component name changes via ref", () => {
    const { result, rerender } = renderHook(
      ({ comp }) => useMapErrorHandler(comp),
      { initialProps: { comp: "MapA" } }
    );

    rerender({ comp: "MapB" });

    act(() => {
      result.current.handleMapError("Error after rerender");
    });
    expect(trackMapError).toHaveBeenCalledWith(
      expect.objectContaining({
        component: "MapB",
        errorMessage: "Error after rerender",
      })
    );
  });

  it("handleMapError and clearMapError have stable references", () => {
    const { result, rerender } = renderHook(() => useMapErrorHandler("Test"));
    const handleRef1 = result.current.handleMapError;
    const clearRef1 = result.current.clearMapError;
    rerender();
    expect(result.current.handleMapError).toBe(handleRef1);
    expect(result.current.clearMapError).toBe(clearRef1);
  });

  it("can set multiple errors sequentially", () => {
    const { result } = renderHook(() => useMapErrorHandler("LiveMap"));
    act(() => {
      result.current.handleMapError("Error 1");
    });
    expect(result.current.mapError).toBe("Error 1");
    act(() => {
      result.current.handleMapError("Error 2");
    });
    expect(result.current.mapError).toBe("Error 2");
    expect(trackMapError).toHaveBeenCalledTimes(2);
  });

  it("clearMapError is safe when already null", () => {
    const { result } = renderHook(() => useMapErrorHandler("LiveMap"));
    expect(result.current.mapError).toBeNull();
    act(() => {
      result.current.clearMapError();
    });
    expect(result.current.mapError).toBeNull();
  });
});
