import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Language prompts for worldwide support
const LANG_PROMPTS: Record<string, string> = {
  fr: "Tu es l'assistant personnel d'Easy-Locs, une plateforme de gestion locative immobilière. Réponds toujours en français.",
  en: "You are the personal assistant of Easy-Locs, a property management platform. Always respond in English.",
  es: "Eres el asistente personal de Easy-Locs, una plataforma de gestión de alquileres. Responde siempre en español.",
  de: "Du bist der persönliche Assistent von Easy-Locs, einer Immobilienverwaltungsplattform. Antworte immer auf Deutsch.",
  it: "Sei l'assistente personale di Easy-Locs, una piattaforma di gestione immobiliare. Rispondi sempre in italiano.",
  pt: "Você é o assistente pessoal do Easy-Locs, uma plataforma de gestão imobiliária. Responda sempre em português.",
  nl: "Je bent de persoonlijke assistent van Easy-Locs, een vastgoedbeheersplatform. Antwoord altijd in het Nederlands.",
  pl: "Jesteś osobistym asystentem Easy-Locs, platformy do zarządzania nieruchomościami. Zawsze odpowiadaj po polsku.",
  tr: "Easy-Locs'un kişisel asistanısınız. Her zaman Türkçe yanıt verin.",
  ar: "أنت المساعد الشخصي لمنصة Easy-Locs لإدارة العقارات. أجب دائماً بالعربية.",
  ja: "あなたはEasy-Locsの不動産管理プラットフォームのパーソナルアシスタントです。常に日本語で回答してください。",
  ko: "Easy-Locs 부동산 관리 플랫폼의 개인 비서입니다. 항상 한국어로 답변하세요.",
  zh: "你是Easy-Locs房产管理平台的个人助手。请始终用中文回答。",
  hi: "आप Easy-Locs संपत्ति प्रबंधन प्लेटफ़ॉर्म के व्यक्तिगत सहायक हैं। हमेशा हिंदी में उत्तर दें।",
  th: "คุณคือผู้ช่วยส่วนตัวของ Easy-Locs แพลตฟอร์มจัดการอสังหาริมทรัพย์ ตอบเป็นภาษาไทยเสมอ",
  vi: "Bạn là trợ lý cá nhân của Easy-Locs. Luôn trả lời bằng tiếng Việt.",
  id: "Anda adalah asisten pribadi Easy-Locs. Selalu jawab dalam Bahasa Indonesia.",
  ms: "Anda adalah pembantu peribadi Easy-Locs. Sentiasa jawab dalam Bahasa Melayu.",
  sv: "Du är Easy-Locs personliga assistent. Svara alltid på svenska.",
  da: "Du er Easy-Locs personlige assistent. Svar altid på dansk.",
  nb: "Du er Easy-Locs personlige assistent. Svar alltid på norsk.",
  fi: "Olet Easy-Locsin henkilökohtainen avustaja. Vastaa aina suomeksi.",
  el: "Είσαι ο προσωπικός βοηθός του Easy-Locs. Απάντα πάντα στα ελληνικά.",
  cs: "Jste osobní asistent Easy-Locs. Vždy odpovídejte česky.",
  hu: "Ön az Easy-Locs személyes asszisztense. Mindig magyarul válaszoljon.",
  ro: "Ești asistentul personal Easy-Locs. Răspunde întotdeauna în română.",
  hr: "Vi ste osobni asistent Easy-Locsa. Uvijek odgovarajte na hrvatskom.",
  bg: "Вие сте личният асистент на Easy-Locs. Винаги отговаряйте на български.",
  sk: "Ste osobný asistent Easy-Locs. Vždy odpovedajte po slovensky.",
  he: "אתה העוזר האישי של Easy-Locs. ענה תמיד בעברית.",
  uk: "Ви — персональний асистент Easy-Locs. Завжди відповідайте українською.",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, context, locale } = await req.json();

    // Get user from auth
    const authHeader = req.headers.get("Authorization");
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader! } } }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Detect language: explicit locale > user profile > default fr
    const userLocale = locale || "fr";
    const langIntro = LANG_PROMPTS[userLocale] || LANG_PROMPTS.en;

    const systemPrompt = `${langIntro}

Tu aides les propriétaires et bailleurs à gérer leurs biens, locataires, baux, quittances et obligations administratives dans le monde entier.

Contexte utilisateur:
${context ? JSON.stringify(context) : "Aucun contexte supplémentaire."}

Règles:
- Réponds toujours dans la langue demandée (${userLocale})
- Sois concis, professionnel et actionnable
- Propose des actions concrètes basées sur la situation du propriétaire
- Cite les articles de loi pertinents du pays concerné quand applicable
- Ne mentionne jamais "IA", "intelligence artificielle" ou "Lovable"
- Présente-toi comme "l'assistant personnel Easy-Locs"`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${Deno.env.get("LOVABLE_API_KEY")}`,
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: message },
        ],
        max_tokens: 1500,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error("AI Gateway error:", err);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      return new Response(JSON.stringify({ error: "Service error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content || "Sorry, I couldn't generate a response.";

    return new Response(JSON.stringify({ reply }), {
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
