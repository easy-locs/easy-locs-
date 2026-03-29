/**
 * Ultra-fast performance hook — delegates to canonical DeviceHaptics.
 */
import { DeviceHaptics } from "@/families/device";

export function useUltraFast() {
  const haptic = (type: "light" | "success" | "error" = "light") => {
    DeviceHaptics.trigger(type);
  };

  const instantFeedback = (cb?: () => void) => {
    DeviceHaptics.trigger("light");
    cb?.();
  };

  return { haptic, instantFeedback };
}

/** Standalone haptic (no hook needed) */
export function ultraHaptic(type: "light" | "success" | "error" = "light") {
  DeviceHaptics.trigger(type);
}
