/**
 * device.haptics — Canonical haptic feedback family.
 * Single source for ALL vibration/haptic feedback across the entire app.
 * Replaces: src/lib/haptics.ts, useUltraFast haptic, scan/feedback haptic,
 * inline navigator.vibrate calls.
 */

type HapticStyle = "light" | "medium" | "heavy" | "success" | "warning" | "error" | "selection";

const PATTERNS: Record<HapticStyle, number | number[]> = {
  light: 10,
  medium: 25,
  heavy: 50,
  success: [15, 50, 15],
  warning: [30, 30, 30],
  error: [50, 50, 50, 50, 50],
  selection: 8,
};

export const DeviceHaptics = {
  isSupported(): boolean {
    return typeof navigator !== "undefined" && "vibrate" in navigator;
  },

  /** Fire a one-shot haptic pattern */
  trigger(style: HapticStyle = "light"): void {
    if (!DeviceHaptics.isSupported()) return;
    try {
      navigator.vibrate(PATTERNS[style]);
    } catch {
      // silent — haptics are optional
    }
  },

  /** Start a repeating vibration pattern (for ringtones/alerts) */
  startRepeating(pattern: number[] = [300, 200, 300], intervalMs = 2200): () => void {
    if (!DeviceHaptics.isSupported()) return () => {};
    navigator.vibrate(pattern);
    const id = setInterval(() => {
      try { navigator.vibrate(pattern); } catch {}
    }, intervalMs);
    return () => {
      clearInterval(id);
      try { navigator.vibrate(0); } catch {}
    };
  },

  /** Stop all vibration */
  stop(): void {
    if (!DeviceHaptics.isSupported()) return;
    try { navigator.vibrate(0); } catch {}
  },

  /** Wrap a callback with haptic feedback */
  withFeedback<T extends (...args: any[]) => any>(
    fn: T,
    style: HapticStyle = "light",
  ): (...args: Parameters<T>) => ReturnType<T> {
    return (...args) => {
      DeviceHaptics.trigger(style);
      return fn(...args);
    };
  },
};
