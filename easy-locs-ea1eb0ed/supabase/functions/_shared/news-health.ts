export interface NewsApiHealthResult {
  status: "ok" | "error" | "not_configured";
  latencyMs?: number;
  error?: string;
  provider: string;
}

export async function checkGNewsHealth(): Promise<NewsApiHealthResult> {
  const apiKey = Deno.env.get("VITE_GNEWS_API_KEY") ?? Deno.env.get("GNEWS_API_KEY");
  if (!apiKey) {
    return { status: "not_configured", provider: "gnews" };
  }

  const start = Date.now();
  try {
    const url = `https://gnews.io/api/v4/top-headlines?lang=en&country=us&max=1&apikey=${apiKey}`;
    const response = await fetch(url, { signal: AbortSignal.timeout(5000) });
    const latencyMs = Date.now() - start;

    if (response.ok) {
      return { status: "ok", latencyMs, provider: "gnews" };
    }

    const text = await response.text().catch(() => "");
    return { status: "error", latencyMs, error: `HTTP ${response.status}: ${text.slice(0, 200)}`, provider: "gnews" };
  } catch (err) {
    return {
      status: "error",
      latencyMs: Date.now() - start,
      error: err instanceof Error ? err.message : "Connection failed",
      provider: "gnews",
    };
  }
}

export async function checkNewsDataHealth(): Promise<NewsApiHealthResult> {
  const apiKey = Deno.env.get("VITE_NEWSDATA_API_KEY") ?? Deno.env.get("NEWSDATA_API_KEY");
  if (!apiKey) {
    return { status: "not_configured", provider: "newsdata" };
  }

  const start = Date.now();
  try {
    const url = `https://newsdata.io/api/1/news?apikey=${apiKey}&country=us&language=en&size=1`;
    const response = await fetch(url, { signal: AbortSignal.timeout(5000) });
    const latencyMs = Date.now() - start;

    if (response.ok) {
      return { status: "ok", latencyMs, provider: "newsdata" };
    }

    const text = await response.text().catch(() => "");
    return { status: "error", latencyMs, error: `HTTP ${response.status}: ${text.slice(0, 200)}`, provider: "newsdata" };
  } catch (err) {
    return {
      status: "error",
      latencyMs: Date.now() - start,
      error: err instanceof Error ? err.message : "Connection failed",
      provider: "newsdata",
    };
  }
}

export async function checkAllNewsHealth(): Promise<{
  status: "ok" | "error" | "not_configured" | "partial";
  providers: NewsApiHealthResult[];
  latencyMs: number;
}> {
  const start = Date.now();
  const providers = await Promise.all([
    checkGNewsHealth(),
    checkNewsDataHealth(),
  ]);

  const statuses = providers.map((p) => p.status);
  const allNotConfigured = statuses.every((s) => s === "not_configured");
  const hasError = statuses.some((s) => s === "error");
  const hasOk = statuses.some((s) => s === "ok");

  let status: "ok" | "error" | "not_configured" | "partial";
  if (allNotConfigured) {
    status = "not_configured";
  } else if (hasError && hasOk) {
    status = "partial";
  } else if (hasError) {
    status = "error";
  } else {
    status = "ok";
  }

  return { status, providers, latencyMs: Date.now() - start };
}
