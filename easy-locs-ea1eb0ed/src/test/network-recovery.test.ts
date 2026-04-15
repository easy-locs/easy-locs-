import { describe, it, expect, vi, afterEach } from "vitest";
import { renderHook, act, cleanup } from "@testing-library/react";
import { useNetworkRecovery } from "@/hooks/map/useNetworkRecovery";

describe("useNetworkRecovery", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("registers online/offline listeners when enabled", () => {
    const addSpy = vi.spyOn(window, "addEventListener");

    renderHook(() =>
      useNetworkRecovery({ enabled: true, onReconnect: vi.fn() })
    );

    const eventNames = addSpy.mock.calls.map(([name]) => name);
    expect(eventNames).toContain("online");
    expect(eventNames).toContain("offline");
  });

  it("does not register listeners when disabled", () => {
    const addSpy = vi.spyOn(window, "addEventListener");

    renderHook(() =>
      useNetworkRecovery({ enabled: false, onReconnect: vi.fn() })
    );

    const onlineCalls = addSpy.mock.calls.filter(([e]) => e === "online");
    expect(onlineCalls).toHaveLength(0);
  });

  it("cleans up listeners on unmount", () => {
    const removeSpy = vi.spyOn(window, "removeEventListener");

    const { unmount } = renderHook(() =>
      useNetworkRecovery({ enabled: true, onReconnect: vi.fn() })
    );

    unmount();

    const removedEvents = removeSpy.mock.calls.map(([name]) => name);
    expect(removedEvents).toContain("online");
    expect(removedEvents).toContain("offline");
  });

  it("fires onReconnect after debounce when online event occurs", () => {
    vi.useFakeTimers();

    const onReconnect = vi.fn();
    renderHook(() =>
      useNetworkRecovery({ enabled: true, onReconnect, debounceMs: 1000 })
    );

    act(() => {
      window.dispatchEvent(new Event("online"));
    });
    expect(onReconnect).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(onReconnect).toHaveBeenCalledTimes(1);

    vi.useRealTimers();
  });

  it("cancels pending reconnect on offline event", () => {
    vi.useFakeTimers();

    const onReconnect = vi.fn();
    renderHook(() =>
      useNetworkRecovery({ enabled: true, onReconnect, debounceMs: 1000 })
    );

    act(() => {
      window.dispatchEvent(new Event("online"));
    });
    act(() => {
      window.dispatchEvent(new Event("offline"));
    });
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(onReconnect).not.toHaveBeenCalled();

    vi.useRealTimers();
  });

  it("tracks offline state via isOffline", () => {
    const onReconnect = vi.fn();
    const { result } = renderHook(() =>
      useNetworkRecovery({ enabled: true, onReconnect })
    );

    act(() => {
      window.dispatchEvent(new Event("offline"));
    });
    expect(result.current.isOffline).toBe(true);

    act(() => {
      window.dispatchEvent(new Event("online"));
    });
    expect(result.current.isOffline).toBe(false);
  });
});
