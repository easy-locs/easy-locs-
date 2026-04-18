import { requireRouterOrigin } from "../_shared/edge-function-consolidation.ts";
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { dispatchAiCompletion } from "../_shared/execution/ai-dispatch.ts";
import { rejectQuerySecrets } from "../_shared/reject-query-secrets.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version, x-trace-id, x-span-id, x-parent-span-id, x-request-id, traceparent",
};

Deno.serve(async (req) => {
  const __qsCheck = rejectQuerySecrets(req); if (__qsCheck.rejected) return __qsCheck.response!;
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const routerCheck = requireRouterOrigin(req);
  if (!routerCheck.allowed) return routerCheck.response!;
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

      // LB1 Cleanup #842: migrated from aiRoute() to dispatchAiCompletion().
      // Provider selection is registry-driven via the ai.completion agent.
      const aiOutcome = await dispatchAiCompletion(
        {
          feature: "ai-entity-enrichment.enrich_description",
          messages: [
            { role: "system", content: "You generate concise, professional business descriptions. Reply with ONLY the description, nothing else." },
            { role: "user", content: prompt },
          ],
          purpose: "general",
        },
        { feature: "ai-entity-enrichment", correlationId: String(entityId ?? "") },
      );

      if (aiOutcome.status !== "succeeded" || !aiOutcome.output) {
        throw new Error(
          `AI dispatch ${aiOutcome.status}: ${aiOutcome.errorCode ?? aiOutcome.errorMessage ?? "unknown"}`,
        );
      }

      const description = aiOutcome.output.text?.trim();

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

      // Note (#842): the classify_businesses tool-call schema is now expressed
      // as a JSON contract in the prompt + responseFormat:"json". The model
      // returns the same shape that the OpenAI tool-call would have produced.
      const prompt = `Classify each business into a precise subcategory.

You MUST respond with ONLY a single JSON object (no prose, no code fences) of EXACTLY this shape:
{ "classifications": [ { "id": string, "subcategory": string }, ... ] }

Businesses:
${entities.map((e) => `- id: ${e.id}, name: "${e.name}", category: ${e.category}, vertical: ${e.vertical}`).join("\n")}

Valid subcategories for food: pizza, burger, sushi, bakery, cafe, indian, chinese, mexican, thai, lebanese, italian, seafood, arabic, steakhouse, fast_food, healthy, ice_cream, juice_bar, desserts, breakfast
Valid subcategories for hotel: hotel, resort, hostel, serviced_apartment, boutique_hotel, villa, guesthouse
Valid subcategories for services: salon, spa, plumber, electrician, clinic, legal, cleaning, fitness, automotive`;

      const aiOutcome = await dispatchAiCompletion(
        {
          feature: "ai-entity-enrichment.classify_batch",
          messages: [
            { role: "system", content: "You classify businesses. Return ONLY a JSON object matching the requested shape." },
            { role: "user", content: prompt },
          ],
          responseFormat: "json",
          purpose: "general",
          tools: [{ name: "classify_businesses", description: "Classify businesses into subcategories" }],
        },
        { feature: "ai-entity-enrichment" },
      );

      if (aiOutcome.status !== "succeeded" || !aiOutcome.output) {
        throw new Error(
          `AI dispatch ${aiOutcome.status}: ${aiOutcome.errorCode ?? aiOutcome.errorMessage ?? "unknown"}`,
        );
      }

      interface ClassificationResult { id: string; subcategory: string }
      let classifications: ClassificationResult[] = [];

      const maybe = aiOutcome.output.json;
      const parseAttempts: unknown[] = [maybe];
      if (maybe === undefined) {
        try { parseAttempts.push(JSON.parse(aiOutcome.output.text)); }
        catch (parseErr) {
          console.warn("[ai-entity-enrichment] Failed to parse AI response:", parseErr);
        }
      }
      for (const candidate of parseAttempts) {
        if (Array.isArray(candidate)) {
          classifications = candidate as ClassificationResult[];
          break;
        }
        if (candidate && typeof candidate === "object" && Array.isArray((candidate as { classifications?: unknown }).classifications)) {
          classifications = (candidate as { classifications: ClassificationResult[] }).classifications;
          break;
        }
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
