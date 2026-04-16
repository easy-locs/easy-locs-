import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { Navigation, Car } from "lucide-react";

describe("MapErrorFallback — unit", () => {
  let MapErrorFallback: typeof import("@/components/map/MapErrorFallback").default;

  beforeEach(async () => {
    const mod = await import("@/components/map/MapErrorFallback");
    MapErrorFallback = mod.default;
  });

  afterEach(() => {
    cleanup();
  });

  it("renders 'Map unavailable' text", () => {
    render(<MapErrorFallback />);
    expect(screen.getByText("Map unavailable")).toBeInTheDocument();
  });

  it("renders custom title when provided", () => {
    render(<MapErrorFallback title="Live map unavailable" />);
    expect(screen.getByText("Live map unavailable")).toBeInTheDocument();
    expect(screen.queryByText("Map unavailable")).toBeNull();
  });

  it("renders custom icon when provided", () => {
    const { container } = render(<MapErrorFallback icon={Navigation} />);
    const svgEl = container.querySelector("svg");
    expect(svgEl).toBeTruthy();
  });

  it("renders custom message when provided", () => {
    render(<MapErrorFallback message="Token expired" />);
    expect(screen.getByText("Token expired")).toBeInTheDocument();
  });

  it("does not render message paragraph when message is undefined", () => {
    const { container } = render(<MapErrorFallback />);
    const paragraphs = container.querySelectorAll("p");
    expect(paragraphs.length).toBeGreaterThanOrEqual(1);
    expect(paragraphs[0].textContent).toBe("Map unavailable");
  });

  it("renders location label when provided", () => {
    render(<MapErrorFallback locationLabel="Downtown Dubai" />);
    expect(screen.getByText("Downtown Dubai")).toBeInTheDocument();
  });

  it("renders coordinates when lat/lng provided without locationLabel", () => {
    render(<MapErrorFallback lat={25.2048} lng={55.2708} />);
    expect(screen.getByText("25.204800, 55.270800")).toBeInTheDocument();
  });

  it("prefers locationLabel over raw coordinates", () => {
    render(
      <MapErrorFallback
        locationLabel="Marina Walk"
        lat={25.08}
        lng={55.14}
      />
    );
    expect(screen.getByText("Marina Walk")).toBeInTheDocument();
    expect(screen.queryByText(/25\.08/)).toBeNull();
  });

  it("does not render coordinates when lat is null", () => {
    const { container } = render(<MapErrorFallback lat={null} lng={55.27} />);
    expect(container.querySelector(".font-mono")).toBeNull();
  });

  it("applies compact styles (smaller minHeight)", () => {
    const { container } = render(<MapErrorFallback compact />);
    const wrapper = container.firstElementChild as HTMLElement;
    expect(wrapper.style.minHeight).toBe("120px");
  });

  it("applies default (non-compact) minHeight", () => {
    const { container } = render(<MapErrorFallback />);
    const wrapper = container.firstElementChild as HTMLElement;
    expect(wrapper.style.minHeight).toBe("200px");
  });

  it("applies custom className", () => {
    const { container } = render(<MapErrorFallback className="w-full h-full" />);
    const wrapper = container.firstElementChild as HTMLElement;
    expect(wrapper.className).toContain("w-full h-full");
  });

  it("renders all props together", () => {
    render(
      <MapErrorFallback
        message="Service down"
        locationLabel="JBR Beach"
        lat={25.08}
        lng={55.14}
        compact
        className="test-class"
      />
    );
    expect(screen.getByText("Map unavailable")).toBeInTheDocument();
    expect(screen.getByText("Service down")).toBeInTheDocument();
    expect(screen.getByText("JBR Beach")).toBeInTheDocument();
  });

  it("renders all props together with custom title and icon", () => {
    render(
      <MapErrorFallback
        message="Service down"
        title="Navigation unavailable"
        icon={Car}
        locationLabel="JBR Beach"
        compact
      />
    );
    expect(screen.getByText("Navigation unavailable")).toBeInTheDocument();
    expect(screen.getByText("Service down")).toBeInTheDocument();
    expect(screen.getByText("JBR Beach")).toBeInTheDocument();
  });

  it("renders Retry button when onRetry is provided", () => {
    const onRetry = vi.fn();
    render(<MapErrorFallback message="Network error" onRetry={onRetry} />);
    const retryButton = screen.getByRole("button", { name: /retry/i });
    expect(retryButton).toBeInTheDocument();
    retryButton.click();
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("invokes onRetry via userEvent click interaction", async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();
    render(
      <MapErrorFallback
        message="Network error"
        onRetry={onRetry}
        retryCount={1}
        maxRetries={5}
      />
    );
    const retryButton = screen.getByRole("button", { name: /retry/i });
    await user.click(retryButton);
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("disables retry button during cooldown", () => {
    const onRetry = vi.fn();
    render(
      <MapErrorFallback
        message="Rate limited"
        onRetry={onRetry}
        isOnCooldown
        cooldownRemaining={5}
        retryCount={2}
        maxRetries={5}
      />
    );
    const retryButton = screen.getByRole("button", { name: /retry in 5s/i });
    expect(retryButton).toBeDisabled();
  });

  it("does not render Retry button when onRetry is not provided", () => {
    render(<MapErrorFallback message="Network error" />);
    expect(screen.queryByRole("button", { name: /retry/i })).toBeNull();
  });

  it("disables Retry button and shows cooldown when isOnCooldown is true", () => {
    render(<MapErrorFallback message="Error" onRetry={vi.fn()} isOnCooldown cooldownRemaining={3} />);
    const btn = screen.getByRole("button", { name: /retry in 3s/i });
    expect(btn).toBeInTheDocument();
    expect(btn).toBeDisabled();
  });

  it("shows offline indicator when isOffline is true", () => {
    render(<MapErrorFallback message="Error" onRetry={vi.fn()} isOffline />);
    expect(screen.getByText(/no internet/i)).toBeInTheDocument();
    expect(screen.getByText(/retry automatically/i)).toBeInTheDocument();
  });

  it("has proper a11y attributes on the alert region", () => {
    render(<MapErrorFallback message="Token expired" />);
    const alert = screen.getByRole("alert");
    expect(alert).toBeInTheDocument();
    expect(alert.getAttribute("aria-live")).toBe("assertive");
  });
});

describe("useMapCore — error states", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it("returns error when map token is missing", async () => {
    vi.doMock("@/lib/maplibre/config", () => ({
      MAPBOX_ACCESS_TOKEN: "",
      getMapTokenError: () => null,
      getMapboxTokenError: () => null,
    }));
    vi.doMock("@/lib/maplibre/maplibre-loader", () => ({
      loadMapLibre: vi.fn(),
      getMapLibreGL: vi.fn(() => null),
      loadMapbox: vi.fn(),
      getMapboxgl: vi.fn(() => null),
    }));
    vi.doMock("@/lib/map/engine/style-engine", () => ({
      applyPremiumFog: vi.fn(),
    }));
    vi.doMock("@/lib/analytics/map-error-analytics", () => ({
      trackMapError: vi.fn(),
    }));

    const { renderHook } = await import("@testing-library/react");
    const { useMapCore } = await import("@/hooks/map/useMapCore");

    const containerRef = { current: document.createElement("div") };

    const { result } = renderHook(() =>
      useMapCore(containerRef as React.RefObject<HTMLDivElement>, {
        centerLng: 55.27,
        centerLat: 25.2,
        zoom: 12,
      })
    );

    expect(result.current.error).toBeTruthy();
    expect(result.current.ready).toBe(false);
  });

  it("returns error when map token is whitespace-only", async () => {
    vi.doMock("@/lib/maplibre/config", () => ({
      MAPBOX_ACCESS_TOKEN: "   ",
      getMapTokenError: () => null,
      getMapboxTokenError: () => null,
    }));
    vi.doMock("@/lib/maplibre/maplibre-loader", () => ({
      loadMapLibre: vi.fn(),
      getMapLibreGL: vi.fn(() => null),
      loadMapbox: vi.fn(),
      getMapboxgl: vi.fn(() => null),
    }));
    vi.doMock("@/lib/map/engine/style-engine", () => ({
      applyPremiumFog: vi.fn(),
    }));
    vi.doMock("@/lib/analytics/map-error-analytics", () => ({
      trackMapError: vi.fn(),
    }));

    const { renderHook } = await import("@testing-library/react");
    const { useMapCore } = await import("@/hooks/map/useMapCore");

    const containerRef = { current: document.createElement("div") };

    const { result } = renderHook(() =>
      useMapCore(containerRef as React.RefObject<HTMLDivElement>, {
        centerLng: 55.27,
        centerLat: 25.2,
        zoom: 12,
      })
    );

    expect(result.current.error).toBeTruthy();
    expect(result.current.ready).toBe(false);
  });

  it("returns error when WebGL is not supported", async () => {
    vi.doMock("@/lib/maplibre/config", () => ({
      MAPBOX_ACCESS_TOKEN: "pk.test_valid_token",
      getMapTokenError: () => null,
      getMapboxTokenError: () => null,
    }));
    vi.doMock("@/lib/maplibre/maplibre-loader", () => ({
      loadMapLibre: vi.fn(),
      getMapLibreGL: vi.fn(() => null),
      loadMapbox: vi.fn(),
      getMapboxgl: vi.fn(() => null),
    }));
    vi.doMock("@/lib/map/engine/style-engine", () => ({
      applyPremiumFog: vi.fn(),
    }));
    vi.doMock("@/lib/analytics/map-error-analytics", () => ({
      trackMapError: vi.fn(),
    }));

    const { renderHook } = await import("@testing-library/react");
    const { useMapCore } = await import("@/hooks/map/useMapCore");

    const containerRef = { current: document.createElement("div") };

    const { result } = renderHook(() =>
      useMapCore(containerRef as React.RefObject<HTMLDivElement>, {
        centerLng: 55.27,
        centerLat: 25.2,
        zoom: 12,
      })
    );

    expect(result.current.error).toBeTruthy();
    expect(result.current.error!.toLowerCase()).toContain("webgl");
    expect(result.current.ready).toBe(false);
  });

  it("returns error when loadMapLibre rejects", async () => {
    vi.doMock("@/lib/maplibre/config", () => ({
      MAPBOX_ACCESS_TOKEN: "pk.test_valid_token",
      getMapTokenError: () => null,
      getMapboxTokenError: () => null,
    }));

    const getContextSpy = vi.spyOn(HTMLCanvasElement.prototype, "getContext")
      .mockReturnValue({ fake: true } as unknown as RenderingContext);

    try {
      vi.doMock("@/lib/maplibre/maplibre-loader", () => ({
        loadMapLibre: vi.fn(() => Promise.reject(new Error("Network failure"))),
        getMapLibreGL: vi.fn(() => null),
        loadMapbox: vi.fn(() => Promise.reject(new Error("Network failure"))),
        getMapboxgl: vi.fn(() => null),
      }));
      vi.doMock("@/lib/map/engine/style-engine", () => ({
        applyPremiumFog: vi.fn(),
      }));

      const { renderHook, waitFor } = await import("@testing-library/react");
      const { useMapCore } = await import("@/hooks/map/useMapCore");

      const containerRef = { current: document.createElement("div") };

      const { result } = renderHook(() =>
        useMapCore(containerRef as React.RefObject<HTMLDivElement>, {
          centerLng: 55.27,
          centerLat: 25.2,
          zoom: 12,
        })
      );

      await waitFor(() => {
        expect(result.current.error).toBeTruthy();
      });

      expect(result.current.error).toContain("Network failure");
      expect(result.current.ready).toBe(false);
    } finally {
      getContextSpy.mockRestore();
    }
  });
});

describe("LiveMap — fallback on missing token", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it("renders MapErrorFallback when token check fails", async () => {
    vi.doMock("@/lib/maplibre/config", () => ({
      MAPBOX_ACCESS_TOKEN: "",
      getMapTokenError: () => "Map access token is not configured.",
      getMapboxTokenError: () => "Map access token is not configured.",
    }));
    vi.doMock("@/lib/maplibre/maplibre-loader", () => ({
      loadMapLibre: vi.fn(),
      getMapLibreGL: vi.fn(() => null),
      loadMapbox: vi.fn(),
      getMapboxgl: vi.fn(() => null),
    }));
    vi.doMock("@/hooks/map/useNetworkRecovery", () => ({
      useNetworkRecovery: vi.fn(() => ({ isOffline: false })),
    }));
    vi.doMock("@/lib/analytics/map-error-analytics", () => ({
      trackMapError: vi.fn(),
    }));

    const { default: LiveMap } = await import("@/components/map/LiveMap");

    render(
      <LiveMap
        points={[{ lat: 25.2, lng: 55.27, label: "Test" }]}
      />
    );

    expect(screen.getByText("Live map unavailable")).toBeInTheDocument();
    expect(screen.getByText(/token/i)).toBeInTheDocument();
  });

  it("renders MapErrorFallback when loadMapLibre rejects", async () => {
    vi.doMock("@/lib/maplibre/config", () => ({
      MAPBOX_ACCESS_TOKEN: "pk.test_token",
      getMapTokenError: () => null,
      getMapboxTokenError: () => null,
    }));
    vi.doMock("@/lib/maplibre/maplibre-loader", () => ({
      loadMapLibre: vi.fn(() => Promise.reject(new Error("CDN down"))),
      getMapLibreGL: vi.fn(() => null),
      loadMapbox: vi.fn(() => Promise.reject(new Error("CDN down"))),
      getMapboxgl: vi.fn(() => null),
    }));
    vi.doMock("@/hooks/map/useNetworkRecovery", () => ({
      useNetworkRecovery: vi.fn(() => ({ isOffline: false })),
    }));
    vi.doMock("@/lib/analytics/map-error-analytics", () => ({
      trackMapError: vi.fn(),
    }));

    const { default: LiveMap } = await import("@/components/map/LiveMap");
    const { waitFor } = await import("@testing-library/react");

    render(
      <LiveMap
        points={[{ lat: 25.2, lng: 55.27 }]}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Live map unavailable")).toBeInTheDocument();
    });
  });

  it("invokes retry callback when user clicks the retry button", async () => {
    const user = userEvent.setup();
    let loadCallCount = 0;

    vi.doMock("@/lib/maplibre/config", () => ({
      MAPBOX_ACCESS_TOKEN: "pk.test_token",
      getMapTokenError: () => null,
      getMapboxTokenError: () => null,
    }));
    vi.doMock("@/lib/maplibre/maplibre-loader", () => ({
      loadMapLibre: vi.fn(() => {
        loadCallCount++;
        return Promise.reject(new Error("CDN down"));
      }),
      getMapLibreGL: vi.fn(() => null),
      loadMapbox: vi.fn(() => {
        loadCallCount++;
        return Promise.reject(new Error("CDN down"));
      }),
      getMapboxgl: vi.fn(() => null),
    }));
    vi.doMock("@/hooks/map/useNetworkRecovery", () => ({
      useNetworkRecovery: vi.fn(() => ({ isOffline: false })),
    }));
    vi.doMock("@/lib/analytics/map-error-analytics", () => ({
      trackMapError: vi.fn(),
    }));

    const { default: LiveMap } = await import("@/components/map/LiveMap");
    const { waitFor } = await import("@testing-library/react");

    render(
      <LiveMap points={[{ lat: 25.2, lng: 55.27 }]} />
    );

    await waitFor(() => {
      expect(screen.getByText("Live map unavailable")).toBeInTheDocument();
    });

    const initialCalls = loadCallCount;
    const retryButton = screen.getByRole("button", { name: /retry/i });
    await user.click(retryButton);

    await waitFor(() => {
      expect(loadCallCount).toBeGreaterThan(initialCalls);
    });
  });
});

