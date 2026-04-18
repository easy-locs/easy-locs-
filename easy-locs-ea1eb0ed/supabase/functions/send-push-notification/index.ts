import { requireRouterOrigin } from "../_shared/edge-function-consolidation.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { requireServiceRole } from "../_shared/edge-auth.ts";
import { checkServerRateLimit, rateLimitResponse } from "../_shared/server-rate-limiter.ts";
import { withEdgeLogging } from "../_shared/with-logging.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-trace-id, x-span-id, x-parent-span-id, x-request-id, traceparent",
};

interface PushPayload {
  user_id?: string;
  user_ids?: string[];
  title: string;
  body: string;
  data?: Record<string, string>;
  event_type?: string;
}

let cachedAccessToken: { token: string; expiresAt: number } | null = null;

function base64url(input: string): string {
  return btoa(input).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64urlFromBytes(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function getAccessToken(serviceAccountJson: string): Promise<string> {
  if (cachedAccessToken && Date.now() < cachedAccessToken.expiresAt - 60_000) {
    return cachedAccessToken.token;
  }

  const sa = JSON.parse(serviceAccountJson);
  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = base64url(JSON.stringify({
    iss: sa.client_email,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  }));

  const encoder = new TextEncoder();
  const pemContent = sa.private_key
    .replace("-----BEGIN PRIVATE KEY-----", "")
    .replace("-----END PRIVATE KEY-----", "")
    .replace(/\n/g, "");
  const binaryKey = Uint8Array.from(atob(pemContent), (c) => c.charCodeAt(0));

  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    binaryKey,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signingInput = encoder.encode(`${header}.${payload}`);
  const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", cryptoKey, signingInput);
  const sig = base64urlFromBytes(new Uint8Array(signature));

  const jwt = `${header}.${payload}.${sig}`;

  const resp = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });

  if (!resp.ok) {
    throw new Error(`OAuth token exchange failed: ${resp.status} ${await resp.text()}`);
  }

  const tokenData = await resp.json();
  cachedAccessToken = {
    token: tokenData.access_token,
    expiresAt: Date.now() + (tokenData.expires_in ?? 3600) * 1000,
  };
  return cachedAccessToken.token;
}

async function sendFcmV1Message(
  token: string,
  title: string,
  body: string,
  data: Record<string, string>,
  projectId: string,
  accessToken: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const resp = await fetch(
      `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: {
            token,
            notification: { title, body },
            data,
            android: { priority: "high" },
            webpush: { headers: { Urgency: "high" } },
          },
        }),
      }
    );

    if (!resp.ok) {
      const errBody = await resp.text();
      const isInvalidToken = errBody.includes("UNREGISTERED") ||
        errBody.includes("INVALID_ARGUMENT") ||
        errBody.includes("NOT_FOUND");
      return { success: false, error: isInvalidToken ? "UNREGISTERED" : `FCM v1 ${resp.status}: ${errBody.slice(0, 200)}` };
    }

    return { success: true };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : String(e) };
  }
}

Deno.serve(withEdgeLogging("send-push-notification", async (req, logger) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const routerCheck = requireRouterOrigin(req);
  if (!routerCheck.allowed) return routerCheck.response!;
  const authCheck = requireServiceRole(req);
  if (!authCheck.authorized) return authCheck.response!;
  logger.info("push_notification_started", { method: req.method });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const fcmServiceAccount = Deno.env.get("FCM_SERVICE_ACCOUNT_JSON") ?? "";
  const fcmProjectId = Deno.env.get("FCM_PROJECT_ID") ?? "";
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const rlResult = await checkServerRateLimit(req, "send-push-notification");
    if (!rlResult.allowed) return rateLimitResponse(rlResult);

    const payload: PushPayload = await req.json();
    const { title, body, data = {}, event_type } = payload;
    const effectiveEventType = event_type ?? data.event_type ?? "general";

    if (!title || !body) {
      return new Response(
        JSON.stringify({ error: "title and body are required" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    const userIds: string[] = [];
    if (payload.user_id) userIds.push(payload.user_id);
    if (payload.user_ids) userIds.push(...payload.user_ids);

    if (userIds.length === 0) {
      return new Response(
        JSON.stringify({ error: "user_id or user_ids required" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    if (!fcmServiceAccount || !fcmProjectId) {
      console.error("[push] FCM_SERVICE_ACCOUNT_JSON or FCM_PROJECT_ID not configured");
      return new Response(
        JSON.stringify({ error: "FCM not configured", sent: 0, failed: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 503 }
      );
    }

    let accessToken: string;
    try {
      accessToken = await getAccessToken(fcmServiceAccount);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error("[push] Failed to obtain FCM access token:", msg);
      return new Response(
        JSON.stringify({ error: `FCM auth failed: ${msg}`, sent: 0, failed: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 503 }
      );
    }

    const { data: tokens } = await supabase
      .from("push_tokens")
      .select("id, token, platform, user_id")
      .in("user_id", userIds)
      .eq("is_active", true);

    let sent = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const tokenRecord of tokens ?? []) {
      const result = await sendFcmV1Message(
        tokenRecord.token, title, body,
        { ...data, event_type: effectiveEventType }, fcmProjectId, accessToken
      );

      if (result.success) {
        sent++;
      } else {
        failed++;
        errors.push(`${tokenRecord.token.substring(0, 10)}...: ${result.error}`);

        if (result.error === "UNREGISTERED") {
          await supabase
            .from("push_tokens")
            .update({ is_active: false, updated_at: new Date().toISOString() })
            .eq("id", tokenRecord.id);
        }
      }
    }

    await supabase.rpc("update_autonomy_status", {
      p_system_name: "push_notifications",
      p_status: failed === 0 ? "green" : failed < sent ? "yellow" : "red",
      p_error_message: errors.length > 0 ? errors[0] : null,
    }).catch((e: unknown) => {
      console.error("[push] autonomy status update failed:", e);
    });

    return new Response(
      JSON.stringify({ sent, failed, total_tokens: tokens?.length ?? 0, errors: errors.slice(0, 5) }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return new Response(
      JSON.stringify({ error: msg }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
}));
