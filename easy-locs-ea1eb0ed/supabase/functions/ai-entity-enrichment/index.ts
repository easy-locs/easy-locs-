import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { openaiChat } from "../_shared/openai-client.ts";
import { aiModelRoute } from "../_shared/ai-model-router.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const db = createClient(supabaseUrl, supabaseKey);

  try {
    const body = await req.json().catch(() => ({}));
    const { action, entityId, limit = 10 } = body;

    if (action === "enrich_description") {

      const { data: entity } = await db
        .from("seed_merchants")
        .select("id, name, category, subcategory, city, country, vertical")
        .eq("id", entityId)
        .single();

      if (!entity) throw new Error("Entity not found");

      const prompt = `Generate a compelling 2-sentence business description for: "${entity.name}", a ${entity.subcategory ?? entity.category} ${entity.vertical ?? "food"} business in ${entity.city}, ${entity.country}. Be factual and professional. No emojis.`;

      const aiResult = await aiModelRoute({
        messages: [
          { role: "system", content: "You generate concise, professional business descriptions. Reply with ONLY the description, nothing else." },
          { role: "user", content: prompt },
        ],
      });

      if (!aiResult.response.ok) {
        const errText = await aiResult.response.text();
        throw new Error(`AI API error [${aiResult.response.status}]: ${errText}`);
      }

      const aiData = await aiResult.response.json();
      let description: string | undefined;
      if (aiResult.provider === "anthropic") {
        description = aiData.content?.find((b: { type: string; text?: string }) => b.type === "text")?.text?.trim();
      } else {
        description = aiData.choices?.[0]?.message?.content?.trim();
      }

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

      const aiResp = await openaiChat({
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
      });

      if (!aiResp.ok) {
        const errText = await aiResp.text();
        throw new Error(`OpenAI API error [${aiResp.status}]: ${errText}`);
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
