import { requireRouterOrigin } from "../_shared/edge-function-consolidation.ts";
/**
 * cleanup-expired-media — Scheduled edge function to delete expired message attachments.
 * 
 * Runs periodically (cron or manual) to:
 * 1. Call cleanup_expired_messages() RPC to delete expired rows
 * 2. Remove associated storage files for view-once and disappearing messages
 * 3. Log cleanup results to audit_logs
 */
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { checkServerRateLimit, rateLimitResponse } from "../_shared/server-rate-limiter.ts";
import { rejectQuerySecrets } from "../_shared/reject-query-secrets.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version, x-trace-id, x-span-id, x-parent-span-id, x-request-id, traceparent",
};

Deno.serve(async (req) => {
  const __qsCheck = rejectQuerySecrets(req); if (__qsCheck.rejected) return __qsCheck.response!;
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const routerCheck = requireRouterOrigin(req);
  if (!routerCheck.allowed) return routerCheck.response!;
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    const rlResult = await checkServerRateLimit(req, "cleanup-expired-media");
    if (!rlResult.allowed) return rateLimitResponse(rlResult);

    // Auth: require service role or valid user
    const authHeader = req.headers.get("Authorization");
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      // Allow service role key
      if (token !== Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")) {
        const { data: userData, error: userError } = await supabase.auth.getUser(token);
        if (userError || !userData.user) {
          return new Response(JSON.stringify({ error: "Unauthorized" }), {
            status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }
    }

    const { data: expiredMessages } = await supabase
      .from("chat_messages_v2")
      .select("id, metadata")
      .not("metadata->attachment_urls", "is", null)
      .or("disappear_at.lt.now(),metadata->view_once_opened_at.not.is.null")
      .limit(500);

    // Step 2: Delete storage files for expired messages
    let filesDeleted = 0;
    if (expiredMessages && expiredMessages.length > 0) {
      const buckets = ["chat-media", "property-photos"];
      
      for (const msg of expiredMessages) {
        const meta = (msg.metadata || {}) as Record<string, any>;
        const urls: string[] = meta.attachment_urls || (meta.attachment_url ? [meta.attachment_url] : []);
        if (!urls.length) continue;

        for (const attachUrl of urls) {
          for (const bucket of buckets) {
            try {
              const url = new URL(attachUrl);
              const pathMatch = url.pathname.match(/\/object\/(?:sign|public)\/[^/]+\/(.+)/);
              if (pathMatch) {
                const filePath = decodeURIComponent(pathMatch[1].split("?")[0]);
                const { error } = await supabase.storage.from(bucket).remove([filePath]);
                if (!error) {
                  filesDeleted++;
                  break;
                }
              }
            } catch {
            }
          }
        }
      }
    }

    // Step 3: Call the RPC to delete expired message rows
    const { data: deletedCount, error: rpcError } = await supabase.rpc("cleanup_expired_messages");
    if (rpcError) {
      console.error("[cleanup-expired-media] RPC error:", rpcError);
    }

    // Step 4: Clean up used nonces older than 24h
    const { data: noncesDeleted } = await supabase.rpc("cleanup_expired_nonces");

    // Step 5: Audit
    await supabase.from("audit_logs").insert({
      action: "media_cleanup_completed",
      metadata_json: {
        messages_deleted: deletedCount || 0,
        files_deleted: filesDeleted,
        nonces_deleted: noncesDeleted || 0,
        ran_at: new Date().toISOString(),
      },
    });

    return new Response(JSON.stringify({
      success: true,
      messages_deleted: deletedCount || 0,
      files_deleted: filesDeleted,
      nonces_deleted: noncesDeleted || 0,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[cleanup-expired-media] Error:", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