interface MockMapStoreState {
  viewport: { centerLat: number; centerLng: number; zoom: number };
  entities: unknown[];
}

interface MockWeatherState {
  effectsLevel: string;
}

function mockSuperMapDeps(errorMsg: string) {
  vi.doMock("@/hooks/map/useMapCore", () => ({
    useMapCore: vi.fn(() => ({
      mapRef: { current: null },
      ready: false,
      error: errorMsg,
      retryCount: 0,
      retry: vi.fn(),
      easeTo: vi.fn(),
      fitBounds: vi.fn(),
    })),
  }));
  vi.doMock("@/hooks/map/useNetworkRecovery", () => ({
    useNetworkRecovery: vi.fn(() => ({ isOffline: false })),
  }));
  vi.doMock("@/hooks/map/useMapDataSync", () => ({
    useMapDataSync: vi.fn(),
  }));
  vi.doMock("@/hooks/map/useMapInteractions", () => ({
    useMapInteractions: vi.fn(),
  }));
  vi.doMock("@/hooks/map/useMapWeather", () => ({
    useMapWeather: vi.fn(() => ({ weather: { isRaining: false, label: "Clear" } })),
  }));
  vi.doMock("@/hooks/map/useMapCamera", () => ({
    useMapCamera: vi.fn(() => ({ recenter: vi.fn() })),
  }));
  vi.doMock("@/hooks/map/useMapAnimations", () => ({
    useMapAnimations: vi.fn(),
  }));
  vi.doMock("@/hooks/map/useMapPreset", () => ({
    useMapPreset: vi.fn(() => ({ label: "Default" })),
  }));
  vi.doMock("@/hooks/map/useMapAdaptive", () => ({
    useMapAdaptive: vi.fn(() => ({ adaptive: {} })),
  }));
  vi.doMock("@/hooks/map/useMapRetry", () => ({
    useMapRetry: vi.fn(() => ({
      retryCount: 0,
      maxRetries: 5,
      isOnCooldown: false,
      cooldownRemaining: 0,
      exhausted: false,
      retryKey: 0,
      triggerRetry: vi.fn(),
      reset: vi.fn(),
    })),
  }));
  vi.doMock("@/stores/mapStore", () => ({
    useUnifiedMapStore: vi.fn((sel: (state: MockMapStoreState) => unknown) => {
      const state: MockMapStoreState = {
        viewport: { centerLat: 25.2, centerLng: 55.27, zoom: 12 },
        entities: [],
      };
      return sel(state);
    }),
  }));
  vi.doMock("@/stores/weatherDisplayStore", () => ({
    useWeatherDisplayStore: vi.fn((sel: (state: MockWeatherState) => unknown) => {
      return sel({ effectsLevel: "standard" });
    }),
  }));
}

