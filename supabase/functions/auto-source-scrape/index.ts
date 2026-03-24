import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ── Source configs per vertical ──
const SCRAPE_SOURCES: Record<string, { platform: string; searchTemplate: string; confidence: number }[]> = {
  food: [
    { platform: "deliveroo", searchTemplate: "site:deliveroo.ae {query} restaurant", confidence: 95 },
    { platform: "talabat", searchTemplate: "site:talabat.com {query} UAE restaurant", confidence: 90 },
    { platform: "careem", searchTemplate: "site:careem.com {query} food UAE", confidence: 90 },
  ],
  grocery: [
    { platform: "talabat", searchTemplate: "site:talabat.com {query} grocery UAE", confidence: 90 },
    { platform: "careem", searchTemplate: "site:careem.com {query} mart UAE", confidence: 85 },
  ],
  property: [
    { platform: "booking", searchTemplate: "site:booking.com {query} hotel UAE", confidence: 95 },
  ],
  services: [
    { platform: "google", searchTemplate: "{query} service Dubai UAE", confidence: 85 },
  ],
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const firecrawlKey = Deno.env.get("FIRECRAWL_API_KEY");
    const supabase = createClient(supabaseUrl, supabaseKey);

    if (!firecrawlKey) {
      return new Response(
        JSON.stringify({ success: false, error: "FIRECRAWL_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json().catch(() => ({}));
    const action = body.action ?? "enrich_existing";
    const limit = body.limit ?? 20;

    if (action === "enrich_existing") {
      // Find entities needing enrichment (low completeness or missing data)
      const { data: entities, error } = await supabase
        .from("seed_merchants")
        .select("id, name, category, subcategory, city, country, source_key, source_url, completeness_score, menu_items_json, phone, website, cover_image")
        .or("completeness_score.is.null,completeness_score.lt.60")
        .eq("country", "AE")
        .order("completeness_score", { ascending: true, nullsFirst: true })
        .limit(limit);

      if (error) throw error;
      if (!entities?.length) {
        return new Response(
          JSON.stringify({ success: true, enriched: 0, message: "No entities needing enrichment" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      let enriched = 0;
      let failed = 0;
      const results: any[] = [];

      for (const entity of entities) {
        try {
          const vertical = entity.category ?? "food";
          const sources = SCRAPE_SOURCES[vertical] ?? SCRAPE_SOURCES.food;
          const query = `${entity.name} ${entity.city ?? "Dubai"}`;

          let bestResult: any = null;
          let bestConfidence = 0;

          // Try each source
          for (const source of sources) {
            try {
              const searchQuery = source.searchTemplate.replace("{query}", query);

              const searchResp = await fetch("https://api.firecrawl.dev/v1/search", {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${firecrawlKey}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  query: searchQuery,
                  limit: 3,
                  scrapeOptions: { formats: ["markdown"] },
                }),
              });

              if (!searchResp.ok) {
                const errText = await searchResp.text();
                console.warn(`[auto-source] Search failed for ${source.platform}: ${errText}`);
                continue;
              }

              const searchData = await searchResp.json();
              const hits = searchData.data ?? [];

              if (hits.length > 0) {
                const hit = hits[0];
                const scraped = {
                  source_platform: source.platform,
                  source_url: hit.url,
                  source_confidence: source.confidence,
                  title: hit.title,
                  markdown: hit.markdown?.substring(0, 5000),
                  description: hit.description,
                };

                if (source.confidence > bestConfidence) {
                  bestConfidence = source.confidence;
                  bestResult = scraped;
                }
              }
            } catch (e) {
              console.warn(`[auto-source] Error scraping ${source.platform} for ${entity.name}:`, e);
            }
          }

          if (bestResult) {
            // Store raw scraped data
            await supabase.from("imported_shop_raw").upsert({
              id: crypto.randomUUID(),
              raw_name: entity.name,
              source: bestResult.source_platform,
              source_url: bestResult.source_url,
              raw_category: entity.subcategory ?? entity.category,
              city: entity.city ?? "Dubai",
              country: "AE",
              parsed_status: "scraped",
              metadata_json: {
                confidence: bestResult.source_confidence,
                markdown_preview: bestResult.markdown?.substring(0, 2000),
                description: bestResult.description,
                enriched_entity_id: entity.id,
                scraped_at: new Date().toISOString(),
              },
            });

            // Update freshness on entity
            await supabase
              .from("seed_merchants")
              .update({
                last_enrichment_attempt: new Date().toISOString(),
                enrichment_source: bestResult.source_platform,
                source_url: bestResult.source_url || entity.source_url,
              })
              .eq("id", entity.id);

            enriched++;
            results.push({
              entity_id: entity.id,
              name: entity.name,
              source: bestResult.source_platform,
              confidence: bestResult.source_confidence,
            });
          } else {
            failed++;
          }
        } catch (e) {
          console.error(`[auto-source] Error processing ${entity.name}:`, e);
          failed++;
        }
      }

      return new Response(
        JSON.stringify({ success: true, enriched, failed, total: entities.length, results }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "discover_new") {
      // Discover new entities from aggregator searches
      const city = body.city ?? "Dubai";
      const vertical = body.vertical ?? "food";
      const queries = body.queries ?? [`best ${vertical} restaurants ${city}`];

      let discovered = 0;
      const newEntities: any[] = [];

      for (const query of queries) {
        try {
          const searchResp = await fetch("https://api.firecrawl.dev/v1/search", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${firecrawlKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ query, limit: 10 }),
          });

          if (!searchResp.ok) continue;
          const searchData = await searchResp.json();

          for (const hit of searchData.data ?? []) {
            // Check if entity already exists
            const { data: existing } = await supabase
              .from("seed_merchants")
              .select("id")
              .ilike("name", `%${hit.title?.split(" - ")[0]?.trim() ?? ""}%`)
              .eq("country", "AE")
              .limit(1);

            if (!existing?.length && hit.title) {
              const rawName = hit.title.split(" - ")[0]?.split("|")[0]?.trim();
              if (rawName && rawName.length > 2) {
                await supabase.from("imported_shop_raw").insert({
                  id: crypto.randomUUID(),
                  raw_name: rawName,
                  source: "firecrawl_discovery",
                  source_url: hit.url,
                  raw_category: vertical,
                  city,
                  country: "AE",
                  parsed_status: "pending",
                  metadata_json: {
                    query,
                    description: hit.description,
                    discovered_at: new Date().toISOString(),
                  },
                });
                discovered++;
                newEntities.push({ name: rawName, url: hit.url });
              }
            }
          }
        } catch (e) {
          console.warn(`[auto-source] Discovery error for query "${query}":`, e);
        }
      }

      return new Response(
        JSON.stringify({ success: true, discovered, entities: newEntities }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: `Unknown action: ${action}` }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[auto-source] Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
