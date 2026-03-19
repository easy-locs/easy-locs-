/**
 * DINO Sync Worker — Processes pending sync jobs from dino_sync_jobs table.
 * Called periodically via cron or manual trigger.
 */
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function sanitizeUiLabel(input: string): string {
  if (!input) return input;
  if (/https?:\/\//i.test(input)) return input;
  if (/^\d+(\.\d+)?$/.test(input)) return input;
  return input
    .replace(/([A-Za-zÀ-ÿ])\.([A-Za-zÀ-ÿ])/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Fetch pending jobs ordered by priority
    const { data: jobs, error } = await supabase
      .from("dino_sync_jobs")
      .select("*")
      .eq("status", "pending")
      .lte("scheduled_at", new Date().toISOString())
      .order("priority", { ascending: true })
      .limit(50);

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let processed = 0;

    for (const job of jobs ?? []) {
      // Mark as running
      await supabase
        .from("dino_sync_jobs")
        .update({
          status: "running",
          started_at: new Date().toISOString(),
          attempts: (job.attempts ?? 0) + 1,
        })
        .eq("id", job.id);

      try {
        switch (job.job_type) {
          case "sanitize_labels": {
            const details = job.payload_json?.details ?? {};
            const original = String(details.original ?? job.payload_json?.description ?? "");
            const sanitized = sanitizeUiLabel(original);

            if (original && original !== sanitized) {
              await supabase.from("category_cleanup_tasks").insert({
                entity_type: "route_label",
                entity_id: job.entity_id,
                old_value: original,
                proposed_value: sanitized,
                applied: false,
              });
            }
            break;
          }

          case "normalize_media": {
            // Mark media assets as processing
            await supabase
              .from("media_assets")
              .update({ status: "processing" })
              .eq("owner_type", job.entity_type)
              .eq("owner_id", job.entity_id)
              .eq("status", "pending");
            break;
          }

          case "send_pro_reminder":
          case "send_user_recovery": {
            // Queue a notification
            await supabase.from("dino_notifications").insert({
              actor_type: job.entity_type,
              actor_id: job.entity_id,
              channel: "email",
              template_key: job.job_type,
              payload_json: job.payload_json ?? {},
              status: "pending",
            });
            break;
          }

          default:
            console.log(`No handler for job type: ${job.job_type}`);
        }

        // Mark done
        await supabase
          .from("dino_sync_jobs")
          .update({ status: "done", finished_at: new Date().toISOString() })
          .eq("id", job.id);

        processed += 1;
      } catch (e: any) {
        await supabase
          .from("dino_sync_jobs")
          .update({
            status: "failed",
            last_error: e?.message ?? "Unknown error",
            finished_at: new Date().toISOString(),
          })
          .eq("id", job.id);
      }
    }

    console.log(`DINO worker processed ${processed} jobs`);
    return new Response(JSON.stringify({ ok: true, processed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("DINO worker error:", err);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
