export type HapticStyle = "light" | "medium" | "heavy" | "success" | "warning" | "error" | "selection";

export async function triggerHaptic(style: HapticStyle = "medium"): Promise<void> {
  try {
    const { Haptics, ImpactStyle, NotificationType } = await import("@capacitor/haptics");

    switch (style) {
      case "light":
        await Haptics.impact({ style: ImpactStyle.Light });
        break;
      case "medium":
        await Haptics.impact({ style: ImpactStyle.Medium });
        break;
      case "heavy":
        await Haptics.impact({ style: ImpactStyle.Heavy });
        break;
      case "success":
        await Haptics.notification({ type: NotificationType.Success });
        break;
      case "warning":
        await Haptics.notification({ type: NotificationType.Warning });
        break;
      case "error":
        await Haptics.notification({ type: NotificationType.Error });
        break;
      case "selection":
        await Haptics.selectionStart();
        await Haptics.selectionChanged();
        await Haptics.selectionEnd();
        break;
    }
  } catch (err) {
    console.debug("[haptics] Capacitor haptics unavailable, using navigator.vibrate:", err instanceof Error ? err.message : err);
    if ("vibrate" in navigator) {
      const durations: Record<HapticStyle, number | number[]> = {
        light: 10,
        medium: 25,
        heavy: 50,
        success: [10, 50, 10],
        warning: [30, 50, 30],
        error: [50, 30, 50, 30, 50],
        selection: 5,
      };
      navigator.vibrate(durations[style]);
    }
  }
}

export async function vibrate(durationMs: number = 300): Promise<void> {
  try {
    const { Haptics } = await import("@capacitor/haptics");
    await Haptics.vibrate({ duration: durationMs });
  } catch (err) {
    console.debug("[haptics] Vibrate fallback:", err instanceof Error ? err.message : err);
    navigator.vibrate?.(durationMs);
  }
}
