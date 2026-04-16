export interface PrayerSendState {
  state: "claimed" | "sent" | "failed";
  retry_count: number;
  claimed_at: string | null;
}

export interface PrayerScheduleRow {
  user_id: string;
  schedule_date: string;
  prayers: { name: string; time: string }[];
  offset_minutes: number;
  timezone: string;
  sent_prayers: string[];
  prayer_send_states: Record<string, PrayerSendState>;
  max_retry_count: number;
}

export interface PrayerNotifyEntry {
  userId: string;
  prayerName: string;
  prayerTime: string;
  scheduleDate: string;
  isRetry: boolean;
  retryCount: number;
}

export function getCurrentLocalMinutes(timezone: string): { localMinutes: number; localDate: string } {
  try {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    const parts = formatter.formatToParts(now);
    const h = parseInt(parts.find((p) => p.type === "hour")?.value ?? "0");
    const m = parseInt(parts.find((p) => p.type === "minute")?.value ?? "0");
    const y = parts.find((p) => p.type === "year")?.value ?? "";
    const mo = parts.find((p) => p.type === "month")?.value ?? "";
    const d = parts.find((p) => p.type === "day")?.value ?? "";
    return { localMinutes: h * 60 + m, localDate: `${y}-${mo}-${d}` };
  } catch {
    const now = new Date();
    return {
      localMinutes: now.getUTCHours() * 60 + now.getUTCMinutes(),
      localDate: now.toISOString().slice(0, 10),
    };
  }
}

export function isWithinWindow(
  prayerTimeStr: string,
  offsetMinutes: number,
  nowMinutes: number,
): boolean {
  const [h, m] = prayerTimeStr.split(":").map(Number);
  let reminderMinutes = h * 60 + m - offsetMinutes;
  if (reminderMinutes < 0) reminderMinutes += 1440;
  if (reminderMinutes >= 1440) reminderMinutes -= 1440;
  const diff = nowMinutes - reminderMinutes;
  const wrappedDiff = diff < -720 ? diff + 1440 : diff > 720 ? diff - 1440 : diff;
  return wrappedDiff >= 0 && wrappedDiff < 2;
}

const PRAYER_ICONS: Record<string, string> = {
  Fajr: "\u{1F319}",
  Dhuhr: "\u{2600}\u{FE0F}",
  Asr: "\u{1F324}\u{FE0F}",
  Maghrib: "\u{1F305}",
  Isha: "\u{1F303}",
};

export interface CronLogger {
  info(event: string, data: Record<string, unknown>): void;
  error(event: string, data: Record<string, unknown>): void;
  warn(event: string, data: Record<string, unknown>): void;
}

export interface SupabaseClient {
  from(table: string): {
    select(columns: string): { data: unknown; error: { message: string } | null } | PromiseLike<{ data: unknown; error: { message: string } | null }>;
    delete(): { lt(col: string, val: string): PromiseLike<{ error: { message: string } | null }> };
  };
  functions: {
    invoke(name: string, opts: { body: unknown }): PromiseLike<{ data: unknown; error: { message: string } | null }>;
  };
  rpc(fn: string, params: Record<string, unknown>): PromiseLike<{ data: unknown; error: { message: string } | null }>;
}

async function sendPushNotification(
  supabase: SupabaseClient,
  userId: string,
  prayerName: string,
  prayerTime: string,
  icon: string,
): Promise<{ success: boolean; error?: string }> {
  const { data: invokeResult, error: invokeErr } = await supabase.functions.invoke(
    "send-push-notification",
    {
      body: {
        user_id: userId,
        title: `${icon} ${prayerName} \u2014 L'heure de la pri\u00E8re`,
        body: `Il est ${prayerTime} \u2014 C'est l'heure de la pri\u00E8re ${prayerName}.`,
        data: {
          event_type: "prayer_time",
          prayer_name: prayerName,
          prayer_time: prayerTime,
          action_url: "/dashboard/islamic?tab=prayer",
        },
      },
    },
  );

  if (invokeErr) {
    return { success: false, error: invokeErr.message };
  }

  const resultData = invokeResult as { sent?: number; failed?: number; error?: string } | null;
  if (resultData?.error) {
    return { success: false, error: resultData.error };
  }

  const actualSent = resultData?.sent ?? 0;
  if (actualSent === 0) {
    return { success: false, error: `no_tokens_delivered (failed: ${resultData?.failed ?? 0})` };
  }

  return { success: true };
}

