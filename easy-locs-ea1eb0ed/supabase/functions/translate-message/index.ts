import { requireRouterOrigin } from "../_shared/edge-function-consolidation.ts";
import { rejectQuerySecrets } from "../_shared/reject-query-secrets.ts";
// LB1 #835 — AI translation goes through the platform-native registry so
// every model call is governed (quota, sensitive routing, audit). Direct
// `openaiChat` is no longer permitted on this surface.
import { dispatchAiCompletion } from "../_shared/execution/ai-dispatch.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version, x-trace-id, x-span-id, x-parent-span-id, x-request-id, traceparent",
};

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

const DEEPL_SUPPORTED = new Set([
  "bg", "cs", "da", "de", "el", "en", "es", "et", "fi", "fr", "hu", "id", "it",
  "ja", "ko", "lt", "lv", "nb", "nl", "pl", "pt", "ro", "ru", "sk", "sl", "sv",
  "tr", "uk", "zh", "ar",
]);

const toDeepLCode = (locale: string): string => {
  const map: Record<string, string> = { nb: "NB", zh: "ZH", pt: "PT-BR", en: "EN" };
  return (map[locale] || locale).toUpperCase();
};

async function translateWithDeepL(text: string, from: string, to: string): Promise<string | null> {
  const apiKey = Deno.env.get("DEEPL_API_KEY");
  if (!apiKey) return null;
  if (!DEEPL_SUPPORTED.has(from) || !DEEPL_SUPPORTED.has(to)) return null;

  try {
    const baseUrl = apiKey.endsWith(":fx") ? "https://api-free.deepl.com" : "https://api.deepl.com";
    const response = await fetch(`${baseUrl}/v2/translate`, {
      method: "POST",
      headers: { Authorization: `DeepL-Auth-Key ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ text: [text], source_lang: toDeepLCode(from), target_lang: toDeepLCode(to) }),
    });
    if (!response.ok) { console.error("DeepL error:", response.status, await response.text()); return null; }
    const data = await response.json();
    return data.translations?.[0]?.text || null;
  } catch (err) { console.error("DeepL exception:", err); return null; }
}

async function translateWithAI(text: string, from: string, to: string): Promise<string | null> {
  // LB Closeout #852 — provider-key gating removed. The dispatch chain
  // resolves provider availability via the registered AI router metadata
  // and surfaces a clear failed/blocked status when no provider is wired.
  const fromName = LOCALE_NAMES[from] || from;
  const toName = LOCALE_NAMES[to] || to;

  try {
    const outcome = await dispatchAiCompletion(
      {
        feature: "translate-message",
        messages: [
          { role: "system", content: `You are a professional translator. Translate the following text from ${fromName} to ${toName}. Return ONLY the translated text. Keep the same tone, formality and formatting. Do not add quotes, explanations, or commentary.` },
          { role: "user", content: text },
        ],
        maxTokens: 2000,
        temperature: 0.1,
        purpose: "general",
      },
      { feature: "translate-message" },
    );

    if (outcome.status !== "succeeded" || !outcome.output) {
      console.error(
        "[translate-message] dispatch outcome:",
        outcome.status,
        outcome.errorCode,
        outcome.errorMessage ?? outcome.blockedReason,
      );
      return null;
    }
    return outcome.output.text?.trim() || null;
  } catch (err) {
    console.error("AI translation exception:", err);
    return null;
  }
}

/** Detect language from text using patterns + AI fallback */
export function detectLanguageFromText(text: string): string {
  const lower = text.toLowerCase();
  const patterns: [string, RegExp][] = [
    ["fr", /\b(bonjour|merci|cordialement|salut|bonsoir|cher|chère|je vous|nous vous|madame|monsieur|s'il vous plaît)\b/],
    ["es", /\b(hola|gracias|buenos|buenas|estimado|estimada|saludos|atentamente|por favor)\b/],
    ["de", /\b(hallo|danke|guten|liebe|lieber|herzlich|sehr geehrte|mit freundlichen)\b/],
    ["it", /\b(ciao|grazie|buongiorno|buonasera|gentile|cordiali|distinti saluti)\b/],
    ["pt", /\b(olá|obrigado|obrigada|bom dia|boa tarde|prezado|atenciosamente)\b/],
    ["nl", /\b(hallo|bedankt|dank|goedemorgen|geachte|met vriendelijke)\b/],
    ["tr", /\b(merhaba|teşekkür|iyi günler|sayın|selamlar)\b/],
    ["pl", /\b(cześć|dziękuję|dzień dobry|pozdrawiam|szanowny)\b/],
    ["ru", /[\u0400-\u04FF]{3,}/],
    ["ar", /[\u0600-\u06FF]{3,}/],
    ["ja", /[\u3040-\u309F\u30A0-\u30FF]{2,}/],
    ["zh", /[\u4E00-\u9FFF]{2,}/],
    ["ko", /[\uAC00-\uD7AF]{2,}/],
    ["th", /[\u0E00-\u0E7F]{2,}/],
    ["vi", /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/],
    ["hi", /[\u0900-\u097F]{3,}/],
  ];
  for (const [locale, pattern] of patterns) {
    if (pattern.test(lower)) return locale;
  }
  return "en";
}

Deno.serve(async (req) => {
  const __qsCheck = rejectQuerySecrets(req); if (__qsCheck.rejected) return __qsCheck.response!;
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const routerCheck = requireRouterOrigin(req);
  if (!routerCheck.allowed) return routerCheck.response!;
  try {
    const { text, from_locale, to_locale, detect_only } = await req.json();

    if (!text) {
      return new Response(JSON.stringify({ error: "Missing text" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Detection-only mode
    if (detect_only) {
      const detected = detectLanguageFromText(text);
      return new Response(JSON.stringify({ detected_locale: detected }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!from_locale || !to_locale) {
      return new Response(JSON.stringify({ error: "Missing from_locale or to_locale" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (from_locale === to_locale) {
      return new Response(JSON.stringify({ translated: text, engine: "none" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Cascade: DeepL → OpenAI
    let translated: string | null = null;
    let engine = "none";

    translated = await translateWithDeepL(text, from_locale, to_locale);
    if (translated) engine = "deepl";

    if (!translated) {
      translated = await translateWithAI(text, from_locale, to_locale);
      if (translated) engine = "openai";
    }

    if (!translated) {
      return new Response(JSON.stringify({ error: "All translation engines failed" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ translated, engine, original: text, from_locale, to_locale }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("translate-message error:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
