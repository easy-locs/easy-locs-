/**
 * useYouSummaries — Derives smart summary strings from canonical family stores.
 * Consumed by the You cockpit to display real current state.
 * Uses targeted selectors — never subscribes to the full store.
 */
import { useMemo } from "react";
import { useNotificationPreferences } from "@/families/notifications/notification-device-bridge";
import { useCallSettingsStore } from "@/families/calls/call-settings";
import { useCallPrivacyStore } from "@/families/calls/call-privacy";
import { useOrbitSettingsStore } from "@/families/tabs/you-tab";

export function useYouSummaries() {
  const notifPrefs = useNotificationPreferences();
  const notifSummary = useMemo(() => {
    if (!notifPrefs.enabled) return "Disabled";
    const parts: string[] = ["Enabled"];
    if (notifPrefs.quietHoursEnabled) parts.push(`Quiet ${notifPrefs.quietHoursStart}–${notifPrefs.quietHoursEnd}`);
    if (!notifPrefs.soundEnabled) parts.push("Sound off");
    return parts.join(" · ");
  }, [notifPrefs.enabled, notifPrefs.quietHoursEnabled, notifPrefs.quietHoursStart, notifPrefs.quietHoursEnd, notifPrefs.soundEnabled]);

  const ringtoneEnabled = useCallSettingsStore(s => s.ringtoneEnabled);
  const defaultAudioOutput = useCallSettingsStore(s => s.defaultAudioOutput);
  const incomingVisibility = useCallPrivacyStore(s => s.incomingVisibility);
  const hideCallerPhoto = useCallPrivacyStore(s => s.hideCallerPhoto);
  const lockScreenPolicy = useCallPrivacyStore(s => s.lockScreenPolicy);

  const callSummary = useMemo(() => {
    const parts: string[] = [];
    parts.push(ringtoneEnabled ? "Ringtone on" : "Ringtone off");
    if (incomingVisibility === "hidden") parts.push("Hidden incoming");
    parts.push(defaultAudioOutput === "speaker" ? "Speaker" : "Earpiece");
    return parts.join(" · ");
  }, [ringtoneEnabled, incomingVisibility, defaultAudioOutput]);

  const privacySummary = useMemo(() => {
    const parts: string[] = [];
    if (hideCallerPhoto) parts.push("Photo hidden");
    if (lockScreenPolicy === "hide") parts.push("Lock screen hidden");
    else if (lockScreenPolicy === "show_notification_only") parts.push("Lock: notification only");
    if (parts.length === 0) return "Default privacy";
    return parts.join(" · ");
  }, [hideCallerPhoto, lockScreenPolicy]);

  const defaultDisappearingTimer = useOrbitSettingsStore(s => s.defaultDisappearingTimer);
  const enterToSend = useOrbitSettingsStore(s => s.enterToSend);
  const defaultLiveLocationDuration = useOrbitSettingsStore(s => s.defaultLiveLocationDuration);
  const chatBackground = useOrbitSettingsStore(s => s.chatBackground);
  const autoDownloadMedia = useOrbitSettingsStore(s => s.autoDownloadMedia);
  const mediaQuality = useOrbitSettingsStore(s => s.mediaQuality);

  const chatDefaultsSummary = useMemo(() => {
    const parts: string[] = [];
    if (defaultDisappearingTimer) {
      const h = defaultDisappearingTimer / 3600;
      parts.push(`Disappearing ${h >= 24 ? `${h / 24}d` : `${h}h`}`);
    } else {
      parts.push("Disappearing off");
    }
    parts.push(enterToSend ? "Enter to send" : "Shift+Enter to send");
    return parts.join(" · ");
  }, [defaultDisappearingTimer, enterToSend]);

  const locationSummary = useMemo(() => `Default ${defaultLiveLocationDuration} min`, [defaultLiveLocationDuration]);

  const backgroundSummary = useMemo(() => chatBackground === "default"
    ? "Default theme"
    : `Custom: ${chatBackground}`, [chatBackground]);

  const mediaSummary = useMemo(() => {
    const parts: string[] = [];
    parts.push(autoDownloadMedia ? "Auto-download on" : "Auto-download off");
    parts.push(`Quality: ${mediaQuality}`);
    return parts.join(" · ");
  }, [autoDownloadMedia, mediaQuality]);

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
