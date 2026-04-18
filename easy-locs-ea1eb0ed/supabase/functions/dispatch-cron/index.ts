import { requireRouterOrigin } from "../_shared/edge-function-consolidation.ts";
// dispatch-cron — Scheduled Edge Function for dispatch expiry/escalation.
// Replaces the former client-side setInterval in smart-dispatch-controller.
//
// Schedule via pg_cron:
//   SELECT cron.schedule('dispatch-cron', '*/5 * * * * *',
//     $$SELECT net.http_post(
//       url := '<SUPABASE_URL>/functions/v1/dispatch-cron',
//       headers := jsonb_build_object('Authorization', 'Bearer ' || '<SERVICE_ROLE_KEY>')
//     )$$
//   );
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { rejectQuerySecrets } from "../_shared/reject-query-secrets.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-trace-id, x-span-id, x-parent-span-id, x-request-id, traceparent",
};

Deno.serve(async (req) => {
  const __qsCheck = rejectQuerySecrets(req); if (__qsCheck.rejected) return __qsCheck.response!;
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const routerCheck = requireRouterOrigin(req);
  if (!routerCheck.allowed) return routerCheck.response!;
  const authHeader = req.headers.get("Authorization") ?? "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const cronSecret = Deno.env.get("DISPATCH_CRON_SECRET");

  const token = authHeader.replace("Bearer ", "");
  const isServiceRole = token === serviceRoleKey;
  const isCronSecret = cronSecret && token === cronSecret;

  if (!isServiceRole && !isCronSecret) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    serviceRoleKey,
  );

  try {
    const nowIso = new Date().toISOString();

    const { data: expired } = await supabase
      .from("mobility_job_offers")
      .select("id,job_id")
      .eq("status", "pending")
      .lt("expires_at", nowIso)
      .limit(50);

    if (!expired?.length) {
      return new Response(JSON.stringify({ expired: 0, escalated: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await supabase
      .from("mobility_job_offers")
      .update({ status: "expired", responded_at: nowIso })
      .in("id", expired.map((o: { id: string }) => o.id));

    const jobIds = [...new Set(expired.map((o: { job_id: string }) => o.job_id))];
    let escalated = 0;

    for (const jobId of jobIds) {
      const { data: accepted } = await supabase
        .from("mobility_job_offers")
        .select("id")
        .eq("job_id", jobId)
        .eq("status", "accepted")
        .limit(1)
        .maybeSingle();

      if (!accepted) {
        const { data: run } = await supabase
          .from("mobility_dispatch_runs")
          .select("id, wave_index, search_radius_km")
          .eq("job_id", jobId)
          .eq("status", "running")
          .maybeSingle();

        if (run) {
          const nextWave = (run.wave_index ?? 0) + 1;
          const nextRadius = Math.min((run.search_radius_km ?? 5) * 1.5, 50);

          if (nextWave > 5) {
            await supabase
              .from("mobility_dispatch_runs")
              .update({ status: "exhausted", updated_at: nowIso })
              .eq("id", run.id);

            await supabase
              .from("mobility_jobs")
              .update({ status: "no_drivers", updated_at: nowIso })
              .eq("id", jobId)
              .in("status", ["searching", "offered"]);
          } else {
            await supabase
              .from("mobility_dispatch_runs")
              .update({
                wave_index: nextWave,
                search_radius_km: nextRadius,
                updated_at: nowIso,
              })
              .eq("id", run.id);

            const { data: job } = await supabase
              .from("mobility_jobs")
              .select("id, pickup_lat, pickup_lng")
              .eq("id", jobId)
              .maybeSingle();

            if (job?.pickup_lat && job?.pickup_lng) {
              const degDelta = nextRadius / 111;
              const { data: nearbyRiders } = await supabase
                .from("rider_presence")
                .select("user_id")
                .eq("is_available", true)
                .eq("is_online", true)
                .gte("lat", job.pickup_lat - degDelta)
                .lte("lat", job.pickup_lat + degDelta)
                .gte("lng", job.pickup_lng - degDelta)
                .lte("lng", job.pickup_lng + degDelta)
                .limit(10);

              if (nearbyRiders?.length) {
                const offerExpiry = new Date(Date.now() + 30_000).toISOString();
                const offers = nearbyRiders.map((r: { user_id: string }) => ({
                  id: crypto.randomUUID(),
                  job_id: jobId,
                  rider_user_id: r.user_id,
                  status: "pending",
                  wave_index: nextWave,
                  expires_at: offerExpiry,
                  created_at: nowIso,
                }));

                await supabase.from("mobility_job_offers").insert(offers);
              }
            }

            await supabase
              .from("mobility_jobs")
              .update({ status: "offered", updated_at: nowIso })
              .eq("id", jobId)
              .in("status", ["searching", "offered"]);
          }
        }
        escalated++;
      }
    }

    console.log(`[dispatch-cron] Expired ${expired.length} offers, escalated ${escalated} jobs`);

    return new Response(JSON.stringify({ expired: expired.length, escalated }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[dispatch-cron] Error:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
