import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { requireServiceRole } from "../_shared/edge-auth.ts";
import { withEdgeLogging } from "../_shared/with-logging.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const PRAYER_ICONS: Record<string, string> = {
  Fajr: "🌙",
  Dhuhr: "☀️",
  Asr: "🌤️",
  Maghrib: "🌅",
  Isha: "🌃",
};

interface PrayerScheduleRow {
  user_id: string;
  schedule_date: string;
  prayers: { name: string; time: string }[];
  offset_minutes: number;
  timezone: string;
  sent_prayers: string[];
}

function getCurrentLocalMinutes(timezone: string): { localMinutes: number; localDate: string } {
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

function isWithinWindow(
  prayerTimeStr: string,
  offsetMinutes: number,
  nowMinutes: number,
): boolean {
  const [h, m] = prayerTimeStr.split(":").map(Number);
  const prayerMinutes = h * 60 + m - offsetMinutes;
  const diff = nowMinutes - prayerMinutes;
  return diff >= 0 && diff < 2;
}

Deno.serve(withEdgeLogging("prayer-push-cron", async (req, logger) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const authCheck = requireServiceRole(req);
  if (!authCheck.authorized) return authCheck.response!;

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    logger.info("prayer_push_cron_started", {});

    const { data: schedules, error: fetchErr } = await supabase
      .from("prayer_push_schedules")
      .select("user_id, schedule_date, prayers, offset_minutes, timezone, sent_prayers");

    if (fetchErr) {
      logger.error("prayer_push_cron_fetch_error", { error: fetchErr.message });
      return new Response(
        JSON.stringify({ error: fetchErr.message }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 },
      );
    }

    if (!schedules || schedules.length === 0) {
      return new Response(
        JSON.stringify({ processed: 0, sent: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    let totalSent = 0;
    let totalFailed = 0;

    const toNotify: {
      userId: string;
      prayerName: string;
      prayerTime: string;
      scheduleDate: string;
    }[] = [];

    for (const schedule of schedules as PrayerScheduleRow[]) {
      const tz = schedule.timezone || "UTC";
      const { localMinutes, localDate } = getCurrentLocalMinutes(tz);

      if (schedule.schedule_date !== localDate) continue;

      const sentPrayers = schedule.sent_prayers || [];

      for (const prayer of schedule.prayers) {
        if (sentPrayers.includes(prayer.name)) continue;

        if (isWithinWindow(prayer.time, schedule.offset_minutes, localMinutes)) {
          toNotify.push({
            userId: schedule.user_id,
            prayerName: prayer.name,
            prayerTime: prayer.time,
            scheduleDate: schedule.schedule_date,
          });
        }
      }
    }

    for (const entry of toNotify) {
      const { userId, prayerName, prayerTime } = entry;
      const icon = PRAYER_ICONS[prayerName] || "🕌";

      try {
        const { data: invokeResult, error: invokeErr } = await supabase.functions.invoke(
          "send-push-notification",
          {
            body: {
              user_id: userId,
              title: `${icon} ${prayerName} — L'heure de la prière`,
              body: `Il est ${prayerTime} — C'est l'heure de la prière ${prayerName}.`,
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
          logger.error("prayer_push_invoke_error", {
            userId,
            prayerName,
            error: invokeErr.message,
          });
          totalFailed++;
          continue;
        }

        const resultData = invokeResult as { sent?: number; failed?: number; error?: string } | null;
        if (resultData?.error) {
          logger.error("prayer_push_send_failed", {
            userId,
            prayerName,
            error: resultData.error,
          });
          totalFailed++;
          continue;
        }

        const actualSent = resultData?.sent ?? 0;
        if (actualSent === 0) {
          logger.warn("prayer_push_no_tokens_delivered", {
            userId,
            prayerName,
            failed: resultData?.failed ?? 0,
          });
          totalFailed++;
          continue;
        }

        const { error: rpcErr } = await supabase.rpc("append_sent_prayer", {
          p_user_id: userId,
          p_date: entry.scheduleDate,
          p_prayer_name: prayerName,
        });

        if (rpcErr) {
          logger.error("prayer_push_rpc_error", {
            userId,
            prayerName,
            error: rpcErr.message,
          });
        }

        totalSent++;
      } catch (e) {
        logger.error("prayer_push_entry_error", {
          userId,
          prayerName,
          error: e instanceof Error ? e.message : String(e),
        });
        totalFailed++;
      }
    }

    logger.info("prayer_push_cron_complete", {
      processed: schedules.length,
      sent: totalSent,
      failed: totalFailed,
    });

    return new Response(
      JSON.stringify({ processed: schedules.length, sent: totalSent, failed: totalFailed }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    logger.error("prayer_push_cron_error", { error: msg });
    return new Response(
      JSON.stringify({ error: msg }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 },
    );
  }
}));
