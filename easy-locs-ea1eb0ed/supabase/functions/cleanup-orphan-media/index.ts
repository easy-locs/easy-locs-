import { requireRouterOrigin } from "../_shared/edge-function-consolidation.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { requireServiceRole } from "../_shared/edge-auth.ts";
import { checkServerRateLimit, rateLimitResponse } from "../_shared/server-rate-limiter.ts";
import { rejectQuerySecrets } from "../_shared/reject-query-secrets.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-trace-id, x-span-id, x-parent-span-id, x-request-id, traceparent",
};

interface OrphanRow {
  id: string;
  bucket: string;
  path: string;
  created_at: string;
}

const SAFE_ENTITY_TYPES = new Set(["storefront", "listing", "property", "profile", "product"]);

Deno.serve(async (req) => {
  const __qsCheck = rejectQuerySecrets(req); if (__qsCheck.rejected) return __qsCheck.response!;
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const routerCheck = requireRouterOrigin(req);
  if (!routerCheck.allowed) return routerCheck.response!;
  const authCheck = requireServiceRole(req);
  if (!authCheck.authorized) return authCheck.response!;

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const rlResult = await checkServerRateLimit(req, "cleanup-orphan-media");
    if (!rlResult.allowed) return rateLimitResponse(rlResult);

    const { data: orphans, error: findError } = await supabase.rpc("find_orphan_media", {
      p_limit: 100,
    });

    if (findError) {
      console.error("[cleanup-orphan-media] find error:", findError);
      return new Response(
        JSON.stringify({ error: findError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const orphanRows = (orphans ?? []) as OrphanRow[];
    let filesDeleted = 0;
    let recordsDeleted = 0;
    const errors: string[] = [];

    for (const orphan of orphanRows) {
      const { error: storageError } = await supabase.storage
        .from(orphan.bucket)
        .remove([orphan.path]);

      if (storageError) {
        errors.push(`${orphan.bucket}/${orphan.path}: ${storageError.message}`);
        continue;
      }

      filesDeleted++;

      const { error: deleteError } = await supabase
        .from("media_assets")
        .delete()
        .eq("id", orphan.id);

      if (!deleteError) {
        recordsDeleted++;
      }
    }

    await supabase.from("audit_logs").insert({
      action: "orphan_media_cleanup",
      metadata_json: {
        orphans_found: orphanRows.length,
        files_deleted: filesDeleted,
        records_deleted: recordsDeleted,
        errors: errors.length > 0 ? errors.slice(0, 10) : undefined,
        ran_at: new Date().toISOString(),
      },
    });

    return new Response(
      JSON.stringify({
        success: true,
        orphans_found: orphanRows.length,
        files_deleted: filesDeleted,
        records_deleted: recordsDeleted,
        errors: errors.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[cleanup-orphan-media] Error:", msg);
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
