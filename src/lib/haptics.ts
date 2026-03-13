/**
 * Haptic feedback utility for native-feeling interactions.
 * Uses Vibration API with graceful fallback.
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

/** Trigger haptic feedback if supported */
export function haptic(style: HapticStyle = "light") {
  if (!("vibrate" in navigator)) return;
  try {
    const pattern = PATTERNS[style];
    navigator.vibrate(pattern);
  } catch {
    // Silently fail — haptics are optional
  }
}

/** Check if haptics are supported */
export function supportsHaptics(): boolean {
  return "vibrate" in navigator;
}

/** Haptic-enhanced click handler */
export function withHaptic<T extends (...args: any[]) => any>(
  fn: T,
  style: HapticStyle = "light"
): (...args: Parameters<T>) => ReturnType<T> {
  return (...args) => {
    haptic(style);
    return fn(...args);
  };
}
