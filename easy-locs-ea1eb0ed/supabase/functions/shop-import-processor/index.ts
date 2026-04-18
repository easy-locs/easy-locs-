import { requireRouterOrigin } from "../_shared/edge-function-consolidation.ts";
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { rejectQuerySecrets } from "../_shared/reject-query-secrets.ts";

import { cFromEdge, cRpcEdge } from "../_shared/execution/content-mutation.ts";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-trace-id, x-span-id, x-parent-span-id, x-request-id, traceparent",
};

Deno.serve(async (req) => {
  const __qsCheck = rejectQuerySecrets(req); if (__qsCheck.rejected) return __qsCheck.response!;
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const routerCheck = requireRouterOrigin(req);
  if (!routerCheck.allowed) return routerCheck.response!;
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await req.json().catch(() => ({}));
    const action = body.action ?? "process_pending";

    if (action === "process_pending") {
      // Fetch pending raw records
      const { data: pendingRaw, error: rawErr } = await supabase
        .from("imported_shop_raw")
        .select("*")
        .eq("parsed_status", "pending")
        .limit(100);

      if (rawErr) throw rawErr;
      if (!pendingRaw?.length) {
        return new Response(JSON.stringify({ processed: 0, message: "No pending records" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      let created = 0;
      let failed = 0;
      let dupes = 0;

      for (const raw of pendingRaw) {
        try {
          const name = (raw.raw_name ?? "").trim();
          if (!name) {
            await cFromEdge(supabase, "imported_shop_raw").update({ parsed_status: "skipped", error_message: "Empty name" }).eq("id", raw.id);
            continue;
          }

          // Simple dedup by phone
          if (raw.raw_phone) {
            const { data: existing } = await cFromEdge(supabase, "onboarding_shop_candidates")
              .select("id")
              .eq("phone", raw.raw_phone.replace(/[^\d+]/g, ""))
              .limit(1);
            if (existing?.length) {
              await cFromEdge(supabase, "imported_shop_raw").update({ parsed_status: "duplicate" }).eq("id", raw.id);
              dupes++;
              continue;
            }
          }

          // Map taxonomy
          const cat = (raw.raw_subcategory ?? raw.raw_category ?? "food").toLowerCase().trim().replace(/[\s-]+/g, "_");
          const SIMPLE_MAP: Record<string, string> = {
            restaurant: "food", cafe: "food", bakery: "food", pizza: "food",
            pharmacy: "healthcare", hotel: "property", salon: "services",
            supermarket: "grocery", grocery: "grocery", electronics: "shops",
          };
          const vertical = SIMPLE_MAP[cat] ?? "food";

          const slug = [name, raw.raw_area ?? "", raw.raw_city ?? "Dubai"]
            .filter(Boolean)
            .join("-")
            .toLowerCase()
            .replace(/[^a-z0-9-]/g, "-")
            .replace(/-+/g, "-")
            .slice(0, 80);

          // Quality score
          let qs = 0;
          if (name.length > 2) qs += 20;
          if (raw.raw_phone) qs += 15;
          if (raw.raw_lat && raw.raw_lng) qs += 20;
          if (raw.raw_rating) qs += 10;
          if (raw.raw_reviews_count) qs += 10;
          if (raw.raw_address) qs += 10;
          if (cat) qs += 10;

          const candidateStatus = qs >= 60 ? "approved" : qs >= 30 ? "review" : "low_quality";

          const { data: cand, error: candErr } = await cFromEdge(supabase, "onboarding_shop_candidates")
            .insert({
              batch_id: raw.batch_id,
              raw_id: raw.id,
              source_type: raw.source_type,
              source_external_id: raw.source_external_id,
              canonical_name: name,
              canonical_slug: slug,
              canonical_vertical: vertical,
              canonical_subcategory: cat || null,
              country: raw.raw_country ?? "AE",
              city: raw.raw_city ?? "Dubai",
              zone: raw.raw_area,
              address: raw.raw_address,
              latitude: raw.raw_lat,
              longitude: raw.raw_lng,
              phone: raw.raw_phone ? raw.raw_phone.replace(/[^\d+]/g, "") : null,
              website: raw.raw_website,
              rating: raw.raw_rating,
              reviews_count: raw.raw_reviews_count ?? 0,
              quality_score: qs,
              candidate_status: candidateStatus,
            })
            .select("id")
            .single();

          if (candErr) {
            await cFromEdge(supabase, "imported_shop_raw").update({ parsed_status: "failed", error_message: candErr.message }).eq("id", raw.id);
            failed++;
            continue;
          }

          // Create onboarding state
          await cFromEdge(supabase, "merchant_onboarding_state").insert({
            entity_id: cand.id,
            onboarding_mode: "imported_draft",
            import_source: raw.source_type,
            contact_status: "not_contacted",
            activation_status: "inactive",
            visibility_status: qs >= 70 ? "indexed_not_public" : "hidden_imported",
            taxonomy_status: cat ? "mapped" : "pending",
            geo_status: raw.raw_lat && raw.raw_lng ? "resolved" : "pending",
            menu_status: raw.raw_menu_json ? "imported" : "empty",
          });

          // Handle images
          if (raw.raw_images && Array.isArray(raw.raw_images)) {
            const assets = raw.raw_images.map((url: string, i: number) => ({
              candidate_id: cand.id,
              asset_type: i === 0 ? "cover" : "gallery",
              asset_url: url,
              asset_source: raw.source_type,
              is_primary: i === 0,
            }));
            await cFromEdge(supabase, "imported_shop_assets").insert(assets);
          }

          await cFromEdge(supabase, "imported_shop_raw").update({ parsed_status: "processed" }).eq("id", raw.id);
          created++;
        } catch (e) {
          await cFromEdge(supabase, "imported_shop_raw").update({
            parsed_status: "failed",
            error_message: e instanceof Error ? e.message : "Unknown",
          }).eq("id", raw.id);
          failed++;
        }
      }

      // Update batch counters
      const batchIds = [...new Set(pendingRaw.map((r: any) => r.batch_id))];
      for (const bid of batchIds) {
        const { data: batchCands } = await cFromEdge(supabase, "onboarding_shop_candidates")
          .select("id", { head: true, count: "exact" })
          .eq("batch_id", bid);
        await cFromEdge(supabase, "import_batches").update({
          total_created: batchCands?.length ?? created,
          total_duplicates: dupes,
          total_failed: failed,
        }).eq("id", bid);
      }

      return new Response(JSON.stringify({ processed: pendingRaw.length, created, dupes, failed }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
