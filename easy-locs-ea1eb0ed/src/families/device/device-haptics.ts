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

interface CapacitorWindow extends Window {
  Capacitor?: { isNativePlatform?: () => boolean };
}

function isNativePlatform(): boolean {
  return !!(window as unknown as CapacitorWindow).Capacitor?.isNativePlatform?.();
}

let nativeHapticsModule: typeof import("@capacitor/haptics") | null = null;
let nativeProbed = false;

async function loadNativeHaptics(): Promise<typeof import("@capacitor/haptics") | null> {
  if (nativeHapticsModule) return nativeHapticsModule;
  if (nativeProbed) return null;
  nativeProbed = true;

  if (!isNativePlatform()) return null;
  try {
    nativeHapticsModule = await import("@capacitor/haptics");
    return nativeHapticsModule;
  } catch {
    return null;
  }
}

if (typeof window !== "undefined") {
  loadNativeHaptics();
}

const STYLE_TO_NATIVE: Record<HapticStyle, () => Promise<void>> = {
  light: async () => {
    const mod = await loadNativeHaptics();
    if (mod) await mod.Haptics.impact({ style: mod.ImpactStyle.Light });
  },
  medium: async () => {
    const mod = await loadNativeHaptics();
    if (mod) await mod.Haptics.impact({ style: mod.ImpactStyle.Medium });
  },
  heavy: async () => {
    const mod = await loadNativeHaptics();
    if (mod) await mod.Haptics.impact({ style: mod.ImpactStyle.Heavy });
  },
  success: async () => {
    const mod = await loadNativeHaptics();
    if (mod) await mod.Haptics.notification({ type: mod.NotificationType.Success });
  },
  warning: async () => {
    const mod = await loadNativeHaptics();
    if (mod) await mod.Haptics.notification({ type: mod.NotificationType.Warning });
  },
  error: async () => {
    const mod = await loadNativeHaptics();
    if (mod) await mod.Haptics.notification({ type: mod.NotificationType.Error });
  },
  selection: async () => {
    const mod = await loadNativeHaptics();
    if (mod) {
      await mod.Haptics.selectionStart();
      await mod.Haptics.selectionChanged();
      await mod.Haptics.selectionEnd();
    }
  },
};

export const DeviceHaptics = {
  isSupported(): boolean {
    if (isNativePlatform()) return true;
    return typeof navigator !== "undefined" && "vibrate" in navigator;
  },

  trigger(style: HapticStyle = "light"): void {
    if (isNativePlatform() && nativeHapticsModule) {
      STYLE_TO_NATIVE[style]().catch(() => {});
      return;
    }

    if (!isNativePlatform() || !nativeHapticsModule) {
      if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        try {
          navigator.vibrate(PATTERNS[style]);
        } catch {}
      }
    }
  },

  async triggerAsync(style: HapticStyle = "light"): Promise<void> {
    const mod = await loadNativeHaptics();
    if (mod) {
      await STYLE_TO_NATIVE[style]();
      return;
    }

    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      try {
        navigator.vibrate(PATTERNS[style]);
      } catch {}
    }
  },

  startRepeating(pattern: number[] = [300, 200, 300], intervalMs = 2200): () => void {
    if (typeof navigator === "undefined" || !("vibrate" in navigator)) return () => {};
    navigator.vibrate(pattern);
    const id = setInterval(() => {
      try { navigator.vibrate(pattern); } catch {}
    }, intervalMs);
    return () => {
      clearInterval(id);
      try { navigator.vibrate(0); } catch {}
    };
  },

  stop(): void {
    if (typeof navigator === "undefined" || !("vibrate" in navigator)) return;
    try { navigator.vibrate(0); } catch {}
  },

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
