import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { fetchAdhanNotificationFullPrefs } from "@/services/domain/orbit.service";
import { playAdhan, preloadAdhanAudio } from "@/lib/adhan-audio";
import {
  showPrayerPushNotification,
  schedulePrayerNotifications,
  clearScheduledPrayerNotifications,
  syncPrayerScheduleToServer,
  ensurePushRegistered,
  isPushSupported,
} from "@/lib/push/prayer-push-scheduler";
import type { PrayerTime } from "./usePrayerTimes";

interface NotificationPrefs {
  enabled: boolean;
  fajr?: boolean;
  dhuhr?: boolean;
  asr?: boolean;
  maghrib?: boolean;
  isha?: boolean;
  offset_minutes?: number;
}

const NOTIFIABLE_PRAYERS = ["fajr", "dhuhr", "asr", "maghrib", "isha"];

export const PRAYER_PREFS_CHANGED_EVENT = "prayer-prefs-changed";

export function dispatchPrayerPrefsChanged(): void {
  window.dispatchEvent(new CustomEvent(PRAYER_PREFS_CHANGED_EVENT));
}

export function parseTimeToDate(timeStr: string): Date {
  const [h = "0", m = "0"] = timeStr.split(":");
  const d = new Date();
  d.setHours(parseInt(h), parseInt(m), 0, 0);
  return d;
}

export interface CheckAndNotifyDeps {
  prefs: NotificationPrefs | null;
  prefsLoaded: boolean;
  firedSet: Set<string>;
  prayers: PrayerTime[];
  showNotification: (name: string, time: string) => void;
  playAdhanSound: (name: string) => void;
}

export function checkAndNotify(deps: CheckAndNotifyDeps): void {
  const { prefs, prefsLoaded, firedSet, prayers, showNotification, playAdhanSound } = deps;
  if (!prefs || !prefs.enabled) return;
  if (!prefsLoaded) return;

  const now = new Date();
  const todayKey = now.toDateString();
  const offsetMinutes = prefs.offset_minutes ?? 0;
  for (const prayer of prayers) {
    const prayerKey = prayer.name.toLowerCase() as keyof NotificationPrefs;
    if (prefs[prayerKey] === false) continue;

    const fireKey = `${todayKey}-${prayer.name}`;
    if (firedSet.has(fireKey)) continue;

    const prayerDate = parseTimeToDate(prayer.time);
    prayerDate.setMinutes(prayerDate.getMinutes() - offsetMinutes);

    const diffMs = now.getTime() - prayerDate.getTime();

    if (diffMs >= 0 && diffMs < 120_000) {
      firedSet.add(fireKey);
      void showNotification(prayer.name, prayer.time);
      void playAdhanSound(prayer.name);
    }
  }
}

async function ensureNotificationPermission(): Promise<boolean> {
  if (!("Notification" in window)) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  try {
    const result = await Notification.requestPermission();
    return result === "granted";
  } catch {
    return false;
  }
}

