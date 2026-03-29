/**
 * notifications.vibration — Canonical vibration micro-family.
 * Single source for all device vibration across the app.
 * Components MUST use this instead of inline `navigator.vibrate(...)`.
 */

let vibrationInterval: ReturnType<typeof setInterval> | null = null;

export const NotificationVibration = {
  /** Check if vibration API is supported */
  isSupported(): boolean {
    return "vibrate" in navigator;
  },

  /** Single vibration burst */
  once(pattern: number[] = [200]): void {
    if (!NotificationVibration.isSupported()) return;
    navigator.vibrate(pattern);
  },

  /** Repeated vibration pattern */
  startRepeating(pattern: number[] = [200, 100, 200], intervalMs = 2000): void {
    NotificationVibration.stop();
    if (!NotificationVibration.isSupported()) return;
    navigator.vibrate(pattern);
    vibrationInterval = setInterval(() => {
      navigator.vibrate(pattern);
    }, intervalMs);
  },

  /** Stop all vibration */
  stop(): void {
    if (vibrationInterval) {
      clearInterval(vibrationInterval);
      vibrationInterval = null;
    }
    if (NotificationVibration.isSupported()) {
      navigator.vibrate(0);
    }
  },

  /** Vibrate if preferences allow */
  onceIfAllowed(vibrationEnabled: boolean, pattern?: number[]): void {
    if (!vibrationEnabled) return;
    NotificationVibration.once(pattern);
  },
};
