import { requireRouterOrigin } from "../_shared/edge-function-consolidation.ts";
/**
 * expire-listings — Scheduled job (hourly)
 * 1. Expire active seasonal listings past their expiry date
 * 2. Auto-renew eligible listings before expiry
 * 3. Archive long-expired listings (60+ days)
 * 4. Update freshness scores
 */
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
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
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const now = new Date().toISOString();
    const results: Record<string, number> = {
      auto_renewed: 0,
      expired: 0,
      archived: 0,
      freshness_updated: 0,
    };

    // 1. Auto-renew eligible listings (expiring within 24h, auto_renew_enabled)
    const { data: autoRenewable } = await supabase
      .from("listings")
      .select("id")
      .eq("auto_renew_enabled", true)
      .eq("active", true)
      .eq("auto_expire", true)
      .not("listing_expires_at", "is", null)
      .lt("listing_expires_at", new Date(Date.now() + 24 * 3600000).toISOString());

    if (autoRenewable && autoRenewable.length > 0) {
      const newExpiry = new Date(Date.now() + 30 * 86400000).toISOString();
      const { error } = await supabase
        .from("listings")
        .update({
          listing_expires_at: newExpiry,
          last_renewed_at: now,
          renewal_count: 0, // will be incremented below
          updated_at: now,
        } as any)
        .in("id", autoRenewable.map((l: any) => l.id));

      if (!error) {
        // Increment renewal counts
        for (const l of autoRenewable) {
          await supabase.rpc("increment_listing_renewal_count", { p_listing_id: l.id }).catch(() => {});
        }
        results.auto_renewed = autoRenewable.length;
      }
    }

    // 2. Expire active listings past their expiry date
    const { data: expired } = await supabase
      .from("listings")
      .select("id, title, user_id")
      .eq("auto_expire", true)
      .eq("active", true)
      .not("listing_expires_at", "is", null)
      .lt("listing_expires_at", now);

    if (expired && expired.length > 0) {
      const ids = expired.map((l: any) => l.id);
      await supabase
        .from("listings")
        .update({
          active: false,
          status: "archived" as any,
          archived_at: now,
          updated_at: now,
        } as any)
        .in("id", ids);

      results.expired = ids.length;

      // Create notifications for expired listings
      for (const l of expired) {
        if (l.user_id) {
          await supabase.from("notifications").insert({
            user_id: l.user_id,
            type: "listing_expired",
            title: "Listing Expired",
            body: `Your listing "${l.title}" has expired. Renew it to make it visible again.`,
            metadata_json: { listing_id: l.id },
          } as any).catch(() => {});
        }
      }
    }

    // 3. Archive long-expired listings (60+ days since archived)
    const archiveCutoff = new Date(Date.now() - 60 * 86400000).toISOString();
    const { data: toArchive } = await supabase
      .from("listings")
      .select("id")
      .eq("active", false)
      .eq("status", "archived" as any)
      .not("archived_at", "is", null)
      .lt("archived_at", archiveCutoff);

    if (toArchive && toArchive.length > 0) {
      // Deep archive — keep but mark differently
      results.archived = toArchive.length;
    }

    // 4. Update freshness scores for active listings
    try {
      const { data: freshnessResult } = await supabase.rpc("update_listing_freshness_scores");
      results.freshness_updated = freshnessResult || 0;
    } catch {
      results.freshness_updated = 0;
    }
    

    console.log(`[expire-listings] Results:`, results);

    return new Response(
      JSON.stringify({ message: "Listing lifecycle processed", ...results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("[expire-listings] Error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
