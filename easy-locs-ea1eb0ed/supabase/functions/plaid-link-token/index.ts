import { requireRouterOrigin } from "../_shared/edge-function-consolidation.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { requireAuthenticatedUser } from "../_shared/edge-auth.ts";
import { arcjetProtect, shieldMiddleware, arcjetDenyResponse } from "../_shared/arcjet-shield.ts";
import { checkServerRateLimit, rateLimitResponse } from "../_shared/server-rate-limiter.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-trace-id, x-span-id, x-parent-span-id, x-request-id, traceparent",
};

const PLAID_API_BASE_URLS: Record<string, string> = {
  sandbox: "https://sandbox.plaid.com",
  development: "https://development.plaid.com",
  production: "https://production.plaid.com",
};

function getPlaidConfig() {
  const clientId = Deno.env.get("PLAID_CLIENT_ID");
  const secret = Deno.env.get("PLAID_SECRET");
  const env = Deno.env.get("PLAID_ENV") ?? "sandbox";
  if (!clientId || !secret) throw new Error("PLAID_CLIENT_ID and PLAID_SECRET must be configured");
  return { clientId, secret, baseUrl: PLAID_API_BASE_URLS[env] ?? PLAID_API_BASE_URLS.sandbox };
}

function getEncryptionKey(): string {
  const key = Deno.env.get("PLAID_ENCRYPTION_KEY");
  if (!key) throw new Error("PLAID_ENCRYPTION_KEY must be set for secure token storage");
  return key;
}

async function encryptToken(plaintext: string): Promise<string> {
  const encKey = getEncryptionKey();
  const encoder = new TextEncoder();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const keyData = encoder.encode(encKey.padEnd(32, "0").slice(0, 32));

  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "AES-GCM" },
    false,
    ["encrypt"]
  );

  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    cryptoKey,
    encoder.encode(plaintext)
  );

  const combined = new Uint8Array(iv.length + encrypted.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(encrypted), iv.length);

  return btoa(String.fromCharCode(...combined));
}

async function decryptToken(ciphertext: string): Promise<string> {
  const encKey = getEncryptionKey();
  const encoder = new TextEncoder();
  const raw = Uint8Array.from(atob(ciphertext), (c) => c.charCodeAt(0));

  const iv = raw.slice(0, 12);
  const data = raw.slice(12);

  const keyData = encoder.encode(encKey.padEnd(32, "0").slice(0, 32));
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "AES-GCM" },
    false,
    ["decrypt"]
  );

  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    cryptoKey,
    data
  );

  return new TextDecoder().decode(decrypted);
}

