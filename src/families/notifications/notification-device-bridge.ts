/**
 * notifications.device-bridge — Canonical notification bridge to device/system.
 * Handles: in-app, push, vibration, sound, foreground/background routing.
 */
import { create } from "zustand";
import { persist } from "zustand/middleware";

export type NotificationChannel = "message" | "call" | "system" | "payment" | "location";
export type NotificationPriority = "low" | "normal" | "high" | "critical";

export interface NotificationPayload {
  channel: NotificationChannel;
  priority: NotificationPriority;
  title: string;
  body: string;
  icon?: string;
  data?: Record<string, unknown>;
  sound?: boolean;
  vibrate?: boolean;
  tag?: string;
}

interface NotificationPreferencesState {
  enabled: boolean;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  channels: Record<NotificationChannel, boolean>;
  quietHoursEnabled: boolean;
  quietHoursStart: string; // "22:00"
  quietHoursEnd: string;   // "07:00"
  setEnabled: (v: boolean) => void;
  setSoundEnabled: (v: boolean) => void;
  setVibrationEnabled: (v: boolean) => void;
  setChannelEnabled: (channel: NotificationChannel, enabled: boolean) => void;
  setQuietHours: (enabled: boolean, start?: string, end?: string) => void;
}

export const useNotificationPreferences = create<NotificationPreferencesState>()(
  persist(
    (set) => ({
      enabled: true,
      soundEnabled: true,
      vibrationEnabled: true,
      channels: { message: true, call: true, system: true, payment: true, location: true },
      quietHoursEnabled: false,
      quietHoursStart: "22:00",
      quietHoursEnd: "07:00",

      setEnabled: (v) => set({ enabled: v }),
      setSoundEnabled: (v) => set({ soundEnabled: v }),
      setVibrationEnabled: (v) => set({ vibrationEnabled: v }),
      setChannelEnabled: (channel, enabled) =>
        set((s) => ({ channels: { ...s.channels, [channel]: enabled } })),
      setQuietHours: (enabled, start, end) =>
        set((s) => ({
          quietHoursEnabled: enabled,
          ...(start ? { quietHoursStart: start } : {}),
          ...(end ? { quietHoursEnd: end } : {}),
        })),
    }),
    { name: "orbit-notification-prefs" },
  ),
);

export const NotificationDeviceBridge = {
  /** Check if notifications are supported */
  isSupported(): boolean {
    return "Notification" in window;
  },

  /** Request notification permission from browser/device */
  async requestPermission(): Promise<NotificationPermission> {
    if (!NotificationDeviceBridge.isSupported()) return "denied";
    return Notification.requestPermission();
  },

  /** Get current permission status */
  getPermissionStatus(): NotificationPermission | "unsupported" {
    if (!NotificationDeviceBridge.isSupported()) return "unsupported";
    return Notification.permission;
  },

  /** Check if a notification should be delivered (respects prefs + quiet hours) */
  shouldDeliver(channel: NotificationChannel): boolean {
    const prefs = useNotificationPreferences.getState();
    if (!prefs.enabled) return false;
    if (!prefs.channels[channel]) return false;
    if (prefs.quietHoursEnabled && NotificationDeviceBridge.isQuietHours()) return false;
    return true;
  },

  /** Check if currently in quiet hours */
  isQuietHours(): boolean {
    const prefs = useNotificationPreferences.getState();
    if (!prefs.quietHoursEnabled) return false;

    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const [startH, startM] = prefs.quietHoursStart.split(":").map(Number);
    const [endH, endM] = prefs.quietHoursEnd.split(":").map(Number);
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;

    if (startMinutes < endMinutes) {
      return currentMinutes >= startMinutes && currentMinutes < endMinutes;
    }
    // Overnight quiet hours
    return currentMinutes >= startMinutes || currentMinutes < endMinutes;
  },

  /** Send a system notification */
  async send(payload: NotificationPayload): Promise<boolean> {
    if (!NotificationDeviceBridge.shouldDeliver(payload.channel)) return false;
    if (NotificationDeviceBridge.getPermissionStatus() !== "granted") return false;

    const prefs = useNotificationPreferences.getState();

    try {
      const notification = new Notification(payload.title, {
        body: payload.body,
        icon: payload.icon || "/favicon.ico",
        tag: payload.tag,
        silent: !prefs.soundEnabled || !payload.sound,
        data: payload.data,
      });

      if (prefs.vibrationEnabled && payload.vibrate && "vibrate" in navigator) {
        navigator.vibrate([200]);
      }

      // Auto-close after 5s for non-critical
      if (payload.priority !== "critical") {
        setTimeout(() => notification.close(), 5000);
      }

      return true;
    } catch {
      return false;
    }
  },

  /** Send a message notification */
  async sendMessageNotification(senderName: string, preview: string, conversationId: string) {
    return NotificationDeviceBridge.send({
      channel: "message",
      priority: "normal",
      title: senderName,
      body: preview,
      sound: true,
      vibrate: true,
      tag: `msg-${conversationId}`,
      data: { conversationId, type: "message" },
    });
  },

  /** Send a call notification */
  async sendCallNotification(callerName: string, mode: "audio" | "video", sessionId: string) {
    return NotificationDeviceBridge.send({
      channel: "call",
      priority: "critical",
      title: `Incoming ${mode} call`,
      body: callerName,
      sound: false, // ringtone handles sound
      vibrate: false, // ringtone handles vibration
      tag: `call-${sessionId}`,
      data: { sessionId, type: "call", mode },
    });
  },
};
