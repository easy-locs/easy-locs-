import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // ── Auth + org membership check ──
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user }, error: userErr } = await supabase.auth.getUser();
    if (userErr || !user?.id) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = user.id;
    const { data: membership } = await supabase
      .from("org_members").select("id").eq("user_id", userId).limit(1).maybeSingle();
    if (!membership) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { type, context, locale } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const langMap: Record<string, string> = {
      fr: "en français", en: "in English", es: "en español", de: "auf Deutsch",
      it: "in italiano", pt: "em português", nl: "in het Nederlands", ar: "بالعربية",
      ja: "日本語で", ko: "한국어로", zh: "用中文", tr: "Türkçe",
    };
    const langInstruction = langMap[locale || "en"] || "in English";

    let prompt = "";

    if (type === "listing") {
      prompt = `You are an expert SEO copywriter for vacation rental listings.
Generate optimized SEO metadata ${langInstruction} for this property listing.

Property details:
${JSON.stringify(context)}

Return a JSON object with these exact keys:
- "title": SEO title under 60 chars, include city/country and property type
- "description": Meta description under 160 chars, compelling with keywords
- "keywords": Comma-separated relevant keywords (8-12 keywords)
- "jsonLd": A complete JSON-LD object of type "LodgingBusiness" with name, description, address, and offers

ONLY return valid JSON, no markdown.`;
    } else if (type === "catalog") {
      prompt = `You are an expert SEO copywriter for real estate platforms.
Generate optimized SEO metadata ${langInstruction} for a rental catalog page.

Context:
${JSON.stringify(context)}

Return a JSON object with:
- "title": SEO title under 60 chars with location focus
- "description": Meta description under 160 chars targeting renters searching for properties
- "keywords": Comma-separated relevant keywords
- "jsonLd": JSON-LD of type "ItemList" with numberOfItems and description

ONLY return valid JSON, no markdown.`;
    } else if (type === "country_page") {
      prompt = `You are an expert SEO copywriter for property management software.
Generate optimized SEO metadata ${langInstruction} for a country-specific property management landing page.

Country: ${context.country}
Country code: ${context.code}

Return a JSON object with:
- "title": SEO title under 60 chars like "Property Management in [Country] | Easy-Locs"
- "description": Meta description under 160 chars about property management software features for this specific country
- "keywords": Comma-separated keywords for property management + this country
- "h1": Suggested H1 heading
- "intro": 2-sentence intro paragraph about property management in this country

ONLY return valid JSON, no markdown.`;
    } else if (type === "host_profile") {
      prompt = `You are an expert SEO copywriter for property host profiles.
Generate optimized SEO metadata ${langInstruction} for a landlord/host profile page.

Host details:
${JSON.stringify(context)}

Return a JSON object with:
- "title": SEO title under 60 chars
- "description": Meta description under 160 chars
- "jsonLd": JSON-LD of type "Person" or "Organization" with name and description

ONLY return valid JSON, no markdown.`;
    } else {
      return new Response(JSON.stringify({ error: "Unknown SEO type" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "You are an SEO expert. Return ONLY valid JSON. No markdown fences." },
          { role: "user", content: prompt },
        ],
        max_tokens: 1500,
        temperature: 0.4,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error("AI Gateway error:", response.status, err);
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited" }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required" }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: "AI error" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const raw = data.choices?.[0]?.message?.content || "{}";

    // Strip markdown fences if present
    const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

    let seo;
    try {
      seo = JSON.parse(cleaned);
    } catch {
      console.error("Failed to parse SEO JSON:", cleaned);
      seo = { title: "", description: "", keywords: "" };
    }

    return new Response(JSON.stringify({ seo }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
