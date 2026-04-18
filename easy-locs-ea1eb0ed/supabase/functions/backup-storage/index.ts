import { requireRouterOrigin } from "../_shared/edge-function-consolidation.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { requireServiceRole } from "../_shared/edge-auth.ts";
import { rejectQuerySecrets } from "../_shared/reject-query-secrets.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-trace-id, x-span-id, x-parent-span-id, x-request-id, traceparent",
};

const CONFIG_TABLES = [
  { name: "engine_supervisor", snapshot_type: "engine_config" },
  { name: "autonomy_system_status", snapshot_type: "autonomy_config" },
  { name: "categories", snapshot_type: "taxonomy" },
  { name: "verticals", snapshot_type: "taxonomy" },
  { name: "exchange_rates", snapshot_type: "finance_config" },
  { name: "country_configs", snapshot_type: "locale_config" },
  { name: "admin_alert_channels", snapshot_type: "alert_config" },
  { name: "rate_limits", snapshot_type: "security_config" },
];

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

  const startTime = Date.now();
  let bucketsProcessed = 0;
  let configsSnapshotted = 0;
  const errors: string[] = [];

  try {
    const { data: buckets, error: bucketErr } = await supabase.storage.listBuckets();

    if (bucketErr) {
      errors.push(`listBuckets: ${bucketErr.message}`);
    } else {
      for (const bucket of buckets ?? []) {
        try {
          const { data: files, error: listErr } = await supabase.storage
            .from(bucket.name)
            .list("", { limit: 1000 });

          if (listErr) {
            errors.push(`list ${bucket.name}: ${listErr.message}`);
            continue;
          }

          const fileList = (files ?? []).map((f) => ({
            name: f.name,
            size: (f.metadata as Record<string, unknown>)?.size ?? 0,
            created_at: f.created_at,
            updated_at: f.updated_at,
          }));

          const totalSize = fileList.reduce((s, f) => s + (Number(f.size) || 0), 0);

          await supabase.from("storage_backup_manifests").insert({
            bucket_name: bucket.name,
            file_count: fileList.length,
            total_size_bytes: totalSize,
            manifest_json: fileList,
            backup_status: "completed",
          });

          bucketsProcessed++;
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : String(e);
          errors.push(`bucket ${bucket.name}: ${msg}`);

          await supabase.from("storage_backup_manifests").insert({
            bucket_name: bucket.name,
            file_count: 0,
            total_size_bytes: 0,
            manifest_json: [],
            backup_status: "failed",
          });
        }
      }
    }

    for (const table of CONFIG_TABLES) {
      try {
        const { data, error } = await supabase
          .from(table.name)
          .select("*")
          .limit(1000);

        if (error) {
          errors.push(`config ${table.name}: ${error.message}`);
          continue;
        }

        await supabase.from("config_snapshots").insert({
          snapshot_type: table.snapshot_type,
          table_name: table.name,
          row_count: data?.length ?? 0,
          data_json: data ?? [],
        });

        configsSnapshotted++;
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        errors.push(`config ${table.name}: ${msg}`);
      }
    }

    await supabase.rpc("cleanup_old_config_snapshots").catch((e: unknown) => {
      console.error("[backup] cleanup_old_config_snapshots failed:", e);
    });

    const { data: oldManifests } = await supabase
      .from("storage_backup_manifests")
      .select("id")
      .lt("created_at", new Date(Date.now() - 30 * 86400000).toISOString());

    if (oldManifests && oldManifests.length > 0) {
      await supabase
        .from("storage_backup_manifests")
        .delete()
        .in("id", oldManifests.map((m) => m.id));
    }

    const success = errors.length === 0;

    await supabase.rpc("update_autonomy_status", {
      p_system_name: "storage_backup",
      p_status: success ? "green" : errors.length < bucketsProcessed + configsSnapshotted ? "yellow" : "red",
      p_error_message: errors.length > 0 ? errors[0] : null,
    }).catch((e: unknown) => {
      console.error("[backup] autonomy status update failed:", e);
    });

    if (!success) {
      await supabase.functions.invoke("alert-dispatcher", {
        body: {
          alert_type: "backup_failure",
          severity: "high",
          title: "Storage Backup Failed",
          message: `Backup completed with ${errors.length} errors: ${errors.slice(0, 3).join("; ")}`,
          source_system: "backup-storage",
        },
      }).catch((e: unknown) => {
        console.error("[backup] alert dispatch for backup failure failed:", e);
      });
    }

    return new Response(
      JSON.stringify({
        buckets_processed: bucketsProcessed,
        configs_snapshotted: configsSnapshotted,
        errors: errors.slice(0, 10),
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
