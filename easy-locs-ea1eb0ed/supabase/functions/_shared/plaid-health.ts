const PLAID_API_BASE_URLS: Record<string, string> = {
  sandbox: "https://sandbox.plaid.com",
  development: "https://development.plaid.com",
  production: "https://production.plaid.com",
};

export interface PlaidHealthResult {
  status: "ok" | "error" | "not_configured";
  latencyMs?: number;
  error?: string;
}

export async function checkPlaidHealth(): Promise<PlaidHealthResult> {
  const clientId = Deno.env.get("PLAID_CLIENT_ID");
  const secret = Deno.env.get("PLAID_SECRET");
  const env = Deno.env.get("PLAID_ENV") ?? "sandbox";

  if (!clientId || !secret) {
    return { status: "not_configured" };
  }

  const baseUrl = PLAID_API_BASE_URLS[env] ?? PLAID_API_BASE_URLS.sandbox;
  const start = Date.now();

  try {
    const response = await fetch(`${baseUrl}/institutions/get`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: clientId,
        secret,
        count: 1,
        offset: 0,
        country_codes: ["US"],
      }),
      signal: AbortSignal.timeout(5000),
    });

    const latencyMs = Date.now() - start;

    if (response.ok) {
      return { status: "ok", latencyMs };
    }

    const text = await response.text().catch(() => "");
    return { status: "error", latencyMs, error: `HTTP ${response.status}: ${text.slice(0, 200)}` };
  } catch (err) {
    return {
      status: "error",
      latencyMs: Date.now() - start,
      error: err instanceof Error ? err.message : "Connection failed",
    };
  }
}
