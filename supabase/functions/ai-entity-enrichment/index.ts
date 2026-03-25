import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
  const db = createClient(supabaseUrl, supabaseKey);

  try {
    const body = await req.json().catch(() => ({}));
    const { action, entityId, limit = 10 } = body;

    if (action === "enrich_description") {
      if (!lovableApiKey) throw new Error("LOVABLE_API_KEY not configured");

      const { data: entity } = await db
        .from("seed_merchants")
        .select("id, name, category, subcategory, city, country, vertical")
        .eq("id", entityId)
        .single();

      if (!entity) throw new Error("Entity not found");

      const prompt = `Generate a compelling 2-sentence business description for: "${entity.name}", a ${entity.subcategory ?? entity.category} ${entity.vertical ?? "food"} business in ${entity.city}, ${entity.country}. Be factual and professional. No emojis.`;

      const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${lovableApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash-lite",
          messages: [
            { role: "system", content: "You generate concise, professional business descriptions. Reply with ONLY the description, nothing else." },
            { role: "user", content: prompt },
          ],
        }),
      });

      if (!aiResp.ok) {
        const errText = await aiResp.text();
        throw new Error(`AI gateway error [${aiResp.status}]: ${errText}`);
      }

      const aiData = await aiResp.json();
      const description = aiData.choices?.[0]?.message?.content?.trim();

      if (description) {
        await db.from("seed_merchants")
          .update({ description })
          .eq("id", entityId);
      }

      return new Response(JSON.stringify({ success: true, description }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "classify_batch") {
      if (!lovableApiKey) throw new Error("LOVABLE_API_KEY not configured");

      const { data: entities } = await db
        .from("seed_merchants")
        .select("id, name, description, category, vertical")
        .or("subcategory.is.null,subcategory.eq.general,subcategory.eq.other")
        .eq("is_active", true)
        .limit(limit);

      if (!entities?.length) {
        return new Response(JSON.stringify({ success: true, classified: 0 }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const prompt = `Classify each business into a precise subcategory. Return a JSON array of objects with "id" and "subcategory" fields.

Businesses:
${entities.map((e: any) => `- id: ${e.id}, name: "${e.name}", category: ${e.category}, vertical: ${e.vertical}`).join("\n")}

Valid subcategories for food: pizza, burger, sushi, bakery, cafe, indian, chinese, mexican, thai, lebanese, italian, seafood, arabic, steakhouse, fast_food, healthy, ice_cream, juice_bar, desserts, breakfast
Valid subcategories for hotel: hotel, resort, hostel, serviced_apartment, boutique_hotel, villa, guesthouse
Valid subcategories for services: salon, spa, plumber, electrician, clinic, legal, cleaning, fitness, automotive`;

      const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${lovableApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash-lite",
          messages: [
            { role: "system", content: "You classify businesses. Return ONLY valid JSON array." },
            { role: "user", content: prompt },
          ],
          tools: [{
            type: "function",
            function: {
              name: "classify_businesses",
              description: "Classify businesses into subcategories",
              parameters: {
                type: "object",
                properties: {
                  classifications: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        id: { type: "string" },
                        subcategory: { type: "string" },
                      },
                      required: ["id", "subcategory"],
                    },
                  },
                },
                required: ["classifications"],
              },
            },
          }],
          tool_choice: { type: "function", function: { name: "classify_businesses" } },
        }),
      });

      if (!aiResp.ok) {
        const errText = await aiResp.text();
        throw new Error(`AI gateway error [${aiResp.status}]: ${errText}`);
      }

      const aiData = await aiResp.json();
      const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
      let classifications: any[] = [];

      if (toolCall?.function?.arguments) {
        try {
          const parsed = JSON.parse(toolCall.function.arguments);
          classifications = parsed.classifications ?? [];
        } catch {}
      }

      let classified = 0;
      for (const c of classifications) {
        if (c.id && c.subcategory) {
          await db.from("seed_merchants")
            .update({ subcategory: c.subcategory })
            .eq("id", c.id);
          classified++;
        }
      }

      return new Response(JSON.stringify({ success: true, classified }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[ai-entity-enrichment]", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
