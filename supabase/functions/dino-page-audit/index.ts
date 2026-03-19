/**
 * dino-page-audit — Edge function that receives page audit beacons
 * and processes them (quality scoring, issue creation, job enqueuing).
 */
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const body = await req.json();
    const { actorType, actorId, country, language, audit } = body;

    if (!audit?.route) {
      return new Response(JSON.stringify({ error: "Missing audit.route" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Persist audit
    await supabase.from("dino_page_audits").insert({
      route: audit.route,
      page_key: audit.pageKey ?? null,
      actor_type: actorType ?? "anonymous",
      actor_id: actorId ?? null,
      country: country ?? null,
      language: language ?? null,
      audit_json: audit,
    });

    // Compute score
    let ui = 100, ux = 100, stability = 100, media = 100, i18n = 100;
    const category = 90;
    if (audit.hasOverflowX) ui -= 20;
    if (audit.overlapDetected) ui -= 25;
    if (audit.tinyTapTargets) ux -= 20;
    if (audit.missingBackButton) ux -= 10;
    if (audit.flickerDetected) stability -= 35;
    if (audit.imageShiftDetected) media -= 25;
    if (audit.dottedLabels?.length > 0) i18n -= 20;
    if (audit.untranslatedKeys?.length > 0) i18n -= 25;

    const total = Math.max(0, Math.round(
      ui * 0.2 + ux * 0.2 + stability * 0.25 + media * 0.15 + i18n * 0.15 + category * 0.05
    ));

    // Persist quality score
    await supabase.from("dino_quality_scores").insert({
      route: audit.route,
      entity_type: "route",
      entity_id: audit.route,
      ui_score: ui,
      ux_score: ux,
      stability_score: stability,
      media_score: media,
      i18n_score: i18n,
      category_score: category,
      total_score: total,
      score_details: audit,
      updated_at: new Date().toISOString(),
    });

    // Enqueue fix jobs
    if ((audit.dottedLabels?.length ?? 0) > 0 || (audit.untranslatedKeys?.length ?? 0) > 0) {
      await supabase.from("dino_sync_jobs").insert({
        job_type: "sanitize_labels",
        entity_type: "route",
        entity_id: audit.route,
        payload_json: {
          dottedLabels: audit.dottedLabels,
          untranslatedKeys: audit.untranslatedKeys,
        },
        priority: 10,
      });
    }

    // Log stability issues
    if (audit.flickerDetected) {
      await supabase.from("dino_issues").insert({
        severity: "major",
        issue_type: "stability",
        route: audit.route,
        summary: "Client-side flicker detected by page audit beacon",
        details_json: audit,
        auto_fixable: false,
        fixability: "patch_required",
        status: "open",
      });
    }

    console.log(`Page audit processed: ${audit.route} → score ${total}`);
    return new Response(JSON.stringify({ ok: true, score: { ui, ux, stability, media, i18n, category, total } }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Page audit error:", err);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
