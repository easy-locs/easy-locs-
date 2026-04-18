import { requireRouterOrigin } from "../_shared/edge-function-consolidation.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { requireServiceRole } from "../_shared/edge-auth.ts";
import { rejectQuerySecrets } from "../_shared/reject-query-secrets.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version, x-trace-id, x-span-id, x-parent-span-id, x-request-id, traceparent",
};

Deno.serve(async (req) => {
  const __qsCheck = rejectQuerySecrets(req); if (__qsCheck.rejected) return __qsCheck.response!;
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const routerCheck = requireRouterOrigin(req);
  if (!routerCheck.allowed) return routerCheck.response!;
  const auth = requireServiceRole(req);
  if (!auth.authorized) return auth.response!;

  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    let sent = 0;
    let failed = 0;
    let totalProcessed = 0;

    let directPayload: { to_email?: string; subject?: string; html?: string } | null = null;
    try {
      const body = await req.json();
      if (body?.to_email && body?.subject) {
        directPayload = body;
      }
    } catch {}

    if (directPayload) {
      totalProcessed++;
      try {
        console.log(`[email-send-direct] to=${directPayload.to_email} subject=${directPayload.subject}`);

        const sendResp = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/send-email`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(directPayload),
        });

        if (!sendResp.ok) {
          throw new Error(`send-email returned ${sendResp.status}`);
        }
        sent++;
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        failed++;
        console.error("Direct email send failed:", msg);

        await admin.rpc("insert_into_dlq", {
          p_source_system: "email-queue",
          p_operation_type: "send_email",
          p_payload: directPayload,
          p_error: msg,
        }).catch(() => {});
      }

      return new Response(
        JSON.stringify({ processed: totalProcessed, sent, failed, source: "direct" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    const { data: emails, error } = await admin
      .from("email_queue")
      .select("*")
      .eq("status", "pending")
      .limit(20);

    if (error) throw error;

    for (const email of emails ?? []) {
      totalProcessed++;
      try {
        console.log(`[email-send] to=${email.to_email} subject=${email.subject}`);

        const sendResp = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/send-email`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            to: email.to_email,
            subject: email.subject,
            html: email.html_body ?? email.body ?? "",
          }),
        });

        if (!sendResp.ok) {
          throw new Error(`send-email returned ${sendResp.status}`);
        }

        await admin
          .from("email_queue")
          .update({ status: "sent", sent_at: new Date().toISOString() })
          .eq("id", email.id);

        sent++;
      } catch (sendError: unknown) {
        const msg = sendError instanceof Error ? sendError.message : String(sendError);

        await admin
          .from("email_queue")
          .update({ status: "failed" })
          .eq("id", email.id);

        await admin.rpc("insert_into_dlq", {
          p_source_system: "email-queue",
          p_operation_type: "send_email",
          p_payload: {
            email_id: email.id,
            to_email: email.to_email,
            subject: email.subject,
          },
          p_error: msg,
        }).catch(() => {});

        failed++;
        console.error("Email send failed:", msg);
      }
    }

    return new Response(
      JSON.stringify({ processed: totalProcessed, sent, failed, source: { legacy: emails?.length ?? 0 } }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return new Response(
      JSON.stringify({ error: msg }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