export function usePrayerNotifications(
  prayers: PrayerTime[],
  lat?: number | null,
  lng?: number | null,
) {
  const { user } = useAuth();
  const firedRef = useRef<Set<string>>(new Set());
  const prefsRef = useRef<NotificationPrefs | null>(null);
  const prefsLoadedRef = useRef(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [pushRegistered, setPushRegistered] = useState(false);
  const permissionCheckedRef = useRef(false);
  const pushRegisteredRef = useRef(false);
  const [prefsVersion, setPrefsVersion] = useState(0);

  const loadPrefs = useCallback(() => {
    if (!user?.id) return;

    fetchAdhanNotificationFullPrefs(user.id)
      .then((data) => {
        if (data) {
          prefsRef.current = data as NotificationPrefs;
          setNotificationsEnabled(data.enabled ?? false);
        } else {
          prefsRef.current = { enabled: false };
          setNotificationsEnabled(false);
        }
        prefsLoadedRef.current = true;

        if (data?.enabled && !permissionCheckedRef.current) {
          permissionCheckedRef.current = true;
          ensureNotificationPermission();
          preloadAdhanAudio();

          if (isPushSupported() && !pushRegisteredRef.current) {
            pushRegisteredRef.current = true;
            ensurePushRegistered(user.id).then((registered) => {
              setPushRegistered(registered);
            });
          }
        }
      })
      .catch(() => {
        prefsRef.current = { enabled: false };
        prefsLoadedRef.current = true;
        setNotificationsEnabled(false);
      });
  }, [user?.id]);

  useEffect(() => {
    loadPrefs();
  }, [loadPrefs]);

  useEffect(() => {
    const handler = () => {
      setPrefsVersion((v) => v + 1);
      loadPrefs();
    };
    window.addEventListener(PRAYER_PREFS_CHANGED_EVENT, handler);
    return () => window.removeEventListener(PRAYER_PREFS_CHANGED_EVENT, handler);
  }, [loadPrefs]);

  const prayerScheduleKey = useMemo(() => {
    if (!prayers.length) return "";
    return prayers.map((p) => `${p.name}:${p.time}`).join("|");
  }, [prayers]);

  const lastSyncedKeyRef = useRef("");

  useEffect(() => {
    if (!prayerScheduleKey) return;

    if (!notificationsEnabled) {
      clearScheduledPrayerNotifications();
      if (user?.id) {
        const disabledPrayers: Record<string, boolean> = {};
        for (const key of NOTIFIABLE_PRAYERS) {
          disabledPrayers[key] = false;
        }
        const disableKey = `disabled|${prayerScheduleKey}`;
        if (lastSyncedKeyRef.current !== disableKey) {
          lastSyncedKeyRef.current = disableKey;
          void syncPrayerScheduleToServer(user.id, [], disabledPrayers, 0, lat ?? null, lng ?? null);
        }
      }
      return;
    }

    const prefs = prefsRef.current;
    if (!prefs || !prefs.enabled) return;

    const enabledPrayers: Record<string, boolean> = {};
    for (const key of NOTIFIABLE_PRAYERS) {
      enabledPrayers[key] = (prefs[key as keyof NotificationPrefs] as boolean) !== false;
    }
    const offsetMinutes = prefs.offset_minutes ?? 0;

    schedulePrayerNotifications(prayers, enabledPrayers, offsetMinutes, firedRef.current);

    const localDate = new Date().toISOString().slice(0, 10);
    const syncKey = `${localDate}|${prayerScheduleKey}|${offsetMinutes}|${lat}|${lng}|${Object.values(enabledPrayers).join(",")}`;
    if (user?.id && syncKey !== lastSyncedKeyRef.current) {
      lastSyncedKeyRef.current = syncKey;
      void syncPrayerScheduleToServer(
        user.id,
        prayers,
        enabledPrayers,
        offsetMinutes,
        lat ?? null,
        lng ?? null,
      );
    }

    return () => {
      clearScheduledPrayerNotifications();
    };
  }, [prayerScheduleKey, user?.id, lat, lng, notificationsEnabled, prayers, prefsVersion]);

  useEffect(() => {
    if (!prayers.length) return;

    const poll = () => {
      checkAndNotify({
        prefs: prefsRef.current,
        prefsLoaded: prefsLoadedRef.current,
        firedSet: firedRef.current,
        prayers,
        showNotification: showPrayerPushNotification,
        playAdhanSound: playAdhan,
      });
    };

    poll();
    const interval = setInterval(poll, 30_000);
    return () => clearInterval(interval);
  }, [prayers]);

  const resetDailyFired = useCallback(() => {
    const today = new Date().toDateString();
    const entries = Array.from(firedRef.current);
    for (const entry of entries) {
      if (!entry.startsWith(today)) {
        firedRef.current.delete(entry);
      }
    }
  }, []);

  useEffect(() => {
    resetDailyFired();
    const midnight = new Date();
    midnight.setHours(24, 0, 5, 0);
    const msUntilMidnight = midnight.getTime() - Date.now();
    const timer = setTimeout(() => {
      firedRef.current.clear();
      resetDailyFired();
    }, msUntilMidnight);
    return () => clearTimeout(timer);
  }, [resetDailyFired]);

  return { notificationsEnabled, pushRegistered };
}

export function usePrayerNotificationStatus() {
  const { user } = useAuth();
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    fetchAdhanNotificationFullPrefs(user.id)
      .then((data) => setEnabled(data?.enabled ?? false))
      .catch(() => setEnabled(false));
  }, [user?.id]);

  return enabled;
}
