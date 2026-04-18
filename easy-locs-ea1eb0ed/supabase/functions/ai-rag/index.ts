// Next-Gen IA — RAG assistant with hybrid retrieval (BM25 + vector) and citations.
// POST body:
//   {
//     query: string,
//     conversationId?: string,          // optional; auto-created if omitted
//     domain?: "radar"|"marketplace"|"property"|"ride"|"general",
//     topK?: number,                    // default 6
//     tables?: string[],                // default: ["listings"]  (listings supports BM25+vector)
//     locale?: string,                  // default "fr"
//   }
//
// Response:
//   { reply, citations: [{id, kind, title, score}], conversationId, provider, cost, fallbackUsed }

import { requireRouterOrigin } from "../_shared/edge-function-consolidation.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { checkServerRateLimit, rateLimitResponse } from "../_shared/server-rate-limiter.ts";
import { withEdgeLogging } from "../_shared/with-logging.ts";
import { dispatchAiCompletion } from "../_shared/execution/ai-dispatch.ts";
import { generateEmbedding } from "../_shared/embedding-client.ts";
import { applyGuardrails, sanitizeAssistantOutput } from "../_shared/ai-guardrails.ts";
import { logAiInteraction, checkAiQuota } from "../_shared/ai-cost-tracker.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-trace-id, x-span-id, x-parent-span-id, x-request-id, traceparent",
};

const LANG_PROMPTS: Record<string, string> = {
  fr: "Réponds toujours en français.",
  en: "Always respond in English.",
  es: "Responde siempre en español.",
  de: "Antworte immer auf Deutsch.",
  it: "Rispondi sempre in italiano.",
  ar: "أجب دائماً بالعربية.",
};

const DOMAIN_PRIMERS: Record<string, string> = {
  radar:       "You are the Radar assistant: discover places, events and opportunities.",
  marketplace: "You are the Marketplace assistant: help users find products and services.",
  property:    "You are the Property assistant: help landlords, tenants and guests.",
  ride:        "You are the Ride assistant: help with mobility, routes and bookings.",
  general:     "You are the Easy-Locs Copilot, a helpful multi-domain assistant.",
};

interface Citation {
  id: string;
  kind: string;
  title: string;
  score: number;
  snippet?: string;
}

async function hybridRetrieve(
  db: ReturnType<typeof createClient>,
  query: string,
  queryEmbedding: number[],
  topK: number,
): Promise<Citation[]> {
  const vectorStr = `[${queryEmbedding.join(",")}]`;
  const { data, error } = await db.rpc("hybrid_search_listings", {
    p_query: query,
    p_query_embedding: vectorStr,
    p_match_count: topK,
  });
  if (error) {
    console.warn("[ai-rag] hybrid_search_listings error:", error.message);
    return [];
  }
  return (data ?? []).map((row: {
    id: string; title: string | null; category: string | null;
    city: string | null; price: number | null; score: number | null;
  }) => ({
    id: row.id,
    kind: "listing",
    title: row.title ?? "Untitled listing",
    score: Number(row.score ?? 0),
    snippet: [row.category, row.city, row.price ? `${row.price}` : null]
      .filter(Boolean).join(" · "),
  }));
}

function formatContext(citations: Citation[]): string {
  if (citations.length === 0) return "No retrieved documents.";
  return citations
    .map((c, i) => `[${i + 1}] (${c.kind}:${c.id}) ${c.title}${c.snippet ? ` — ${c.snippet}` : ""}`)
    .join("\n");
}