describe("SuperMap — fallback on error", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it("renders MapErrorFallback when useMapCore returns token error", async () => {
    mockSuperMapDeps("Map access token is not configured. Please set the VITE_MAPBOX_TOKEN environment variable.");

    const { default: SuperMap } = await import("@/components/map/SuperMap");
    const { waitFor } = await import("@testing-library/react");

    render(<SuperMap />);

    await waitFor(() => {
      expect(screen.getByText("Map unavailable")).toBeInTheDocument();
    });
    expect(screen.getByText(/token/i)).toBeInTheDocument();
  });

  it("renders MapErrorFallback with WebGL error message", async () => {
    mockSuperMapDeps("3D rendering (WebGL) is not supported in this browser.");

    const { default: SuperMap } = await import("@/components/map/SuperMap");
    const { waitFor } = await import("@testing-library/react");

    render(<SuperMap />);

    await waitFor(() => {
      expect(screen.getByText("Map unavailable")).toBeInTheDocument();
    });
    expect(screen.getByText(/WebGL/)).toBeInTheDocument();
  });

  it("renders MapErrorFallback with generic init failure", async () => {
    mockSuperMapDeps("Map initialization failed");

    const { default: SuperMap } = await import("@/components/map/SuperMap");
    const { waitFor } = await import("@testing-library/react");

    render(<SuperMap />);

    await waitFor(() => {
      expect(screen.getByText("Map unavailable")).toBeInTheDocument();
    });
    expect(screen.getByText("Map initialization failed")).toBeInTheDocument();
  });

  it("renders Retry button in SuperMap error fallback", async () => {
    mockSuperMapDeps("Network failure");

    const { default: SuperMap } = await import("@/components/map/SuperMap");

    render(<SuperMap />);

    expect(screen.getByRole("button", { name: /retry/i })).toBeInTheDocument();
  });

  it("invokes triggerRetry when user clicks the retry button", async () => {
    const user = userEvent.setup();
    const triggerRetryFn = vi.fn();

    mockSuperMapDeps("Network failure");
    vi.doMock("@/hooks/map/useMapRetry", () => ({
      useMapRetry: vi.fn(() => ({
        retryCount: 0,
        maxRetries: 5,
        isOnCooldown: false,
        cooldownRemaining: 0,
        exhausted: false,
        retryKey: 0,
        triggerRetry: triggerRetryFn,
        reset: vi.fn(),
      })),
    }));

    const { default: SuperMap } = await import("@/components/map/SuperMap");
    const { waitFor } = await import("@testing-library/react");

    render(<SuperMap />);

    await waitFor(() => {
      expect(screen.getByText("Map unavailable")).toBeInTheDocument();
    });

    const retryButton = screen.getByRole("button", { name: /retry/i });
    await user.click(retryButton);

    expect(triggerRetryFn).toHaveBeenCalledTimes(1);
  });

  it("does not show retry button when retries are exhausted", async () => {
    mockSuperMapDeps("Network failure");
    vi.doMock("@/hooks/map/useMapRetry", () => ({
      useMapRetry: vi.fn(() => ({
        retryCount: 5,
        maxRetries: 5,
        isOnCooldown: false,
        cooldownRemaining: 0,
        exhausted: true,
        retryKey: 5,
        triggerRetry: vi.fn(),
        reset: vi.fn(),
      })),
    }));

    const { default: SuperMap } = await import("@/components/map/SuperMap");
    const { waitFor } = await import("@testing-library/react");

    render(<SuperMap />);

    await waitFor(() => {
      expect(screen.getByText("Map unavailable")).toBeInTheDocument();
    });

    expect(screen.getByText("Please try again later")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /retry/i })).not.toBeInTheDocument();
  });
});

