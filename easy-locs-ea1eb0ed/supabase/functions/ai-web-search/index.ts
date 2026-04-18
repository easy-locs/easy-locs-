import { requireRouterOrigin } from "../_shared/edge-function-consolidation.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { checkServerRateLimit, checkUserRateLimit, rateLimitResponse } from "../_shared/server-rate-limiter.ts";
// LB Closeout #852 — ai-web-search routes through the platform agent
// registry so every model call is governed (quota, sensitive routing, audit).
// Direct fetches against the OpenAI HTTP API and the parallel
// `_shared/ai-model-router.ts` helper are no longer permitted on this surface.
// Streaming clients still receive `text/event-stream`, but because the
// dispatch contract is poll-based the body is delivered as a single SSE
// chunk followed by `[DONE]` — see comment around `streamFromText`.
import { dispatchAiCompletion } from "../_shared/execution/ai-dispatch.ts";
import { rejectQuerySecrets } from "../_shared/reject-query-secrets.ts";

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
  ar: "أجب دائماً بالعربية.",
  zh: "请始终用中文回答。",
};

export interface WebSource {
  title: string;
  url: string;
  domain: string;
  snippet: string;
  favicon: string;
}

// ── Google Custom Search ──
async function searchGoogle(query: string, apiKey: string, cx: string): Promise<WebSource[]> {
  const url = new URL("https://www.googleapis.com/customsearch/v1");
  url.searchParams.set("key", apiKey);
  url.searchParams.set("cx", cx);
  url.searchParams.set("q", query);
  url.searchParams.set("num", "5");

  const resp = await fetch(url.toString());
  if (!resp.ok) throw new Error(`Google CSE error: ${resp.status}`);
  const data = await resp.json();

  return (data.items ?? []).map((item: any) => {
    const domain = new URL(item.link).hostname.replace("www.", "");
    return {
      title: item.title ?? "",
      url: item.link ?? "",
      domain,
      snippet: item.snippet ?? "",
      favicon: `https://www.google.com/s2/favicons?domain=${domain}&sz=32`,
    };
  });
}

// ── Brave Search ──
async function searchBrave(query: string, apiKey: string): Promise<WebSource[]> {
  const resp = await fetch(`https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=5`, {
    headers: {
      "Accept": "application/json",
      "Accept-Encoding": "gzip",
      "X-Subscription-Token": apiKey,
    },
  });
  if (!resp.ok) throw new Error(`Brave Search error: ${resp.status}`);
  const data = await resp.json();

  return (data.web?.results ?? []).map((item: any) => {
    const domain = new URL(item.url).hostname.replace("www.", "");
    return {
      title: item.title ?? "",
      url: item.url ?? "",
      domain,
      snippet: item.description ?? "",
      favicon: `https://www.google.com/s2/favicons?domain=${domain}&sz=32`,
    };
  });
}

// ── DuckDuckGo HTML fallback ──
async function searchDuckDuckGo(query: string): Promise<WebSource[]> {
  try {
    const resp = await fetch(
      `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`,
      {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; EasyLocs/1.0)",
          "Accept": "text/html",
        },
      }
    );
    if (!resp.ok) throw new Error("DDG fetch failed");
    const html = await resp.text();

    const results: WebSource[] = [];
    const linkPattern = /<a class="result__a" href="([^"]+)"[^>]*>([^<]+)<\/a>/g;
    const snippetPattern = /<a class="result__snippet"[^>]*>([^<]+)<\/a>/g;

    let linkMatch;
    let snippetMatch;
    const links: { url: string; title: string }[] = [];
    const snippets: string[] = [];

    while ((linkMatch = linkPattern.exec(html)) !== null && links.length < 5) {
      const rawUrl = linkMatch[1];
      const title = linkMatch[2].trim();
      let url = rawUrl;
      if (rawUrl.startsWith("//duckduckgo.com/l/?uddg=")) {
        const uddg = new URL("https:" + rawUrl).searchParams.get("uddg");
        if (uddg) url = decodeURIComponent(uddg);
      }
      if (url.startsWith("http")) {
        links.push({ url, title });
      }
    }

    while ((snippetMatch = snippetPattern.exec(html)) !== null && snippets.length < 5) {
      snippets.push(snippetMatch[1].trim());
    }

    for (let i = 0; i < links.length; i++) {
      try {
        const domain = new URL(links[i].url).hostname.replace("www.", "");
        results.push({
          title: links[i].title,
          url: links[i].url,
          domain,
          snippet: snippets[i] ?? "",
          favicon: `https://www.google.com/s2/favicons?domain=${domain}&sz=32`,
        });
      } catch {
        // skip invalid URLs
      }
    }

    return results;
  } catch (e) {
    console.warn("[ai-web-search] DDG fallback failed:", e);
    return [];
  }
}

