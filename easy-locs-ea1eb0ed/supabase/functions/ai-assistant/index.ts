import { requireRouterOrigin } from "../_shared/edge-function-consolidation.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { checkServerRateLimit, checkUserRateLimit, rateLimitResponse } from "../_shared/server-rate-limiter.ts";
import { enqueueToSqs, hasSqsCredentials } from "../_shared/aws-sqs.ts";
import { withEdgeLogging } from "../_shared/with-logging.ts";
import { trackBackendEvent } from "../_shared/segment-client.ts";
// LB1 #835 — every AI completion goes through the platform-native AI agent
// (registry, quota, sensitive routing, audit). The legacy `aiRoute` import
// has been removed entirely so a grep for direct provider calls returns
// empty on this surface. Streaming via the platform AI adapter will be
// reintroduced in #837 (ai-router rewire); until then, `stream: true`
// requests are downgraded to a single buffered response. The omega chat
// client (`src/core/omega/omega-streaming.ts`) already handles a
// non-`text/event-stream` response by emitting the full reply through
// `onToken` once — the UX degrades to "no progressive tokens" but stays
// fully functional and is uniformly governed.
import { dispatchAiCompletion } from "../_shared/execution/ai-dispatch.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version, x-trace-id, x-span-id, x-parent-span-id, x-request-id, traceparent",
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

  const routerCheck = requireRouterOrigin(req);
  if (!routerCheck.allowed) return routerCheck.response!;
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

    if (userId !== "service_role") {
      const userRl = await checkUserRateLimit(userId, "ai-assistant");
      if (!userRl.allowed) return rateLimitResponse(userRl);
    }

    // LB Closeout #852 — provider-key gating removed. The dispatch chain
    // resolves provider availability via the registered AI router metadata
    // and surfaces a clear failure outcome when no provider is wired.

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

    // `stream: true` requests are still accepted for backward compatibility
    // but are downgraded to a single buffered response. See top-of-file note
    // for why streaming is deferred to #837. We log the downgrade so we can
    // measure how much UX is affected before re-enabling streaming.
    if (stream) {
      logger.info("ai_stream_downgraded_to_buffered", { taskType });
    }

    // All AI completions — routed through the platform-native AI agent.
    const outcome = await dispatchAiCompletion(
      {
        feature: "ai-assistant",
        messages: chatMessages.map((m) => ({
          role: m.role as "system" | "user" | "assistant" | "tool",
          content: m.content,
        })),
        maxTokens: 2000,
        temperature: 0.7,
      },
      { feature: "ai-assistant", requestedBy: `edge:ai-assistant:${userId}` },
    );

    if (outcome.status === "pending_review") {
      // Sensitive output held for approval — tell the client without leaking
      // the held content. The approvals UI surfaces the full draft.
      logger.info("ai_response_pending_review", { taskId: outcome.taskId });
      return new Response(
        JSON.stringify({
          reply: "Your response is being reviewed and will appear shortly.",
          pendingReview: true,
          taskId: outcome.taskId,
        }),
        { status: 202, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (outcome.status !== "succeeded" || !outcome.output?.text) {
      console.error(
        "[ai-assistant] dispatch outcome:",
        outcome.status,
        outcome.errorCode,
        outcome.errorMessage ?? outcome.blockedReason,
      );
      const status = outcome.errorCode === "AI_QUOTA_EXCEEDED" ? 429 : 500;
      return new Response(
        JSON.stringify({ error: outcome.errorMessage ?? "Service error" }),
        { status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const reply = outcome.output.text || "Sorry, I couldn't generate a response.";
    const provider = outcome.output.interaction?.provider ?? "openai";
    const fallbackUsed = outcome.output.interaction?.fallbackUsed ?? false;

    logger.info("ai_response_completed", { provider, fallback: fallbackUsed });
    trackBackendEvent(userId, "ai.assistant_response", {
      task: taskType,
      provider,
      fallback: fallbackUsed,
    });

    return new Response(JSON.stringify({ reply, provider, fallbackUsed }), {
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
