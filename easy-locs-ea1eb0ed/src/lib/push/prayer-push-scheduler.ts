import type { PrayerTime } from "@/hooks/usePrayerTimes";
import { registerPushNotifications } from "./registerPush";
import { db as supabase } from "@/services/db";

import { cFrom, cRpc } from "@/lib/execution/content-mutation";
const PRAYER_ICONS: Record<string, string> = {
  Fajr: "🌙",
  Dhuhr: "☀️",
  Asr: "🌤️",
  Maghrib: "🌅",
  Isha: "🌃",
};

const LS_PUSH_REGISTERED_KEY = "prayer_push_registered";

let scheduledTimers: ReturnType<typeof setTimeout>[] = [];

function parseTimeToDate(timeStr: string): Date {
  const [h = "0", m = "0"] = timeStr.split(":");
  const d = new Date();
  d.setHours(parseInt(h), parseInt(m), 0, 0);
  return d;
}

async function getServiceWorkerRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (!("serviceWorker" in navigator)) return null;
  try {
    const reg = await navigator.serviceWorker.ready;
    return reg;
  } catch {
    return null;
  }
}

export async function showPrayerPushNotification(
  prayerName: string,
  prayerTime: string,
): Promise<void> {
  const reg = await getServiceWorkerRegistration();
  if (!reg) return;

  const icon = PRAYER_ICONS[prayerName] || "🕌";

  const options: NotificationOptions & Record<string, unknown> = {
    body: `Il est ${prayerTime} — C'est l'heure de la prière ${prayerName}.`,
    icon: "/icons/icon-192x192.png",
    badge: "/favicon-32x32.png",
    tag: `prayer-${prayerName}-${new Date().toDateString()}`,
    requireInteraction: true,
    silent: false,
    data: {
      url: "/dashboard/islamic?tab=prayer",
      event_type: "prayer_time",
      prayer_name: prayerName,
      prayer_time: prayerTime,
    },
    actions: [
      { action: "open", title: "Ouvrir" },
      { action: "dismiss", title: "Fermer" },
    ],
  };

  await reg.showNotification(
    `${icon} ${prayerName} — L'heure de la prière`,
    options,
  );
}

export function clearScheduledPrayerNotifications(): void {
  for (const timer of scheduledTimers) {
    clearTimeout(timer);
  }
  scheduledTimers = [];
}

const pushFiredSet = new Set<string>();

export function schedulePrayerNotifications(
  prayers: PrayerTime[],
  enabledPrayers: Record<string, boolean>,
  offsetMinutes: number,
  _firedSet: Set<string>,
): void {
  clearScheduledPrayerNotifications();

  const now = Date.now();
  const todayKey = new Date().toDateString();

  for (const prayer of prayers) {
    const prayerKey = prayer.name.toLowerCase();
    if (enabledPrayers[prayerKey] === false) continue;

    const fireKey = `${todayKey}-${prayer.name}`;
    if (pushFiredSet.has(fireKey)) continue;

    const prayerDate = parseTimeToDate(prayer.time);
    prayerDate.setMinutes(prayerDate.getMinutes() - offsetMinutes);

    const delayMs = prayerDate.getTime() - now;

    if (delayMs > 0 && delayMs < 24 * 60 * 60 * 1000) {
      const timer = setTimeout(() => {
        if (pushFiredSet.has(fireKey)) return;
        pushFiredSet.add(fireKey);
        void showPrayerPushNotification(prayer.name, prayer.time);
      }, delayMs);
      scheduledTimers.push(timer);
    }
  }
}

function getLocalDateString(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function getUserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return "UTC";
  }
}

export async function syncPrayerScheduleToServer(
  userId: string,
  prayers: PrayerTime[],
  enabledPrayers: Record<string, boolean>,
  offsetMinutes: number,
  lat: number | null,
  lng: number | null,
): Promise<void> {
  try {
    const schedule = prayers
      .filter((p) => enabledPrayers[p.name.toLowerCase()] !== false)
      .map((p) => ({
        name: p.name,
        time: p.time,
      }));

    const scheduleDate = getLocalDateString();
    const { data: existing } = await cFrom("prayer_push_schedules")
      .select("schedule_date")
      .eq("user_id", userId)
      .eq("schedule_date", scheduleDate)
      .maybeSingle();

    const row: Record<string, unknown> = {
      user_id: userId,
      schedule_date: scheduleDate,
      prayers: schedule,
      offset_minutes: offsetMinutes,
      timezone: getUserTimezone(),
      lat,
      lng,
      updated_at: new Date().toISOString(),
    };

    if (!existing) {
      row.sent_prayers = [];
    }

    await cFrom("prayer_push_schedules").upsert(row, { onConflict: "user_id,schedule_date" });
  } catch (e) {
    console.warn("[prayer-push] Failed to sync schedule to server:", e);
  }
}

export async function ensurePushRegistered(userId?: string): Promise<boolean> {
  const cacheKey = userId ? `${LS_PUSH_REGISTERED_KEY}_${userId}` : LS_PUSH_REGISTERED_KEY;

  try {
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (parsed.registered && Date.now() - parsed.timestamp < 7 * 24 * 60 * 60 * 1000) {
        return true;
      }
    }
  } catch {}

  try {
    const result = await registerPushNotifications();
    if (result.registered && result.token) {
      try {
        localStorage.setItem(
          cacheKey,
          JSON.stringify({ registered: true, timestamp: Date.now() }),
        );
      } catch {}
      return true;
    }
  } catch (e) {
    console.warn("[prayer-push] Push registration failed:", e);
  }

  return false;
}

export function isPushSupported(): boolean {
  return "serviceWorker" in navigator && "Notification" in window && "PushManager" in window;
}

export async function getPushPermissionState(): Promise<"granted" | "denied" | "prompt" | "unsupported"> {
  if (!isPushSupported()) return "unsupported";
  return Notification.permission as "granted" | "denied" | "prompt";
}
