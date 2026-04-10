/**
 * Haptic feedback utility — thin re-export of canonical DeviceHaptics.
 * Kept for backward compatibility. New code should import from @/families/device.
 */
import { DeviceHaptics } from "@/families/device";

type HapticStyle = "light" | "medium" | "heavy" | "success" | "warning" | "error" | "selection";

/** Trigger haptic feedback if supported */
export function haptic(style: HapticStyle = "light") {
  DeviceHaptics.trigger(style);
}

/** Check if haptics are supported */
export function supportsHaptics(): boolean {
  return DeviceHaptics.isSupported();
}

/** Haptic-enhanced click handler */
export function withHaptic<T extends (...args: any[]) => any>(
  fn: T,
  style: HapticStyle = "light"
): (...args: Parameters<T>) => ReturnType<T> {
  return DeviceHaptics.withFeedback(fn, style);
}
