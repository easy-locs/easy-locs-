import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { checkServerRateLimit, checkUserRateLimit, rateLimitResponse } from "../_shared/server-rate-limiter.ts";
import { openaiChat } from "../_shared/openai-client.ts";

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
    // Parse result links from DDG HTML
    const linkPattern = /<a class="result__a" href="([^"]+)"[^>]*>([^<]+)<\/a>/g;
    const snippetPattern = /<a class="result__snippet"[^>]*>([^<]+)<\/a>/g;

    let linkMatch;
    let snippetMatch;
    const links: { url: string; title: string }[] = [];
    const snippets: string[] = [];

    while ((linkMatch = linkPattern.exec(html)) !== null && links.length < 5) {
      const rawUrl = linkMatch[1];
      const title = linkMatch[2].trim();
      // DDG URLs are relative redirects; try to extract actual URL
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

// ── Main search dispatcher ──
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

// ── Build context prompt from sources ──
function buildSearchContext(sources: WebSource[]): string {
  if (sources.length === 0) return "";
  return sources
    .map((s, i) => `[${i + 1}] ${s.title}\nURL: ${s.url}\nSnippet: ${s.snippet}`)
    .join("\n\n");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

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

    if (!Deno.env.get("OPENAI_API_KEY")) {
      return new Response(JSON.stringify({ error: "AI not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userLocale = locale || "fr";
    const langRule = LANG_PROMPTS[userLocale] || LANG_PROMPTS.fr;
    const currentQuestion = question || (messages?.[messages.length - 1]?.content ?? "");

    // Step 1: Perform web search
    let sources: WebSource[] = [];
    try {
      sources = await performWebSearch(currentQuestion);
    } catch (e) {
      console.warn("[ai-web-search] Web search failed:", e);
    }

    const searchContext = buildSearchContext(sources);

    // Step 2: Build system prompt with web context
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

    const chatMessages: Array<{ role: string; content: string }> = [
      { role: "system", content: systemPrompt },
    ];

    if (messages && Array.isArray(messages)) {
      chatMessages.push(...messages);
    } else {
      chatMessages.push({ role: "user", content: currentQuestion });
    }

    const aiResponse = await openaiChat({
      messages: chatMessages,
      max_tokens: 2000,
      temperature: 0.5,
      stream: !!stream,
    });

    if (!aiResponse.ok) {
      const err = await aiResponse.text();
      console.error("[ai-web-search] OpenAI API error:", aiResponse.status, err);
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: "AI service error" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Streaming: prepend sources as a JSON metadata line, then stream AI response
    if (stream) {
      const sourcesLine = `data: ${JSON.stringify({ sources })}\n\n`;
      const encoder = new TextEncoder();

      const { readable, writable } = new TransformStream();
      const writer = writable.getWriter();

      (async () => {
        try {
          // Send sources metadata first
          await writer.write(encoder.encode(sourcesLine));
          // Pipe AI stream
          const reader = aiResponse.body!.getReader();
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            await writer.write(value);
          }
        } finally {
          await writer.close();
        }
      })();

      return new Response(readable, {
        headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
      });
    }

    // Non-streaming
    const data = await aiResponse.json();
    const reply = data.choices?.[0]?.message?.content ?? "Sorry, I couldn't generate a response.";

    return new Response(JSON.stringify({ reply, sources }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[ai-web-search] Error:", error);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
