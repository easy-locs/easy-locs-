/**
 * device.permissions — Canonical device permission family.
 * Single source for notification, camera, microphone permission requests.
 */

export const DevicePermissions = {
  /** Check if Notification API is supported */
  isNotificationSupported(): boolean {
    return typeof window !== "undefined" && "Notification" in window;
  },

  /** Get current notification permission */
  getNotificationStatus(): NotificationPermission | "unsupported" {
    if (!DevicePermissions.isNotificationSupported()) return "unsupported";
    return Notification.permission;
  },

  /** Request notification permission */
  async requestNotification(): Promise<NotificationPermission> {
    if (!DevicePermissions.isNotificationSupported()) return "denied";
    return Notification.requestPermission();
  },

  /** Request camera + microphone for calls */
  async requestMediaDevices(constraints: MediaStreamConstraints = { audio: true, video: true }): Promise<MediaStream | null> {
    try {
      return await navigator.mediaDevices.getUserMedia(constraints);
    } catch {
      return null;
    }
  },
};