export async function processPrayerCron(
  supabase: SupabaseClient,
  logger: CronLogger,
): Promise<{ processed: number; sent: number; failed: number; retried: number; error?: string }> {
  const { data: schedules, error: fetchErr } = await supabase
    .from("prayer_push_schedules")
    .select("user_id, schedule_date, prayers, offset_minutes, timezone, sent_prayers, prayer_send_states, max_retry_count") as { data: PrayerScheduleRow[] | null; error: { message: string } | null };

  if (fetchErr) {
    logger.error("prayer_push_cron_fetch_error", { error: fetchErr.message });
    return { processed: 0, sent: 0, failed: 0, retried: 0, error: fetchErr.message };
  }

  if (!schedules || schedules.length === 0) {
    return { processed: 0, sent: 0, failed: 0, retried: 0 };
  }

  let totalSent = 0;
  let totalFailed = 0;
  let totalRetried = 0;

  const toNotify = findPrayersToNotify(
    schedules,
    (tz) => getCurrentLocalMinutes(tz),
  );

  for (const entry of toNotify) {
    const { userId, prayerName, prayerTime, isRetry, retryCount } = entry;
    const icon = PRAYER_ICONS[prayerName] || "\u{1F54C}";

    try {
      const { data: claimed, error: claimErr } = await supabase.rpc("claim_prayer_send", {
        p_user_id: userId,
        p_date: entry.scheduleDate,
        p_prayer_name: prayerName,
      });

      if (claimErr) {
        logger.error("prayer_push_claim_error", { userId, prayerName, error: claimErr.message });
        totalFailed++;
        continue;
      }

      if (!claimed) {
        continue;
      }

      if (isRetry) {
        logger.info("prayer_push_retrying", { userId, prayerName, retryCount: retryCount + 1 });
        totalRetried++;
      }

      const result = await sendPushNotification(supabase, userId, prayerName, prayerTime, icon);

      if (result.success) {
        const { error: markErr } = await supabase.rpc("mark_prayer_sent", {
          p_user_id: userId,
          p_date: entry.scheduleDate,
          p_prayer_name: prayerName,
        });
        if (markErr) {
          logger.error("prayer_push_mark_sent_error", { userId, prayerName, error: markErr.message });
        }
        logger.info("prayer_push_sent", { userId, prayerName, isRetry });
        totalSent++;
      } else {
        const { error: markErr } = await supabase.rpc("mark_prayer_failed", {
          p_user_id: userId,
          p_date: entry.scheduleDate,
          p_prayer_name: prayerName,
        });
        if (markErr) {
          logger.error("prayer_push_mark_failed_error", { userId, prayerName, error: markErr.message });
        }
        logger.error("prayer_push_failed", { userId, prayerName, error: result.error, isRetry, retryCount });
        totalFailed++;
      }
    } catch (e) {
      const { error: markErr } = await supabase.rpc("mark_prayer_failed", {
        p_user_id: userId,
        p_date: entry.scheduleDate,
        p_prayer_name: prayerName,
      }).catch(() => ({ error: null })) as { error: { message: string } | null };
      if (markErr) {
        logger.error("prayer_push_mark_failed_error", { userId, prayerName, error: markErr.message });
      }
      logger.error("prayer_push_entry_error", {
        userId,
        prayerName,
        error: e instanceof Error ? e.message : String(e),
      });
      totalFailed++;
    }
  }

  logger.info("prayer_push_cron_complete", { processed: schedules.length, sent: totalSent, failed: totalFailed, retried: totalRetried });
  return { processed: schedules.length, sent: totalSent, failed: totalFailed, retried: totalRetried };
}

export function findPrayersToNotify(
  schedules: PrayerScheduleRow[],
  getNow: (tz: string) => { localMinutes: number; localDate: string },
): PrayerNotifyEntry[] {
  const toNotify: PrayerNotifyEntry[] = [];

  for (const schedule of schedules) {
    const tz = schedule.timezone || "UTC";
    const { localMinutes, localDate } = getNow(tz);

    const hasMidnightCrossing = schedule.offset_minutes > 0 &&
      schedule.prayers.some((p) => {
        const [ph, pm] = p.time.split(":").map(Number);
        return ph * 60 + pm - schedule.offset_minutes < 0;
      });

    let matchesDate = schedule.schedule_date === localDate;
    if (!matchesDate && hasMidnightCrossing) {
      const localYesterday = (() => {
        try {
          const fmt = new Intl.DateTimeFormat("en-CA", {
            timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit",
          });
          return fmt.format(new Date(Date.now() - 86400000));
        } catch {
          const y = new Date();
          y.setDate(y.getDate() - 1);
          return y.toISOString().slice(0, 10);
        }
      })();
      matchesDate = schedule.schedule_date === localYesterday;
    }

    if (!matchesDate) continue;

    const sendStates = schedule.prayer_send_states || {};
    const maxRetries = schedule.max_retry_count ?? 3;

    for (const prayer of schedule.prayers) {
      const state = sendStates[prayer.name];

      if (state?.state === "sent") continue;

      if (state?.state === "claimed") {
        const claimedAt = state.claimed_at ? new Date(state.claimed_at).getTime() : 0;
        const isStale = claimedAt > 0 && (Date.now() - claimedAt) > 5 * 60 * 1000;
        if (!isStale) continue;
      }

      if (state?.state === "failed" && state.retry_count >= maxRetries) continue;

      const isRetry = state?.state === "failed" || state?.state === "claimed";
      const retryCount = state?.retry_count ?? 0;

      if (isRetry || isWithinWindow(prayer.time, schedule.offset_minutes, localMinutes)) {
        toNotify.push({
          userId: schedule.user_id,
          prayerName: prayer.name,
          prayerTime: prayer.time,
          scheduleDate: schedule.schedule_date,
          isRetry,
          retryCount,
        });
      }
    }
  }

  return toNotify;
}
