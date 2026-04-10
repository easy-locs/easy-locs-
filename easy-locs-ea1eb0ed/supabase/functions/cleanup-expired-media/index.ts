/**
 * cleanup-expired-media — Scheduled edge function to delete expired message attachments.
 * 
 * Runs periodically (cron or manual) to:
 * 1. Call cleanup_expired_messages() RPC to delete expired rows
 * 2. Remove associated storage files for view-once and disappearing messages
 * 3. Log cleanup results to audit_logs
 */
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
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

    // Step 1: Find expired messages with attachments BEFORE deleting them
    const { data: expiredMessages } = await supabase
      .from("messages")
      .select("id, attachment_url, org_id")
      .not("attachment_url", "is", null)
      .or("disappear_at.lt.now(),view_once_opened_at.not.is.null")
      .limit(500);

    // Step 2: Delete storage files for expired messages
    let filesDeleted = 0;
    if (expiredMessages && expiredMessages.length > 0) {
      const buckets = ["chat-media", "property-photos"];
      
      for (const msg of expiredMessages) {
        if (!msg.attachment_url) continue;
        
        // Extract storage path from signed URL or direct path
        for (const bucket of buckets) {
          try {
            // Try to extract path from URL
            const url = new URL(msg.attachment_url);
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
            // URL parsing failed — skip
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
