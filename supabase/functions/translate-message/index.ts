import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text, from_locale, to_locale } = await req.json();

    if (!text || !from_locale || !to_locale) {
      return new Response(JSON.stringify({ error: "Missing text, from_locale or to_locale" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (from_locale === to_locale) {
      return new Response(JSON.stringify({ translated: text }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOCALE_NAMES: Record<string, string> = {
      fr: "French", en: "English", es: "Spanish", de: "German", it: "Italian",
      pt: "Portuguese", nl: "Dutch", pl: "Polish", tr: "Turkish", ar: "Arabic",
      ja: "Japanese", ko: "Korean", zh: "Chinese", hi: "Hindi", th: "Thai",
      vi: "Vietnamese", id: "Indonesian", ms: "Malay", sv: "Swedish", da: "Danish",
      nb: "Norwegian", fi: "Finnish", el: "Greek", cs: "Czech", hu: "Hungarian",
      ro: "Romanian", hr: "Croatian", bg: "Bulgarian", sk: "Slovak", he: "Hebrew", uk: "Ukrainian",
    };

    const fromName = LOCALE_NAMES[from_locale] || from_locale;
    const toName = LOCALE_NAMES[to_locale] || to_locale;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const response = await fetch("https://api.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          {
            role: "system",
            content: `You are a translator. Translate the following message from ${fromName} to ${toName}. Return ONLY the translated text, nothing else. Keep the same tone and formality. Do not add quotes or explanations.`,
          },
          { role: "user", content: text },
        ],
        max_tokens: 1000,
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Translation API error:", errText);
      return new Response(JSON.stringify({ error: "Translation failed", details: errText }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const translated = data.choices?.[0]?.message?.content?.trim() || text;

    return new Response(JSON.stringify({ translated }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("translate-message error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
