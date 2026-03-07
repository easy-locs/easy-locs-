import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Full locale name map for 100+ languages
const LOCALE_NAMES: Record<string, string> = {
  fr: "French", en: "English", es: "Spanish", de: "German", it: "Italian",
  pt: "Portuguese", nl: "Dutch", pl: "Polish", tr: "Turkish", ar: "Arabic",
  ja: "Japanese", ko: "Korean", zh: "Chinese", hi: "Hindi", th: "Thai",
  vi: "Vietnamese", id: "Indonesian", ms: "Malay", sv: "Swedish", da: "Danish",
  nb: "Norwegian", fi: "Finnish", el: "Greek", cs: "Czech", hu: "Hungarian",
  ro: "Romanian", hr: "Croatian", bg: "Bulgarian", sk: "Slovak", he: "Hebrew",
  uk: "Ukrainian", ru: "Russian", et: "Estonian", lv: "Latvian", lt: "Lithuanian",
  sl: "Slovenian", mt: "Maltese", ga: "Irish", sq: "Albanian", mk: "Macedonian",
  bs: "Bosnian", sr: "Serbian", ka: "Georgian", hy: "Armenian", az: "Azerbaijani",
  kk: "Kazakh", uz: "Uzbek", tg: "Tajik", mn: "Mongolian", ne: "Nepali",
  bn: "Bengali", ta: "Tamil", te: "Telugu", kn: "Kannada", ml: "Malayalam",
  si: "Sinhala", my: "Burmese", km: "Khmer", lo: "Lao", am: "Amharic",
  sw: "Swahili", ha: "Hausa", yo: "Yoruba", ig: "Igbo", zu: "Zulu",
  af: "Afrikaans", ur: "Urdu", fa: "Persian", ps: "Pashto", tl: "Filipino",
  jv: "Javanese", su: "Sundanese", ceb: "Cebuano", mg: "Malagasy", rw: "Kinyarwanda",
};

// DeepL supported language codes (subset)
const DEEPL_SUPPORTED = new Set([
  "bg", "cs", "da", "de", "el", "en", "es", "et", "fi", "fr", "hu", "id", "it",
  "ja", "ko", "lt", "lv", "nb", "nl", "pl", "pt", "ro", "ru", "sk", "sl", "sv",
  "tr", "uk", "zh", "ar",
]);

// Map our locale codes to DeepL codes
const toDeepLCode = (locale: string): string => {
  const map: Record<string, string> = { nb: "NB", zh: "ZH", pt: "PT-BR", en: "EN" };
  return (map[locale] || locale).toUpperCase();
};

/**
 * Strategy 1: DeepL API (primary, when DEEPL_API_KEY is set)
 */
async function translateWithDeepL(text: string, from: string, to: string): Promise<string | null> {
  const apiKey = Deno.env.get("DEEPL_API_KEY");
  if (!apiKey) return null;
  if (!DEEPL_SUPPORTED.has(from) || !DEEPL_SUPPORTED.has(to)) return null;

  try {
    const baseUrl = apiKey.endsWith(":fx")
      ? "https://api-free.deepl.com"
      : "https://api.deepl.com";

    const response = await fetch(`${baseUrl}/v2/translate`, {
      method: "POST",
      headers: {
        Authorization: `DeepL-Auth-Key ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: [text],
        source_lang: toDeepLCode(from),
        target_lang: toDeepLCode(to),
      }),
    });

    if (!response.ok) {
      console.error("DeepL error:", response.status, await response.text());
      return null;
    }

    const data = await response.json();
    return data.translations?.[0]?.text || null;
  } catch (err) {
    console.error("DeepL exception:", err);
    return null;
  }
}

/**
 * Strategy 2: Google Cloud Translation API (fallback, when GOOGLE_TRANSLATE_API_KEY is set)
 */
async function translateWithGoogle(text: string, from: string, to: string): Promise<string | null> {
  const apiKey = Deno.env.get("GOOGLE_TRANSLATE_API_KEY");
  if (!apiKey) return null;

  try {
    const url = `https://translation.googleapis.com/language/translate/v2?key=${apiKey}`;
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ q: text, source: from, target: to, format: "text" }),
    });

    if (!response.ok) {
      console.error("Google Translate error:", response.status, await response.text());
      return null;
    }

    const data = await response.json();
    return data.data?.translations?.[0]?.translatedText || null;
  } catch (err) {
    console.error("Google Translate exception:", err);
    return null;
  }
}

/**
 * Strategy 3: Built-in AI (ultimate fallback, always available)
 */
async function translateWithBuiltInAI(text: string, from: string, to: string): Promise<string | null> {
  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) return null;

  const fromName = LOCALE_NAMES[from] || from;
  const toName = LOCALE_NAMES[to] || to;

  try {
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          {
            role: "system",
            content: `You are a professional translator. Translate the following text from ${fromName} to ${toName}. Return ONLY the translated text. Keep the same tone, formality and formatting. Do not add quotes, explanations, or commentary.`,
          },
          { role: "user", content: text },
        ],
        max_tokens: 2000,
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      console.error("AI translation error:", response.status, await response.text());
      return null;
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content?.trim() || null;
  } catch (err) {
    console.error("Lovable AI exception:", err);
    return null;
  }
}

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

    // Same language: no translation needed
    if (from_locale === to_locale) {
      return new Response(JSON.stringify({ translated: text, engine: "none" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Cascade: DeepL → Google Cloud → Lovable AI
    let translated: string | null = null;
    let engine = "none";

    // 1. Try DeepL (primary)
    translated = await translateWithDeepL(text, from_locale, to_locale);
    if (translated) {
      engine = "deepl";
    }

    // 2. Try Google Cloud Translation (fallback for unsupported DeepL languages)
    if (!translated) {
      translated = await translateWithGoogle(text, from_locale, to_locale);
      if (translated) engine = "google";
    }

    // 3. Lovable AI (ultimate fallback, supports 100+ languages)
    if (!translated) {
      translated = await translateWithLovableAI(text, from_locale, to_locale);
      if (translated) engine = "lovable-ai";
    }

    if (!translated) {
      return new Response(JSON.stringify({ error: "All translation engines failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ translated, engine, original: text }), {
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