async function performWebSearch(query: string): Promise<WebSource[]> {
  const googleKey = Deno.env.get("GOOGLE_CUSTOM_SEARCH_API_KEY");
  const googleCx = Deno.env.get("GOOGLE_CUSTOM_SEARCH_CX");
  const braveKey = Deno.env.get("BRAVE_SEARCH_API_KEY");

  if (googleKey && googleCx) {
    try {
      const results = await searchGoogle(query, googleKey, googleCx);
      if (results.length > 0) return results;
    } catch (e) {
      console.warn("[ai-web-search] Google CSE failed, trying fallback:", e);
    }
  }

  if (braveKey) {
    try {
      const results = await searchBrave(query, braveKey);
      if (results.length > 0) return results;
    } catch (e) {
      console.warn("[ai-web-search] Brave Search failed, trying DuckDuckGo:", e);
    }
  }

  return searchDuckDuckGo(query);
}

function buildSearchContext(sources: WebSource[]): string {
  if (sources.length === 0) return "";
  return sources
    .map((s, i) => `[${i + 1}] ${s.title}\nURL: ${s.url}\nSnippet: ${s.snippet}`)
    .join("\n\n");
}

// Streaming-as-single-chunk: the dispatch contract is poll-based, so we
// emit `sources`, the full reply, then `[DONE]` to satisfy clients that
// expect the OpenAI SSE wire format.
function streamFromText(text: string, sources: WebSource[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ sources })}\n\n`));
      controller.enqueue(encoder.encode(
        `data: ${JSON.stringify({ choices: [{ delta: { content: text } }] })}\n\n`,
      ));
      controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      controller.close();
    },
  });
}

Deno.serve(async (req) => {
  const __qsCheck = rejectQuerySecrets(req); if (__qsCheck.rejected) return __qsCheck.response!;
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const routerCheck = requireRouterOrigin(req);
  if (!routerCheck.allowed) return routerCheck.response!;
  try {
    const rlResult = await checkServerRateLimit(req, "ai-web-search");
    if (!rlResult.allowed) return rateLimitResponse(rlResult);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Missing or malformed Authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { question, messages, locale, stream } = await req.json();

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

    const userRl = await checkUserRateLimit(user.id, "ai-web-search");
    if (!userRl.allowed) return rateLimitResponse(userRl);

    const userLocale = locale || "fr";
    const langRule = LANG_PROMPTS[userLocale] || LANG_PROMPTS.fr;
    const currentQuestion = question || (messages?.[messages.length - 1]?.content ?? "");

    let sources: WebSource[] = [];
    try {
      sources = await performWebSearch(currentQuestion);
    } catch (e) {
      console.warn("[ai-web-search] Web search failed:", e);
    }

    const searchContext = buildSearchContext(sources);

    const systemPrompt = `You are an AI Web Search Assistant integrated into Easy-Locs, a property management platform.
Your role is to search the web and provide accurate, up-to-date information synthesized from real sources.

${langRule}

Guidelines:
- Provide structured, well-formatted answers using markdown.
- When you reference information from the web sources, cite them with [1], [2], etc. matching the source numbers provided.
- Be comprehensive but concise.
- If the question relates to real estate, property management, or rental markets, provide extra depth and context.
- Always be factual and avoid speculation beyond what the sources indicate.

${searchContext ? `Web search results for context:\n\n${searchContext}\n\nUse these sources to inform your response.` : "No web sources were available. Answer based on your knowledge."}`;

    const chatMessages: Array<{ role: "system" | "user" | "assistant" | "tool"; content: string }> = [
      { role: "system", content: systemPrompt },
    ];

    if (messages && Array.isArray(messages)) {
      for (const m of messages) {
        const role = (m.role === "system" || m.role === "user" || m.role === "assistant" || m.role === "tool")
          ? m.role
          : "user";
        chatMessages.push({ role, content: String(m.content ?? "") });
      }
    } else {
      chatMessages.push({ role: "user", content: currentQuestion });
    }

    const outcome = await dispatchAiCompletion(
      {
        feature: "ai-web-search",
        messages: chatMessages,
        maxTokens: 2000,
        temperature: 0.5,
        purpose: "general",
      },
      { feature: "ai-web-search" },
    );

    if (outcome.status !== "succeeded" || !outcome.output) {
      console.error(
        "[ai-web-search] dispatch outcome:",
        outcome.status,
        outcome.errorCode,
        outcome.errorMessage ?? outcome.blockedReason,
      );
      if (outcome.errorCode === "AI_QUOTA_EXCEEDED") {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: "AI service error" }), {
        status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const reply = outcome.output.text || "Sorry, I couldn't generate a response.";

    if (stream) {
      return new Response(streamFromText(reply, sources), {
        headers: {
          ...corsHeaders,
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          "Connection": "keep-alive",
          "X-AI-Provider": outcome.output.interaction.provider,
        },
      });
    }

    return new Response(
      JSON.stringify({ reply, sources, provider: outcome.output.interaction.provider }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("[ai-web-search] Error:", error);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
