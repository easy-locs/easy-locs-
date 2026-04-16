import { requireRouterOrigin } from "../_shared/edge-function-consolidation.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { zipSync, strToU8 } from "npm:fflate@0.8.2";
import { rejectQuerySecrets } from "../_shared/reject-query-secrets.ts";

Deno.serve(async (req) => {
  const __qsCheck = rejectQuerySecrets(req); if (__qsCheck.rejected) return __qsCheck.response!;
  const cors = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  const routerCheck = requireRouterOrigin(req);
  if (!routerCheck.allowed) return routerCheck.response!;
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } },
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const anonClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    );
    const { data: { user } } = await anonClient.auth.getUser(authHeader.replace("Bearer ", ""));
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const userId = user.id;

    const TABLES_USER_ID = [
      "profiles", "wallet_transactions", "documents", "leases", "tenants",
      "properties", "app_notifications", "audit_logs", "bookings",
      "favorites", "reviews", "support_tickets",
      "providers", "kyc_documents", "bookings_v2",
      "webauthn_credentials", "phone_otp_sessions",
    ];

    const TABLES_OWNER = ["owner_profiles", "orgs"];

    const exportData: Record<string, unknown[]> = {};
    const skippedTables: string[] = [];

    for (const table of TABLES_USER_ID) {
      try {
        const { data, error } = await supabase
          .from(table)
          .select("*")
          .or(`user_id.eq.${userId},owner_user_id.eq.${userId},id.eq.${userId}`)
          .limit(5000);
        if (error) {
          console.warn(`[gdpr-export] Error querying ${table}:`, error.message);
          skippedTables.push(table);
        } else if (data && data.length > 0) {
          exportData[table] = data;
        }
      } catch (err) {
        console.warn(`[gdpr-export] Skipped table ${table}:`, err);
        skippedTables.push(table);
      }
    }

    for (const table of TABLES_OWNER) {
      try {
        const { data, error } = await supabase
          .from(table)
          .select("*")
          .or(`user_id.eq.${userId},id.eq.${userId}`)
          .limit(1000);
        if (error) {
          console.warn(`[gdpr-export] Error querying ${table}:`, error.message);
          skippedTables.push(table);
        } else if (data && data.length > 0) {
          exportData[table] = data;
        }
      } catch (err) {
        console.warn(`[gdpr-export] Skipped table ${table}:`, err);
        skippedTables.push(table);
      }
    }

    try {
      const { data: msgs } = await supabase
        .from("orbit_messages")
        .select("id, conversation_id, sender_id, content_type, created_at")
        .eq("sender_id", userId)
        .limit(5000);
      if (msgs && msgs.length > 0) exportData["orbit_messages_metadata"] = msgs;
    } catch (err) {
      console.warn("[gdpr-export] Skipped orbit_messages:", err);
    }

    try {
      const { data: convos } = await supabase
        .from("orbit_conversations")
        .select("id, type, created_at, updated_at")
        .contains("participant_ids", [userId])
        .limit(1000);
      if (convos && convos.length > 0) exportData["orbit_conversations"] = convos;
    } catch (err) {
      console.warn("[gdpr-export] Skipped orbit_conversations:", err);
    }

    try {
      const { data: payments } = await supabase
        .from("payment_transactions")
        .select("*")
        .or(`user_id.eq.${userId},payer_id.eq.${userId}`)
        .limit(5000);
      if (payments && payments.length > 0) exportData["payment_transactions"] = payments;
    } catch (err) {
      console.warn("[gdpr-export] Skipped payment_transactions:", err);
    }

    try {
      const { data: auditTrail } = await supabase
        .from("financial_audit_trail")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(10000);
      if (auditTrail && auditTrail.length > 0) exportData["financial_audit_trail"] = auditTrail;
    } catch (err) {
      console.warn("[gdpr-export] Skipped financial_audit_trail:", err);
    }

    try {
      const { data: consentLog } = await supabase
        .from("cookie_consent_log")
        .select("*")
        .eq("user_id", userId)
        .order("consented_at", { ascending: false })
        .limit(1000);
      if (consentLog && consentLog.length > 0) exportData["cookie_consent_log"] = consentLog;
    } catch (err) {
      console.warn("[gdpr-export] Skipped cookie_consent_log:", err);
    }

    const zipFiles: Record<string, Uint8Array> = {};

    zipFiles["data/personal_data.json"] = strToU8(JSON.stringify(exportData, null, 2));

    for (const [table, rows] of Object.entries(exportData)) {
      if (rows.length === 0) continue;
      const keys = Object.keys(rows[0] as Record<string, unknown>);
      const csvHeader = keys.map(k => `"${k}"`).join(",");
      const csvRows = rows.map((row: unknown) => {
        const r = row as Record<string, unknown>;
        return keys.map(k => `"${String(r[k] ?? "").replace(/"/g, '""')}"`).join(",");
      });
      zipFiles[`data/${table}.csv`] = strToU8([csvHeader, ...csvRows].join("\n"));
    }

    const storageFileEntries: Array<{ bucket: string; path: string; size?: number }> = [];
    for (const bucket of ["avatars", "rental-docs", "documents", "signatures"]) {
      try {
        const { data: files } = await supabase.storage.from(bucket).list(userId);
        if (files && files.length > 0) {
          for (const f of files) {
            const filePath = `${userId}/${f.name}`;
            const meta = f.metadata as Record<string, unknown> | null;
            storageFileEntries.push({
              bucket,
              path: filePath,
              size: typeof meta?.size === "number" ? meta.size : undefined,
            });

            try {
              const { data: fileData } = await supabase.storage
                .from(bucket)
                .download(filePath);
              if (fileData) {
                const arrayBuffer = await fileData.arrayBuffer();
                zipFiles[`files/${bucket}/${f.name}`] = new Uint8Array(arrayBuffer);
              }
            } catch (err) {
              console.warn(`[gdpr-export] Failed to download ${bucket}/${filePath}:`, err);
            }
          }
        }
      } catch (err) {
        console.warn(`[gdpr-export] Skipped storage bucket ${bucket}:`, err);
      }
    }

    if (storageFileEntries.length > 0) {
      zipFiles["data/storage_manifest.json"] = strToU8(JSON.stringify(storageFileEntries, null, 2));
    }

    const exportMetadata = {
      exported_at: new Date().toISOString(),
      user_id: userId,
      email: user.email,
      gdpr_article: "Art. 20 — Right to data portability",
      tables_exported: Object.keys(exportData),
      tables_skipped: skippedTables,
      storage_files_included: storageFileEntries.length,
      format: "ZIP archive containing JSON + CSV data files and user-uploaded files",
      completeness: skippedTables.length === 0 ? "complete" : "partial",
    };
    zipFiles["README.json"] = strToU8(JSON.stringify(exportMetadata, null, 2));

    const zipped = zipSync(zipFiles, { level: 6 });

    await supabase.from("audit_logs").insert({
      user_id: userId,
      action: "gdpr_data_export",
      metadata_json: {
        exported_at: new Date().toISOString(),
        tables: Object.keys(exportData),
        storage_files: storageFileEntries.length,
        format: "zip",
      },
    });

    return new Response(zipped, {
      headers: {
        ...cors,
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="easylocs-gdpr-export-${new Date().toISOString().slice(0, 10)}.zip"`,
      },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "Export failed", detail: String(err) }),
      { status: 500, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } },
    );
  }
});
