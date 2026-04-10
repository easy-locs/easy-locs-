/**
 * FAMILY: SETTINGS — Canonical communication settings hub.
 * Single source of truth for all per-device/per-user communication preferences.
 * Subfamilies: call, notification, privacy, media, location, thread.
 */

// ── Call Settings ──
export { useCallSettingsStore } from "@/families/calls/call-settings";

// ── Call Privacy ──
export { useCallPrivacyStore, CallPrivacy } from "@/families/calls/call-privacy";
export type { IncomingCallVisibility, LockScreenPolicy } from "@/families/calls/call-privacy";

// ── Notification Preferences ──
export { useNotificationPreferences, NotificationDeviceBridge } from "@/families/notifications/notification-device-bridge";
export type { NotificationChannel, NotificationPriority } from "@/families/notifications/notification-device-bridge";

// ── Audio Route ──
export { useAudioRouteStore, CallAudioRoute } from "@/families/calls/call-audio-route";
export type { AudioOutputDevice } from "@/families/calls/call-audio-route";

// ── Ringtone ──
export { useRingtoneStore, CallRingtone } from "@/families/calls/call-ringtone";
export type { RingtoneType } from "@/families/calls/call-ringtone";

// Settings family owns: all persisted communication preferences.
// No component should maintain its own local settings state for these concerns.
