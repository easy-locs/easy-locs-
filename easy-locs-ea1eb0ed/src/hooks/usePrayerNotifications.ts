import { useEffect, useRef, useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/services/db";
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

const PRAYER_ICONS: Record<string, string> = {
  Fajr: "🌙",
  Dhuhr: "☀️",
  Asr: "🌤️",
  Maghrib: "🌅",
  Isha: "🌃",
};

function parseTimeToDate(timeStr: string): Date {
  const [h = "0", m = "0"] = timeStr.split(":");
  const d = new Date();
  d.setHours(parseInt(h), parseInt(m), 0, 0);
  return d;
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

function sendBrowserNotification(prayer: PrayerTime) {
  if (!("Notification" in window)) return;
  if (Notification.permission !== "granted") return;

  const icon = PRAYER_ICONS[prayer.name] || "🕌";

  try {
    new Notification(`${icon} ${prayer.name} — Time to Pray`, {
      body: `It's ${prayer.time} — ${prayer.name} prayer time has arrived.`,
      icon: "/icons/icon-192x192.png",
      tag: `prayer-${prayer.name}-${new Date().toDateString()}`,
      requireInteraction: false,
      silent: false,
    });
  } catch {
    // Notification constructor may fail in some environments
  }
}

export function usePrayerNotifications(prayers: PrayerTime[]) {
  const { user } = useAuth();
  const firedRef = useRef<Set<string>>(new Set());
  const prefsRef = useRef<NotificationPrefs | null>(null);
  const prefsLoadedRef = useRef(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const permissionCheckedRef = useRef(false);

  useEffect(() => {
    if (!user?.id) return;

    db.from("adhan_notification_prefs")
      .select("enabled, fajr, dhuhr, asr, maghrib, isha, offset_minutes")
      .eq("user_id", user.id)
      .single()
      .then(({ data }) => {
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
        }
      })
      .catch(() => {
        prefsRef.current = { enabled: false };
        prefsLoadedRef.current = true;
        setNotificationsEnabled(false);
      });
  }, [user?.id]);

  useEffect(() => {
    if (!prayers.length) return;

    const checkAndNotify = () => {
      const prefs = prefsRef.current;
      if (!prefs || !prefs.enabled) return;
      if (!prefsLoadedRef.current) return;

      const now = new Date();
      const todayKey = now.toDateString();
      const offsetMinutes = prefs.offset_minutes ?? 0;

      for (const prayer of prayers) {
        const prayerKey = prayer.name.toLowerCase() as keyof NotificationPrefs;
        if (prefs[prayerKey] === false) continue;

        const fireKey = `${todayKey}-${prayer.name}`;
        if (firedRef.current.has(fireKey)) continue;

        const prayerDate = parseTimeToDate(prayer.time);
        prayerDate.setMinutes(prayerDate.getMinutes() - offsetMinutes);

        const diffMs = now.getTime() - prayerDate.getTime();

        if (diffMs >= 0 && diffMs < 120_000) {
          firedRef.current.add(fireKey);
          sendBrowserNotification(prayer);
        }
      }
    };

    checkAndNotify();
    const interval = setInterval(checkAndNotify, 30_000);
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

  return { notificationsEnabled };
}

export function usePrayerNotificationStatus() {
  const { user } = useAuth();
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    db.from("adhan_notification_prefs")
      .select("enabled")
      .eq("user_id", user.id)
      .single()
      .then(({ data }) => setEnabled(data?.enabled ?? false))
      .catch(() => setEnabled(false));
  }, [user?.id]);

  return enabled;
}
