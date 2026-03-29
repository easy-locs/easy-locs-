/**
 * useYouSummaries — Derives smart summary strings from canonical family stores.
 * Consumed by the You cockpit to display real current state.
 */
import { useNotificationPreferences } from "@/families/notifications/notification-device-bridge";
import { useCallSettingsStore } from "@/families/calls/call-settings";
import { useCallPrivacyStore } from "@/families/calls/call-privacy";
import { useOrbitSettingsStore } from "@/families/tabs/you-tab";

export function useYouSummaries() {
  // Notifications
  const notifPrefs = useNotificationPreferences();
  const notifSummary = (() => {
    if (!notifPrefs.enabled) return "Disabled";
    const parts: string[] = ["Enabled"];
    if (notifPrefs.quietHoursEnabled) parts.push(`Quiet ${notifPrefs.quietHoursStart}–${notifPrefs.quietHoursEnd}`);
    if (!notifPrefs.soundEnabled) parts.push("Sound off");
    return parts.join(" · ");
  })();

  // Calls
  const callSettings = useCallSettingsStore();
  const callPrivacy = useCallPrivacyStore();
  const callSummary = (() => {
    const parts: string[] = [];
    parts.push(callSettings.ringtoneEnabled ? "Ringtone on" : "Ringtone off");
    if (callPrivacy.incomingVisibility === "hidden") parts.push("Hidden incoming");
    parts.push(callSettings.defaultAudioOutput === "speaker" ? "Speaker" : "Earpiece");
    return parts.join(" · ");
  })();

  // Privacy
  const privacySummary = (() => {
    const parts: string[] = [];
    if (callPrivacy.hideCallerPhoto) parts.push("Photo hidden");
    if (callPrivacy.lockScreenPolicy === "hide") parts.push("Lock screen hidden");
    else if (callPrivacy.lockScreenPolicy === "show_notification_only") parts.push("Lock: notification only");
    if (parts.length === 0) return "Default privacy";
    return parts.join(" · ");
  })();

  // Chat defaults
  const orbitSettings = useOrbitSettingsStore();
  const chatDefaultsSummary = (() => {
    const parts: string[] = [];
    if (orbitSettings.defaultDisappearingTimer) {
      const h = orbitSettings.defaultDisappearingTimer / 3600;
      parts.push(`Disappearing ${h >= 24 ? `${h / 24}d` : `${h}h`}`);
    } else {
      parts.push("Disappearing off");
    }
    parts.push(orbitSettings.enterToSend ? "Enter to send" : "Shift+Enter to send");
    return parts.join(" · ");
  })();

  // Location
  const locationSummary = `Default ${orbitSettings.defaultLiveLocationDuration} min`;

  // Background
  const backgroundSummary = orbitSettings.chatBackground === "default"
    ? "Default theme"
    : `Custom: ${orbitSettings.chatBackground}`;

  // Media
  const mediaSummary = (() => {
    const parts: string[] = [];
    parts.push(orbitSettings.autoDownloadMedia ? "Auto-download on" : "Auto-download off");
    parts.push(`Quality: ${orbitSettings.mediaQuality}`);
    return parts.join(" · ");
  })();

  // Stories
  const storiesSummary = "Contacts only · 24h expiry";

  return {
    notifSummary,
    callSummary,
    privacySummary,
    chatDefaultsSummary,
    locationSummary,
    backgroundSummary,
    mediaSummary,
    storiesSummary,
  };
}
