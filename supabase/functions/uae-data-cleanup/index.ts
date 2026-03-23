/**
 * UAE Data Cleanup — Server-side batch pipeline.
 * Deduplication, taxonomy correction, visibility assignment, cover repair, audit scoring.
 * POST /uae-data-cleanup { action: "run" | "report", limit?: number }
 */
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sb = createClient(supabaseUrl, supabaseKey);

    const { action = "report", limit = 500 } = await req.json().catch(() => ({}));

    // Fetch all shops
    const { data: shops, error } = await sb
      .from("storefront_pages")
      .select("id, name, slug, city, country, vertical, subcategory, cluster, visibility_mode, route_status, display_priority, audit_score, readiness_status, banner_url, logo_url, cover_auto_url, cover_owner_url, source_type, source_confidence, latitude, longitude, address, is_claimed, has_photo, has_menu, products_count, rating, reviews_count")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) throw error;

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
      return new Response(JSON.stringify({ success: true, report }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── STEP 1: Deduplication (name+city) ──
    const nameCity = new Map<string, typeof shops>();
    for (const s of shops) {
      const key = `${(s.name || "").toLowerCase().trim()}__${(s.city || "").toLowerCase().trim()}`;
      if (!nameCity.has(key)) nameCity.set(key, []);
      nameCity.get(key)!.push(s);
    }

    for (const [, group] of nameCity) {
      if (group.length <= 1) continue;
      report.duplicatesFound += group.length - 1;
      // Keep best: claimed > highest audit_score > first
      group.sort((a, b) => {
        if (a.is_claimed !== b.is_claimed) return a.is_claimed ? -1 : 1;
        return (b.audit_score || 0) - (a.audit_score || 0);
      });
      for (let i = 1; i < group.length; i++) {
        if (action === "run") {
          await sb.from("storefront_pages").update({
            visibility_mode: "hidden",
            readiness_status: "draft",
            blocking_reason: "duplicate",
          }).eq("id", group[i].id);
        }
        report.duplicatesHidden++;
      }
    }

    // ── STEP 2: Taxonomy + Visibility + Priority per shop ──
    const VALID_VERTICALS = ["food", "grocery", "shops", "services", "property", "healthcare", "mobility", "experiences"];
    const VALID_VISIBILITY = ["live", "ready", "coming_soon", "search_only", "map_only", "hidden"];

    for (const shop of shops) {
      const updates: Record<string, unknown> = {};

      // Taxonomy check
      if (shop.vertical && !VALID_VERTICALS.includes(shop.vertical)) {
        updates.vertical = "services";
        report.taxonomyCorrected++;
      }

      // Visibility mode check
      if (!shop.visibility_mode || !VALID_VISIBILITY.includes(shop.visibility_mode)) {
        updates.visibility_mode = "coming_soon";
        report.visibilityCorrected++;
      }

      // Route status check
      if (!shop.route_status) {
        updates.route_status = shop.slug ? "valid" : "broken";
        report.routeStatusFixed++;
      }
      if (!shop.slug && shop.route_status !== "broken") {
        updates.route_status = "broken";
        report.routeStatusFixed++;
      }

      // Cover repair
      if (!shop.banner_url && !shop.cover_auto_url && !shop.cover_owner_url) {
        report.coverRepaired++;
      }

      // Recalculate display_priority
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

      // Hide broken shops
      if (shop.route_status === "broken" && shop.visibility_mode !== "hidden") {
        updates.visibility_mode = "hidden";
        updates.blocking_reason = "broken_route";
        report.hiddenBroken++;
      }

      if (action === "run" && Object.keys(updates).length > 0) {
        const { error: upErr } = await sb.from("storefront_pages").update(updates).eq("id", shop.id);
        if (upErr) report.errors.push(`${shop.id}: ${upErr.message}`);
      }
    }

    return new Response(JSON.stringify({ success: true, action, report }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ success: false, error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
