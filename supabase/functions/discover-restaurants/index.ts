/**
 * discover-restaurants — Auto-discovery edge function.
 * Accepts external source data (from scraping, API, CSV), normalizes it,
 * runs duplicate detection, and stages into merchant_onboarding_sources.
 * 
 * Does NOT scrape directly — receives pre-normalized or raw data from admin/cron.
 */
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const log = (step: string, d?: any) =>
  console.log(`[DISCOVER] ${step}${d ? ` — ${JSON.stringify(d)}` : ""}`);

interface SourceRecord {
  source_name: string; // e.g. "google_maps", "deliveroo", "talabat", "manual"
  source_entity_id: string;
  business_name: string;
  phone?: string;
  website?: string;
  category?: string;
  vertical?: string;
  address?: string;
  country?: string;
  city?: string;
  lat?: number;
  lng?: number;
  rating?: number;
  photos?: string[];
  menu_data?: any;
  raw_payload?: any;
}

/** Simple fuzzy name similarity (Jaccard on trigrams) */
function nameSimilarity(a: string, b: string): number {
  const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
  const trigrams = (s: string) => {
    const n = normalize(s);
    const set = new Set<string>();
    for (let i = 0; i <= n.length - 3; i++) set.add(n.slice(i, i + 3));
    return set;
  };
  const ta = trigrams(a);
  const tb = trigrams(b);
  if (ta.size === 0 && tb.size === 0) return 1;
  let intersection = 0;
  for (const t of ta) if (tb.has(t)) intersection++;
  return intersection / (ta.size + tb.size - intersection);
}

/** Geo distance in meters (Haversine) */
function geoDistanceM(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  try {
    const body = await req.json();
    const records: SourceRecord[] = body.records || [];
    const batchId = body.batchId || `batch_${Date.now().toString(36)}`;

    if (!records.length) throw new Error("No records provided");
    log("Processing batch", { batchId, count: records.length });

    const results = { staged: 0, duplicates: 0, errors: 0 };

    for (const rec of records) {
      try {
        // 1. Check source-level duplicate
        const { data: existingSrc } = await admin
          .from("merchant_onboarding_sources")
          .select("id")
          .eq("source_external_id", rec.source_entity_id)
          .eq("source_type", rec.source_name)
          .maybeSingle();

        if (existingSrc) {
          results.duplicates++;
          continue;
        }

        // 2. Check storefront-level duplicate (name + geo + phone)
        let duplicateScore = 0;
        let matchedId: string | null = null;

        if (rec.lat && rec.lng) {
          // Find nearby storefronts
          const { data: nearby } = await admin
            .from("storefront_pages")
            .select("id, name, contact_phone, latitude, longitude")
            .gte("latitude", rec.lat - 0.005)
            .lte("latitude", rec.lat + 0.005)
            .gte("longitude", rec.lng - 0.005)
            .lte("longitude", rec.lng + 0.005)
            .limit(20);

          for (const existing of nearby || []) {
            let score = 0;
            // Name similarity
            const ns = nameSimilarity(rec.business_name, existing.name || "");
            score += ns * 50;
            // Geo proximity
            if (existing.latitude && existing.longitude) {
              const dist = geoDistanceM(rec.lat, rec.lng, existing.latitude, existing.longitude);
              if (dist < 50) score += 30;
              else if (dist < 200) score += 15;
            }
            // Phone match
            if (rec.phone && existing.contact_phone) {
              const cleanA = rec.phone.replace(/\D/g, "").slice(-8);
              const cleanB = existing.contact_phone.replace(/\D/g, "").slice(-8);
              if (cleanA === cleanB && cleanA.length >= 7) score += 20;
            }

            if (score > duplicateScore) {
              duplicateScore = score;
              matchedId = existing.id;
            }
          }
        }

        const isDuplicate = duplicateScore >= 70;
        const needsReview = duplicateScore >= 40 && duplicateScore < 70;

        const status = isDuplicate ? "duplicate" : needsReview ? "needs_review" : "imported";

        // 3. Stage the record
        await admin.from("merchant_onboarding_sources").insert({
          source_type: rec.source_name,
          source_name: rec.source_name,
          source_external_id: rec.source_entity_id,
          status,
          payload: {
            normalized: {
              business_name: rec.business_name,
              phone: rec.phone,
              website: rec.website,
              category: rec.category,
              vertical: rec.vertical || "Food",
              address: rec.address,
              country: rec.country,
              city: rec.city,
              lat: rec.lat,
              lng: rec.lng,
              rating: rec.rating,
              photos: rec.photos,
              menu_data: rec.menu_data,
            },
            raw: rec.raw_payload,
            duplicate_score: duplicateScore,
            matched_entity_id: matchedId,
            batch_id: batchId,
          },
        });

        if (isDuplicate) {
          results.duplicates++;
        } else {
          results.staged++;
        }

        // 4. Auto-create draft if high confidence and not duplicate
        if (status === "imported" && duplicateScore < 30) {
          const slug = rec.business_name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-|-$/g, "")
            .slice(0, 50) + "-" + Date.now().toString(36);

          const { data: newShop } = await admin.from("storefront_pages").insert({
            name: rec.business_name,
            slug,
            entity_type: "fixed_store",
            city: rec.city || null,
            country: rec.country || null,
            latitude: rec.lat || null,
            longitude: rec.lng || null,
            contact_phone: rec.phone || null,
            description: rec.category ? `${rec.category}${rec.city ? ` in ${rec.city}` : ""}` : null,
            vertical: rec.vertical || "Food",
            subcategory: rec.category || null,
            active: false,
            shop_visibility: "draft",
            status: "onboarding_draft",
            rating: rec.rating || null,
          }).select("id").maybeSingle();

          if (newShop?.id) {
            // Auto-assign zone
            if (rec.lat && rec.lng) {
              const { data: zone } = await admin
                .from("zones")
                .select("id")
                .lte("lat_min", rec.lat).gte("lat_max", rec.lat)
                .lte("lng_min", rec.lng).gte("lng_max", rec.lng)
                .limit(1)
                .maybeSingle();

              if (zone?.id) {
                await admin.from("storefront_pages")
                  .update({ zone_id: zone.id })
                  .eq("id", newShop.id);
              }
            }

            log("Draft created", { id: newShop.id, name: rec.business_name });
          }
        }
      } catch (err) {
        log("Record error", { name: rec.business_name, error: (err as Error).message });
        results.errors++;
      }
    }

    log("Batch complete", results);

    return new Response(JSON.stringify({ success: true, batchId, ...results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    log("ERROR", { message: e.message });
    return new Response(
      JSON.stringify({ error: e.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 },
    );
  }
});
