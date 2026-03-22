/**
 * Ultra-fast performance hook — instant haptic + visual feedback.
 * Safe no-op on unsupported devices.
 */
export function useUltraFast() {
  const haptic = (type: "light" | "success" | "error" = "light") => {
    try {
      if (navigator.vibrate) {
        const patterns: Record<string, number | number[]> = {
          light: 8,
          success: [10, 20, 10],
          error: [30, 30, 30],
        };
        navigator.vibrate(patterns[type] ?? 8);
      }
    } catch {
      // silent
    }
  };

  const instantFeedback = (cb?: () => void) => {
    haptic("light");
    cb?.();
  };

  return { haptic, instantFeedback };
}

/** Standalone haptic (no hook needed) */
export function ultraHaptic(type: "light" | "success" | "error" = "light") {
  try {
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      const p: Record<string, number | number[]> = {
        light: 8,
        success: [10, 20, 10],
        error: [30, 30, 30],
      };
      navigator.vibrate(p[type] ?? 8);
    }
  } catch {
    // silent
  }
}
