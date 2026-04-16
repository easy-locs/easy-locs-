import { requireRouterOrigin } from "../_shared/edge-function-consolidation.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { rejectQuerySecrets } from "../_shared/reject-query-secrets.ts";

Deno.serve(async (req) => {
  const __qsCheck = rejectQuerySecrets(req); if (__qsCheck.rejected) return __qsCheck.response!;
  const cors = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  const routerCheck = requireRouterOrigin(req);
  if (!routerCheck.allowed) return routerCheck.response!;
  try {
    const authHeader = req.headers.get("Authorization");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    if (!authHeader || authHeader.replace("Bearer ", "") !== serviceKey) {
      return new Response(JSON.stringify({ error: "Unauthorized — service_role only" }), {
        status: 401,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      serviceKey,
      { auth: { persistSession: false } },
    );

    const { data: pendingUsers, error: fetchError } = await supabase
      .from("profiles")
      .select("id, email")
      .eq("status", "pending_deletion")
      .lte("deletion_scheduled_for", new Date().toISOString())
      .limit(50);

    if (fetchError) {
      return new Response(JSON.stringify({ error: "Failed to fetch pending deletions", detail: fetchError.message }), {
        status: 500,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    if (!pendingUsers || pendingUsers.length === 0) {
      return new Response(JSON.stringify({ status: "no_pending_deletions", processed: 0 }), {
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const results: Array<{ user_id: string; status: string; error?: string }> = [];

    for (const user of pendingUsers) {
      const userId = user.id;
      try {
        const TABLES_TO_DELETE = [
          "app_notifications", "favorites", "reviews", "support_tickets",
          "user_notification_preferences", "user_push_tokens",
        ];
        for (const table of TABLES_TO_DELETE) {
          try {
            await supabase.from(table).delete().eq("user_id", userId);
          } catch (err) {
            console.warn(`[gdpr-processor] Skipped ${table} for ${userId}:`, err);
          }
        }

        const ownerAnon: Record<string, unknown> = {
          company_name: `deleted_user_${userId.slice(0, 8)}`,
          phone: null, address: null, siret: null,
        };
        await supabase.from("owner_profiles").update(ownerAnon).eq("user_id", userId);

        const bookingAnon: Record<string, unknown> = { notes: null, special_requests: null };
        await supabase.from("bookings").update(bookingAnon).eq("user_id", userId);

        const docAnon: Record<string, unknown> = { file_name: "deleted", description: null };
        await supabase.from("documents").update(docAnon).eq("user_id", userId);

        const STORAGE_BUCKETS = ["avatars", "rental-docs", "documents", "signatures"];
        for (const bucket of STORAGE_BUCKETS) {
          try {
            const { data: files } = await supabase.storage.from(bucket).list(userId);
            if (files && files.length > 0) {
              const paths = files.map((f: { name: string }) => `${userId}/${f.name}`);
              await supabase.storage.from(bucket).remove(paths);
            }
          } catch (err) {
            console.warn(`[gdpr-processor] Storage cleanup failed for ${bucket}/${userId}:`, err);
          }
        }

        const profileAnon: Record<string, unknown> = {
          status: "deleted",
          name: `deleted_user_${userId.slice(0, 8)}`,
          email: `deleted_${userId.slice(0, 8)}@anonymized.local`,
          phone: null, avatar_url: null, signature_url: null,
          bio: null, country: null, locale: null,
          deletion_completed_at: new Date().toISOString(),
        };
        await supabase.from("profiles").update(profileAnon).eq("id", userId);

        await supabase.from("audit_logs").insert({
          user_id: userId,
          action: "gdpr_account_deleted",
          metadata_json: {
            deleted_at: new Date().toISOString(),
            original_email: user.email,
            processor: "edge_function",
            gdpr_article: "Art. 17 — Right to erasure",
          },
        });

        const { error: authDeleteError } = await supabase.auth.admin.deleteUser(userId);
        if (authDeleteError) {
          console.warn(`[gdpr-processor] Auth deletion failed for ${userId}:`, authDeleteError);
        }

        results.push({ user_id: userId, status: "deleted" });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`[gdpr-processor] Failed to process ${userId}:`, msg);
        results.push({ user_id: userId, status: "failed", error: msg });
      }
    }

    return new Response(JSON.stringify({
      status: "completed",
      processed: results.length,
      results,
    }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "Deletion processor failed", detail: String(err) }),
      { status: 500, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } },
    );
  }
});