describe("useMapCore — retry", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it("exposes retry function and isRetrying state", async () => {
    vi.doMock("@/lib/maplibre/config", () => ({
      MAPBOX_ACCESS_TOKEN: "",
      getMapTokenError: vi.fn(() => null),
      getMapboxTokenError: vi.fn(() => null),
    }));
    vi.doMock("@/lib/maplibre/maplibre-loader", () => ({
      loadMapLibre: vi.fn(),
      getMapLibreGL: vi.fn(() => null),
      loadMapbox: vi.fn(),
      getMapboxgl: vi.fn(() => null),
    }));
    vi.doMock("@/lib/map/engine/style-engine", () => ({
      applyPremiumFog: vi.fn(),
    }));
    vi.doMock("@/lib/analytics/map-error-analytics", () => ({
      trackMapError: vi.fn(),
    }));

    const { renderHook } = await import("@testing-library/react");
    const { useMapCore } = await import("@/hooks/map/useMapCore");

    const containerRef = { current: document.createElement("div") };

    const { result } = renderHook(() =>
      useMapCore(containerRef as React.RefObject<HTMLDivElement>, {
        centerLng: 55.27,
        centerLat: 25.2,
        zoom: 12,
      })
    );

    expect(result.current.error).toBeTruthy();
    expect(typeof result.current.retry).toBe("function");
    expect(result.current.isRetrying).toBe(false);
  });
});
