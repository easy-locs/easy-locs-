import { requireRouterOrigin } from "../_shared/edge-function-consolidation.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { rejectQuerySecrets } from "../_shared/reject-query-secrets.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version, x-trace-id, x-span-id, x-parent-span-id, x-request-id, traceparent",
};

Deno.serve(async (req) => {
  const __qsCheck = rejectQuerySecrets(req); if (__qsCheck.rejected) return __qsCheck.response!;
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const routerCheck = requireRouterOrigin(req);
  if (!routerCheck.allowed) return routerCheck.response!;
  try {
    console.log("[uae-data-cleanup] Starting...");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !supabaseKey) {
      console.error("[uae-data-cleanup] Missing env vars");
      return new Response(JSON.stringify({ success: false, error: "Missing env" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sb = createClient(supabaseUrl, supabaseKey);

    let body: Record<string, unknown> = {};
    try { body = await req.json(); } catch { /* empty body ok */ }
    const action = (body.action as string) || "report";
    const limit = (body.limit as number) || 500;

    console.log(`[uae-data-cleanup] action=${action}, limit=${limit}`);

    const { data: shops, error } = await sb
      .from("storefront_pages")
      .select("id, name, slug, city, country, vertical, subcategory, visibility_mode, route_status, display_priority, audit_score, readiness_status, banner_url, logo_url, cover_auto_url, cover_owner_url, source_type, source_confidence, is_claimed, has_photo, has_menu, products_count, rating, reviews_count, blocking_reason")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("[uae-data-cleanup] Query error:", error.message);
      throw error;
    }

    console.log(`[uae-data-cleanup] Fetched ${shops?.length || 0} shops`);

    const report = {
      total: shops?.length || 0,
      duplicatesFound: 0,
      duplicatesHidden: 0,
      taxonomyCorrected: 0,
      visibilityCorrected: 0,
      routeStatusFixed: 0,
      coverRepaired: 0,
      priorityRecalculated: 0,
      hiddenBroken: 0,
      errors: [] as string[],
    };

    if (!shops?.length) {
      return new Response(JSON.stringify({ success: true, action, report }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // STEP 1: Deduplication (name+city)
    const nameCity = new Map<string, typeof shops>();
    for (const s of shops) {
      const key = `${(s.name || "").toLowerCase().trim()}__${(s.city || "").toLowerCase().trim()}`;
      if (!nameCity.has(key)) nameCity.set(key, []);
      nameCity.get(key)!.push(s);
    }

    for (const [, group] of nameCity) {
      if (group.length <= 1) continue;
      report.duplicatesFound += group.length - 1;
      group.sort((a: any, b: any) => {
        if (a.is_claimed !== b.is_claimed) return a.is_claimed ? -1 : 1;
        return (b.audit_score || 0) - (a.audit_score || 0);
      });
      for (let i = 1; i < group.length; i++) {
        if (action === "run") {
          console.log(`[uae-data-cleanup] storefront_pages dropped in domain schema migration; skipping duplicate-hide for ${group[i].id}`);
        }
        report.duplicatesHidden++;
      }
    }

    // STEP 2: Per-shop checks
    const VALID_VERTICALS = ["food", "grocery", "shops", "services", "property", "healthcare", "mobility", "experiences"];
    const VALID_VISIBILITY = ["live", "ready", "coming_soon", "search_only", "map_only", "hidden"];

    for (const shop of shops) {
      const updates: Record<string, unknown> = {};

      if (shop.vertical && !VALID_VERTICALS.includes(shop.vertical)) {
        updates.vertical = "services";
        report.taxonomyCorrected++;
      }

      if (!shop.visibility_mode || !VALID_VISIBILITY.includes(shop.visibility_mode)) {
        updates.visibility_mode = "coming_soon";
        report.visibilityCorrected++;
      }

      if (!shop.route_status) {
        updates.route_status = shop.slug ? "valid" : "broken";
        report.routeStatusFixed++;
      }
      if (!shop.slug && shop.route_status !== "broken") {
        updates.route_status = "broken";
        report.routeStatusFixed++;
      }

      if (!shop.banner_url && !shop.cover_auto_url && !shop.cover_owner_url) {
        report.coverRepaired++;
      }

      let priority = 0;
      if (shop.is_claimed) priority += 30;
      if (shop.has_photo) priority += 15;
      if (shop.has_menu) priority += 15;
      if ((shop.rating || 0) >= 4) priority += 10;
      if ((shop.audit_score || 0) >= 70) priority += 20;
      if ((shop.products_count || 0) > 0) priority += 10;
      if (priority !== (shop.display_priority || 0)) {
        updates.display_priority = priority;
        report.priorityRecalculated++;
      }

      if (shop.route_status === "broken" && shop.visibility_mode !== "hidden") {
        updates.visibility_mode = "hidden";
        updates.blocking_reason = "broken_route";
        report.hiddenBroken++;
      }

      if (action === "run" && Object.keys(updates).length > 0) {
        console.log(`[uae-data-cleanup] storefront_pages dropped in domain schema migration; skipping update for ${shop.id}:`, updates);
      }
    }

    console.log(`[uae-data-cleanup] Report:`, JSON.stringify(report));

    return new Response(JSON.stringify({ success: true, action, report }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[uae-data-cleanup] Fatal:", msg);
    return new Response(JSON.stringify({ success: false, error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
