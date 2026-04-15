import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { checkServerRateLimit, rateLimitResponse } from "../_shared/server-rate-limiter.ts";
import { enqueueToSqs, hasSqsCredentials } from "../_shared/aws-sqs.ts";
import { withEdgeLogging } from "../_shared/with-logging.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const LANG_PROMPTS: Record<string, string> = {
  fr: "Réponds toujours en français.",
  en: "Always respond in English.",
  es: "Responde siempre en español.",
  de: "Antworte immer auf Deutsch.",
  it: "Rispondi sempre in italiano.",
  pt: "Responda sempre em português.",
  nl: "Antwoord altijd in het Nederlands.",
  pl: "Zawsze odpowiadaj po polsku.",
  tr: "Her zaman Türkçe yanıt verin.",
  ar: "أجب دائماً بالعربية.",
  ja: "常に日本語で回答してください。",
  ko: "항상 한국어로 답변하세요.",
  zh: "请始终用中文回答。",
  hi: "हमेशा हिंदी में उत्तर दें।",
  th: "ตอบเป็นภาษาไทยเสมอ",
  vi: "Luôn trả lời bằng tiếng Việt.",
  id: "Selalu jawab dalam Bahasa Indonesia.",
  ms: "Sentiasa jawab dalam Bahasa Melayu.",
  sv: "Svara alltid på svenska.",
  da: "Svar altid på dansk.",
  nb: "Svar alltid på norsk.",
  fi: "Vastaa aina suomeksi.",
  el: "Απάντα πάντα στα ελληνικά.",
  cs: "Vždy odpovídejte česky.",
  hu: "Mindig magyarul válaszoljon.",
  ro: "Răspunde întotdeauna în română.",
  hr: "Uvijek odgovarajte na hrvatskom.",
  bg: "Винаги отговаряйте на български.",
  sk: "Vždy odpovedajte po slovensky.",
  he: "ענה תמיד בעברית.",
  uk: "Завжди відповідайте українською.",
};

const TASK_PROMPTS: Record<string, string> = {
  chat: `You are the AI Copilot of Easy-Locs, a next-generation property management platform.
You help landlords and property managers with:
- Property management advice and best practices
- Legal obligations by country
- Tenant communication strategies
- Financial optimization for rentals
- Marketing and listing improvements
- Booking management tips

Be concise, professional, and actionable. Provide specific advice based on the user's context.
Never mention "AI", "artificial intelligence", or any underlying infrastructure provider.
Present yourself as the "Easy-Locs Copilot".`,

  listing_description: `You are a property listing copywriter for Easy-Locs.
Generate an attractive, SEO-friendly property listing description.
Use engaging language that highlights the property's best features.
Structure: catchy intro → key features → neighborhood highlights → call to action.
Keep it between 150-250 words. Use short paragraphs.`,

  listing_title: `You are a property listing title expert.
Generate 3 compelling, SEO-friendly listing titles (max 80 characters each).
Each title should emphasize a different angle: luxury/comfort, location, or unique features.
Return them numbered 1-3.`,

  translate: `You are a professional real estate translator.
Translate the provided text accurately while adapting it culturally for the target market.
Maintain the marketing appeal and SEO quality.
Only return the translation, nothing else.`,

  guest_reply: `You are a hospitality communication expert for Easy-Locs.
Draft a professional, warm reply to a guest message.
Be helpful, courteous, and solution-oriented.
Keep the tone professional but friendly. Keep it concise (2-4 sentences).`,

  seo_improve: `You are an SEO expert for vacation rental listings.
Analyze the provided listing content and suggest specific improvements for:
- Title optimization
- Description keywords
- Structure improvements
Return actionable suggestions in a numbered list.`,

  summarize: `You are a business intelligence assistant for Easy-Locs.
Summarize the provided data or activity in a clear, concise business report format.
Use bullet points and highlight key metrics and actionable insights.`,
};

Deno.serve(withEdgeLogging("ai-assistant", async (req, logger) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const rlResult = await checkServerRateLimit(req, "ai-assistant");
    if (!rlResult.allowed) return rateLimitResponse(rlResult);
    logger.info("ai_request_started", { method: req.method });

    const { messages, message, context, locale, task, taskContext, stream, async_offload } = await req.json();

    const authHeader = req.headers.get("Authorization") || "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const token = authHeader.replace("Bearer ", "");
    const isServiceRole = token === serviceRoleKey && serviceRoleKey.length > 0;

    let userId: string;

    if (isServiceRole) {
      userId = "service_role";
    } else {
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_ANON_KEY")!,
        { global: { headers: { Authorization: authHeader } } }
      );

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      userId = user.id;
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userLocale = locale || "fr";
    const langRule = LANG_PROMPTS[userLocale] || LANG_PROMPTS.en;
    const taskType = task || "chat";
    const basePrompt = TASK_PROMPTS[taskType] || TASK_PROMPTS.chat;

    const systemPrompt = `${basePrompt}

${langRule}

${context ? `User context:\n${JSON.stringify(context)}` : ""}
${taskContext ? `Task context:\n${taskContext}` : ""}`;

    const chatMessages: Array<{ role: string; content: string }> = [
      { role: "system", content: systemPrompt },
    ];

    if (messages && Array.isArray(messages)) {
      chatMessages.push(...messages);
    } else if (message) {
      chatMessages.push({ role: "user", content: message });
    }

    if (async_offload && !stream && hasSqsCredentials()) {
      const sqsResult = await enqueueToSqs("easy-locs-ai-tasks", {
        user_id: userId,
        task: taskType,
        messages: chatMessages,
        locale: userLocale,
        context,
      });

      if (sqsResult.success) {
        return new Response(JSON.stringify({
          queued: true,
          message_id: sqsResult.messageId,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      console.warn("[ai-assistant] SQS offload failed, processing inline:", sqsResult.error);
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: chatMessages,
        max_tokens: 2000,
        temperature: 0.7,
        stream: !!stream,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error("AI Gateway error:", response.status, err);

      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ error: "Service error" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Streaming mode
    if (stream) {
      return new Response(response.body, {
        headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
      });
    }

    // Non-streaming mode
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
}));
