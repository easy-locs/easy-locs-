import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

describe("useMapRetry — backoff timing and exhaustion", () => {
  let useMapRetry: typeof import("@/hooks/map/useMapRetry").useMapRetry;

  beforeEach(async () => {
    vi.useFakeTimers();
    vi.resetModules();
    const mod = await import("@/hooks/map/useMapRetry");
    useMapRetry = mod.useMapRetry;
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("initializes with zero retries and not exhausted", () => {
    const { result } = renderHook(() => useMapRetry());
    expect(result.current.retryCount).toBe(0);
    expect(result.current.maxRetries).toBe(5);
    expect(result.current.exhausted).toBe(false);
    expect(result.current.isOnCooldown).toBe(false);
    expect(result.current.cooldownRemaining).toBe(0);
    expect(result.current.retryKey).toBe(0);
  });

  it("increments retryCount on triggerRetry", () => {
    const { result } = renderHook(() => useMapRetry());
    act(() => {
      result.current.triggerRetry();
    });
    expect(result.current.retryCount).toBe(1);
    expect(result.current.retryKey).toBe(1);
  });

  it("enters cooldown after first retry with 2s delay", () => {
    const { result } = renderHook(() => useMapRetry());
    act(() => {
      result.current.triggerRetry();
    });
    expect(result.current.isOnCooldown).toBe(true);
    expect(result.current.cooldownRemaining).toBe(2);
  });

  it("exits cooldown after delay expires", () => {
    const { result } = renderHook(() => useMapRetry());
    act(() => {
      result.current.triggerRetry();
    });
    expect(result.current.isOnCooldown).toBe(true);

    act(() => {
      vi.advanceTimersByTime(2100);
    });
    expect(result.current.isOnCooldown).toBe(false);
    expect(result.current.cooldownRemaining).toBe(0);
  });

  it("blocks triggerRetry during cooldown", () => {
    const { result } = renderHook(() => useMapRetry());
    act(() => {
      result.current.triggerRetry();
    });
    expect(result.current.retryCount).toBe(1);

    act(() => {
      result.current.triggerRetry();
    });
    expect(result.current.retryCount).toBe(1);
  });

  it("uses exponential backoff: 2s, 4s, 8s, 16s", () => {
    const { result } = renderHook(() => useMapRetry());

    act(() => {
      result.current.triggerRetry();
    });
    expect(result.current.cooldownRemaining).toBe(2);
    act(() => {
      vi.advanceTimersByTime(2100);
    });

    act(() => {
      result.current.triggerRetry();
    });
    expect(result.current.cooldownRemaining).toBe(4);
    act(() => {
      vi.advanceTimersByTime(4100);
    });

    act(() => {
      result.current.triggerRetry();
    });
    expect(result.current.cooldownRemaining).toBe(8);
    act(() => {
      vi.advanceTimersByTime(8100);
    });

    act(() => {
      result.current.triggerRetry();
    });
    expect(result.current.cooldownRemaining).toBe(16);
  });

  it("becomes exhausted after 5 retries", () => {
    const { result } = renderHook(() => useMapRetry());

    for (let i = 0; i < 5; i++) {
      act(() => {
        result.current.triggerRetry();
      });
      if (i < 4) {
        act(() => {
          vi.advanceTimersByTime(100_000);
        });
      }
    }

    expect(result.current.retryCount).toBe(5);
    expect(result.current.exhausted).toBe(true);
  });

  it("blocks triggerRetry after exhaustion", () => {
    const { result } = renderHook(() => useMapRetry());

    for (let i = 0; i < 5; i++) {
      act(() => {
        result.current.triggerRetry();
      });
      act(() => {
        vi.advanceTimersByTime(100_000);
      });
    }

    const countBefore = result.current.retryCount;
    act(() => {
      result.current.triggerRetry();
    });
    expect(result.current.retryCount).toBe(countBefore);
  });

  it("does not start cooldown on the final retry (exhaustion)", () => {
    const { result } = renderHook(() => useMapRetry());

    for (let i = 0; i < 4; i++) {
      act(() => {
        result.current.triggerRetry();
      });
      act(() => {
        vi.advanceTimersByTime(100_000);
      });
    }

    act(() => {
      result.current.triggerRetry();
    });
    expect(result.current.retryCount).toBe(5);
    expect(result.current.isOnCooldown).toBe(false);
  });

  it("reset restores all state to initial", () => {
    const { result } = renderHook(() => useMapRetry());
    act(() => {
      result.current.triggerRetry();
    });
    expect(result.current.retryCount).toBe(1);
    expect(result.current.isOnCooldown).toBe(true);

    act(() => {
      result.current.reset();
    });
    expect(result.current.retryCount).toBe(0);
    expect(result.current.isOnCooldown).toBe(false);
    expect(result.current.cooldownRemaining).toBe(0);
    expect(result.current.exhausted).toBe(false);
  });

  it("can retry again after reset", () => {
    const { result } = renderHook(() => useMapRetry());

    for (let i = 0; i < 5; i++) {
      act(() => {
        result.current.triggerRetry();
      });
      act(() => {
        vi.advanceTimersByTime(100_000);
      });
    }
    expect(result.current.exhausted).toBe(true);

    act(() => {
      result.current.reset();
    });
    expect(result.current.exhausted).toBe(false);

    act(() => {
      result.current.triggerRetry();
    });
    expect(result.current.retryCount).toBe(1);
  });

  it("cleans up timers on unmount", () => {
    const { result, unmount } = renderHook(() => useMapRetry());
    act(() => {
      result.current.triggerRetry();
    });
    expect(result.current.isOnCooldown).toBe(true);
    unmount();
  });
});