function jsonResponse(data: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const routerCheck = requireRouterOrigin(req);
  if (!routerCheck.allowed) return routerCheck.response!;
  const shieldResult = await arcjetProtect(req, shieldMiddleware("sensitive"));
  if (shieldResult.decision === "deny") return arcjetDenyResponse(shieldResult);

  const authCheck = await requireAuthenticatedUser(req);
  if (!authCheck.authorized) return authCheck.response!;

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const db = createClient(supabaseUrl, serviceRoleKey);

  try {
    const rlResult = await checkServerRateLimit(req, "plaid-link-token");
    if (!rlResult.allowed) return rateLimitResponse(rlResult);

    const body = await req.json().catch(() => ({}));
    const { action } = body;

    const { clientId, secret, baseUrl } = getPlaidConfig();

    if (!action || action === "create_link_token") {
      const webhookUrl = Deno.env.get("PLAID_WEBHOOK_URL")
        ?? `${Deno.env.get("SUPABASE_URL")}/functions/v1/plaid-webhook`;

      const response = await fetch(`${baseUrl}/link/token/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: clientId,
          secret,
          user: { client_user_id: authCheck.userId },
          client_name: "Easy-Locs",
          products: ["auth", "transactions", "identity"],
          country_codes: ["US", "FR", "GB", "DE", "ES", "IT", "NL", "BE"],
          language: body.language ?? "en",
          redirect_uri: body.redirectUri ?? undefined,
          webhook: webhookUrl,
        }),
      });

      if (!response.ok) {
        const err = await response.text();
        throw new Error(`Plaid link token creation failed [${response.status}]: ${err}`);
      }

      const data = await response.json();
      return jsonResponse({ linkToken: data.link_token, expiration: data.expiration });
    }

    if (action === "exchange_public_token") {
      const { publicToken } = body;
      if (!publicToken) {
        return jsonResponse({ error: "publicToken is required" }, 400);
      }

      const response = await fetch(`${baseUrl}/item/public_token/exchange`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ client_id: clientId, secret, public_token: publicToken }),
      });

      if (!response.ok) {
        const err = await response.text();
        throw new Error(`Plaid token exchange failed [${response.status}]: ${err}`);
      }

      const data = await response.json();

      const encryptedToken = await encryptToken(data.access_token);

      const { error: upsertError } = await db.from("plaid_items").upsert({
        user_id: authCheck.userId,
        item_id: data.item_id,
        access_token_encrypted: encryptedToken,
        created_at: new Date().toISOString(),
      }, { onConflict: "item_id" });

      if (upsertError) {
        console.error("[plaid] Failed to store access token:", upsertError.message);
        throw new Error("Failed to store bank connection");
      }

      return jsonResponse({ success: true, itemId: data.item_id });
    }

    if (action === "get_accounts") {
      const { itemId } = body;
      if (!itemId) {
        return jsonResponse({ error: "itemId is required" }, 400);
      }

      const { data: plaidItem, error: lookupError } = await db.from("plaid_items")
        .select("access_token_encrypted")
        .eq("item_id", itemId)
        .eq("user_id", authCheck.userId)
        .single();

      if (lookupError || !plaidItem) {
        return jsonResponse({ error: "Bank connection not found" }, 404);
      }

      const decryptedToken = await decryptToken(plaidItem.access_token_encrypted);

      const response = await fetch(`${baseUrl}/accounts/get`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: clientId,
          secret,
          access_token: decryptedToken,
        }),
      });

      if (!response.ok) {
        const err = await response.text();
        throw new Error(`Plaid accounts fetch failed [${response.status}]: ${err}`);
      }

      const data = await response.json();
      return jsonResponse({
        accounts: data.accounts?.map((a: Record<string, unknown>) => ({
          id: a.account_id,
          name: a.name,
          officialName: a.official_name,
          type: a.type,
          subtype: a.subtype,
          mask: a.mask,
          balances: {
            available: (a.balances as Record<string, unknown>)?.available,
            current: (a.balances as Record<string, unknown>)?.current,
            currency: (a.balances as Record<string, unknown>)?.iso_currency_code,
          },
        })) ?? [],
      });
    }

    if (action === "create_ach_transfer") {
      const { itemId, accountId, amount, description } = body;
      if (!itemId || !accountId || !amount) {
        return jsonResponse({ error: "itemId, accountId, and amount are required" }, 400);
      }

      const { data: plaidItem, error: lookupError } = await db.from("plaid_items")
        .select("access_token_encrypted")
        .eq("item_id", itemId)
        .eq("user_id", authCheck.userId)
        .single();

      if (lookupError || !plaidItem) {
        return jsonResponse({ error: "Bank connection not found" }, 404);
      }

      const decryptedToken = await decryptToken(plaidItem.access_token_encrypted);

      const response = await fetch(`${baseUrl}/transfer/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: clientId,
          secret,
          access_token: decryptedToken,
          account_id: accountId,
          type: "debit",
          network: "ach",
          amount: String(amount),
          description: description ?? "Easy-Locs wallet top-up",
          ach_class: "web",
          user: { legal_name: body.legalName ?? "User" },
        }),
      });

      if (!response.ok) {
        const err = await response.text();
        throw new Error(`Plaid ACH transfer failed [${response.status}]: ${err}`);
      }

      const data = await response.json();
      return jsonResponse({
        transferId: data.transfer?.id,
        status: data.transfer?.status,
        amount: data.transfer?.amount,
      });
    }

    return jsonResponse({ error: "Unknown action" }, 400);
  } catch (err) {
    console.error("[plaid-link-token]", err);
    return jsonResponse(
      { error: err instanceof Error ? err.message : "Unknown error" },
      500
    );
  }
});