Deno.serve(withEdgeLogging("ai-rag", async (req, logger) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const routerCheck = requireRouterOrigin(req);
  if (!routerCheck.allowed) return routerCheck.response!;

  const rl = await checkServerRateLimit(req, "ai-rag");
  if (!rl.allowed) return rateLimitResponse(rl);

  const start = Date.now();

  try {
    const { query, conversationId, domain = "general", topK = 6, locale = "fr" } =
      await req.json();

    if (typeof query !== "string" || query.trim().length < 2) {
      return new Response(JSON.stringify({ error: "query required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authHeader = req.headers.get("Authorization") || "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const token = authHeader.replace("Bearer ", "");
    const isServiceRole = token === serviceKey && serviceKey.length > 0;

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    let userId: string | null = null;
    if (!isServiceRole) {
      const { data: { user } } = await userClient.auth.getUser();
      if (!user) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      userId = user.id;
    }

    if (userId) {
      const q = await checkAiQuota(userId, "ai-rag");
      if (!q.allowed) {
        await logAiInteraction({
          userId, feature: "ai-rag", domain, provider: "openai", model: "n/a",
          promptTokens: 0, completionTokens: 0, latencyMs: Date.now() - start,
          status: "blocked", blockReason: `quota:${q.reason}`,
        });
        return new Response(
          JSON.stringify({ error: "Daily AI quota reached", reason: q.reason, used: q.used, limits: q.limits }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    }

    const guard = await applyGuardrails(query, { blockOnPii: false });
    if (!guard.allowed) {
      await logAiInteraction({
        userId, feature: "ai-rag", domain, provider: "openai", model: "n/a",
        promptTokens: 0, completionTokens: 0, latencyMs: Date.now() - start,
        status: "blocked", blockReason: guard.reason,
      });
      return new Response(
        JSON.stringify({ error: "Request blocked by guardrails", reason: guard.reason, details: guard.details }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    const sanitizedQuery = guard.sanitized;

    const db = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const embedding = await generateEmbedding(sanitizedQuery);
    const citations = await hybridRetrieve(db, sanitizedQuery, embedding.embedding, topK);

    // Conversation memory (best-effort; only if user context available)
    const convId = conversationId ?? crypto.randomUUID();
    let history: Array<{ role: string; content: string }> = [];
    if (userId) {
      const { data: mem } = await db
        .from("ai_conversation_memory")
        .select("role, content")
        .eq("user_id", userId)
        .eq("conversation_id", convId)
        .order("created_at", { ascending: true })
        .limit(20);
      history = (mem ?? [])
        .filter((m) => m.role === "user" || m.role === "assistant" || m.role === "summary")
        .map((m) => ({
          role: m.role === "summary" ? "system" : m.role,
          content: m.role === "summary" ? `Previous context summary:\n${m.content}` : m.content,
        }));
    }

    const systemPrompt = `${DOMAIN_PRIMERS[domain] ?? DOMAIN_PRIMERS.general}
${LANG_PROMPTS[locale] ?? LANG_PROMPTS.en}

Use ONLY the retrieved context below when it is relevant. If the context is insufficient, say so clearly.
Cite sources inline using [1], [2], ... matching the numbered context items.
Never mention "AI" or underlying infrastructure.

Retrieved context:
${formatContext(citations)}`;

    const messages = [
      { role: "system", content: systemPrompt },
      ...history,
      { role: "user", content: sanitizedQuery },
    ];

    // LB1 Cleanup #842: migrated from aiRoute() to dispatchAiCompletion()
    // so the call passes through the registered ai.completion agent
    // (policy gate, sensitive-output classifier, audit row, agent quota).
    // Per-call provider override is no longer supported — the registry
    // primary + fallback chain governs provider selection.
    const aiOutcome = await dispatchAiCompletion(
      {
        feature: "ai-rag",
        messages: messages as Array<{ role: "system" | "user" | "assistant"; content: string }>,
        maxTokens: 1200,
        temperature: 0.4,
        purpose: "general",
      },
      { feature: "ai-rag" },
    );

    if (aiOutcome.status !== "succeeded" || !aiOutcome.output) {
      logger.error("ai_rag_provider_error", {
        status: aiOutcome.status,
        code: aiOutcome.errorCode,
        msg: aiOutcome.errorMessage,
      });
      await logAiInteraction({
        userId, feature: "ai-rag", domain,
        provider: "openai", model: "unknown",
        promptTokens: 0, completionTokens: 0, latencyMs: Date.now() - start,
        status: "error",
        blockReason: aiOutcome.errorCode ?? aiOutcome.status,
      });
      return new Response(JSON.stringify({ error: "AI provider error" }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const interaction = aiOutcome.output.interaction;
    // logAiInteraction's `provider` column is constrained to "openai" |
    // "anthropic" by historical schema. The dispatch interaction can also
    // emit "internal" (the new internal_router transport), so we map it
    // back to "openai" — the underlying provider behind that transport —
    // to keep the legacy per-user audit row schema stable.
    const provider: "openai" | "anthropic" =
      interaction.provider === "anthropic" ? "anthropic" : "openai";
    const fallbackUsed = interaction.fallbackUsed;
    const model = interaction.model;
    const promptTokens = interaction.promptTokens;
    const completionTokens = interaction.completionTokens;
    let reply = sanitizeAssistantOutput(
      aiOutcome.output.text || "Sorry, I could not generate a response.",
    );

    // Persist memory
    if (userId) {
      await db.from("ai_conversation_memory").insert([
        { user_id: userId, conversation_id: convId, domain, role: "user",      content: sanitizedQuery, token_count: promptTokens },
        { user_id: userId, conversation_id: convId, domain, role: "assistant", content: reply, citations: citations.map((c, i) => ({ n: i + 1, id: c.id, kind: c.kind })), token_count: completionTokens },
      ]);
    }

    const { cost } = await logAiInteraction({
      userId, feature: "ai-rag", domain, provider, model,
      promptTokens, completionTokens, latencyMs: Date.now() - start,
      fallbackUsed,
      metadata: { topK, citations: citations.length },
    });

    return new Response(JSON.stringify({
      reply, citations, conversationId: convId, provider, fallbackUsed, cost,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("[ai-rag] error:", err);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
}));
