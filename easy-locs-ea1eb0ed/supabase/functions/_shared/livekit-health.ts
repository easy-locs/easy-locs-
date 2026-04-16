export interface LiveKitHealthResult {
  status: "ok" | "error" | "not_configured";
  latencyMs?: number;
  error?: string;
}

export async function checkLiveKitHealth(): Promise<LiveKitHealthResult> {
  const apiKey = Deno.env.get("LIVEKIT_API_KEY");
  const apiSecret = Deno.env.get("LIVEKIT_API_SECRET");
  const url = Deno.env.get("LIVEKIT_URL");

  if (!apiKey || !apiSecret || !url) {
    return { status: "not_configured" };
  }

  const start = Date.now();

  try {
    const now = Math.floor(Date.now() / 1000);
    const header = { alg: "HS256", typ: "JWT" };
    const payload = {
      iss: apiKey,
      sub: "health-check",
      nbf: now,
      exp: now + 30,
      iat: now,
      jti: crypto.randomUUID(),
      video: { roomList: true },
    };

    const encoder = new TextEncoder();
    const headerB64 = base64UrlEncode(encoder.encode(JSON.stringify(header)));
    const payloadB64 = base64UrlEncode(encoder.encode(JSON.stringify(payload)));
    const signingInput = `${headerB64}.${payloadB64}`;

    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(apiSecret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );
    const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(signingInput));
    const token = `${signingInput}.${base64UrlEncode(new Uint8Array(signature))}`;

    const response = await fetch(`${url}/twirp/livekit.RoomService/ListRooms`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({}),
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

function base64UrlEncode(data: Uint8Array): string {
  const base64 = btoa(String.fromCharCode(...data));
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
