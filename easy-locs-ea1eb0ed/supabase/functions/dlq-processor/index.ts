import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { requireServiceRole } from "../_shared/edge-auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function getBackoffMs(retryCount: number): number {
  return Math.min(2 ** retryCount * 2000, 3600000);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const authCheck = requireServiceRole(req);
  if (!authCheck.authorized) return authCheck.response!;

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  const startTime = Date.now();
  let processed = 0;
  let resolved = 0;
  let dead = 0;
  let retried = 0;
  const errors: string[] = [];

  try {
    const { data: items } = await supabase
      .from("dead_letter_queue")
      .select("*")
      .in("status", ["pending", "retrying"])
      .lte("next_retry_at", new Date().toISOString())
      .order("created_at", { ascending: true })
      .limit(50);

    for (const item of items ?? []) {
      processed++;

      if (item.retry_count >= item.max_retries) {
        await supabase
          .from("dead_letter_queue")
          .update({ status: "dead", updated_at: new Date().toISOString() })
          .eq("id", item.id);
        dead++;
        continue;
      }

      try {
        let success = false;

        if (item.source_system === "email-queue") {
          const { error } = await supabase.functions.invoke("email-queue-process", { body: {} });
          success = !error;
        } else if (item.source_system === "autonomous-cron-dispatcher") {
          const payload = typeof item.payload === "string" ? JSON.parse(item.payload) : item.payload;
          const resp = await fetch(`${supabaseUrl}/functions/v1/${payload.function_name}`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${supabaseKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(payload.body ?? {}),
          });
          success = resp.ok;
        } else if (item.source_system === "wallet") {
          const { error } = await supabase.functions.invoke("wallet-ops", {
            body: item.payload,
          });
          success = !error;
        } else if (item.source_system === "orbit-message") {
          const payload = typeof item.payload === "string" ? JSON.parse(item.payload) : item.payload;
          if (payload?.conversation_id && payload?.sender_user_id && payload?.body_preview) {
            const { error: msgErr } = await supabase.from("messages").insert({
              conversation_id: payload.conversation_id,
              sender_id: payload.sender_user_id,
              content: payload.body_preview,
              type: "text",
              status: "sent",
              created_at: new Date().toISOString(),
            });
            success = !msgErr;
            if (msgErr) console.error(`[dlq] Orbit message retry failed:`, msgErr.message);
          } else {
            console.error(`[dlq] Orbit message item ${item.id} missing required fields (conversation_id, sender_user_id, body_preview)`);
            success = false;
          }
        } else if (item.source_system === "orbit-payment") {
          const { error } = await supabase.functions.invoke("orbit-payment", {
            body: item.payload,
          });
          success = !error;
        } else if (item.source_system.startsWith("job-queue:")) {
          const queueName = item.source_system.replace("job-queue:", "");
          await supabase.from("job_queue").insert({
            queue_name: queueName,
            payload: item.payload,
            priority: 0,
            max_retries: 3,
          });
          success = true;
        } else {
          console.warn(`[dlq] Unknown source_system "${item.source_system}" for item ${item.id} — requeuing as job`);
          await supabase.from("job_queue").insert({
            queue_name: "dlq-retry",
            payload: { dlq_id: item.id, source_system: item.source_system, original_payload: item.payload },
            priority: 0,
            max_retries: 1,
          });
          success = true;
        }

        if (success) {
          await supabase
            .from("dead_letter_queue")
            .update({
              status: "resolved",
              resolved_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq("id", item.id);
          resolved++;
        } else {
          throw new Error("Retry operation returned failure");
        }
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        const nextRetry = new Date(Date.now() + getBackoffMs(item.retry_count + 1)).toISOString();
        await supabase
          .from("dead_letter_queue")
          .update({
            status: "retrying",
            retry_count: item.retry_count + 1,
            next_retry_at: nextRetry,
            error: msg,
            updated_at: new Date().toISOString(),
          })
          .eq("id", item.id);
        retried++;
        errors.push(`${item.id}: ${msg}`);
      }
    }

    const { count: dlqCount } = await supabase
      .from("dead_letter_queue")
      .select("id", { count: "exact", head: true })
      .in("status", ["pending", "retrying"]);

    if ((dlqCount ?? 0) > 50) {
      await supabase.functions.invoke("alert-dispatcher", {
        body: {
          alert_type: "dlq_overflow",
          severity: "critical",
          title: "DLQ Overflow Alert",
          message: `Dead letter queue has ${dlqCount} unprocessed items`,
          source_system: "dlq-processor",
        },
      }).catch((e: unknown) => {
        console.error("[dlq] alert dispatch for overflow failed:", e);
      });
    }

    await supabase.rpc("update_autonomy_status", {
      p_system_name: "dead_letter_queue",
      p_status: dead === 0 && errors.length === 0 ? "green" : dead > 0 ? "yellow" : "red",
      p_error_message: errors.length > 0 ? errors[0] : null,
    }).catch((e: unknown) => {
      console.error("[dlq] autonomy status update failed:", e);
    });

    return new Response(
      JSON.stringify({
        processed,
        resolved,
        dead,
        retried,
        pending_count: dlqCount ?? 0,
        total_ms: Date.now() - startTime,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return new Response(
      JSON.stringify({ error: msg }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
