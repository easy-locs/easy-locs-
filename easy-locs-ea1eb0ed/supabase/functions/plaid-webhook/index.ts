import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { importJWK, jwtVerify, decodeProtectedHeader } from "npm:jose@5.9.6";
import { createEdgeLogger } from "../_shared/structured-logger.ts";
import { rejectQuerySecrets } from "../_shared/reject-query-secrets.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, plaid-verification, x-trace-id, x-span-id, x-parent-span-id, x-request-id, traceparent",
};

const logger = createEdgeLogger("plaid-webhook");

const PLAID_API_BASE_URLS: Record<string, string> = {
  sandbox: "https://sandbox.plaid.com",
  development: "https://development.plaid.com",
  production: "https://production.plaid.com",
};

function getPlaidConfig() {
  const clientId = Deno.env.get("PLAID_CLIENT_ID");
  const secret = Deno.env.get("PLAID_SECRET");
  const env = Deno.env.get("PLAID_ENV") ?? "sandbox";
  if (!clientId || !secret)
    throw new Error("PLAID_CLIENT_ID and PLAID_SECRET must be configured");
  return {
    clientId,
    secret,
    env,
    baseUrl: PLAID_API_BASE_URLS[env] ?? PLAID_API_BASE_URLS.sandbox,
  };
}

function getEncryptionKey(): string {
  const key = Deno.env.get("PLAID_ENCRYPTION_KEY");
  if (!key)
    throw new Error("PLAID_ENCRYPTION_KEY must be set for secure token storage");
  return key;
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
    ["decrypt"],
  );
  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    cryptoKey,
    data,
  );
  return new TextDecoder().decode(decrypted);
}

function jsonResponse(data: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function verifyPlaidWebhook(
  body: string,
  verificationHeader: string,
  plaidConfig: { clientId: string; secret: string; baseUrl: string },
): Promise<boolean> {
  try {
    const header = decodeProtectedHeader(verificationHeader);
    const kid = header.kid;
    const alg = header.alg;
    if (!kid || alg !== "ES256") {
      logger.warn("Missing kid or unsupported algorithm", {
        meta: { kid, alg },
      });
      return false;
    }

    const jwkResponse = await fetch(
      `${plaidConfig.baseUrl}/webhook_verification_key/get`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: plaidConfig.clientId,
          secret: plaidConfig.secret,
          key_id: kid,
        }),
      },
    );

    if (!jwkResponse.ok) {
      logger.error("Failed to fetch Plaid webhook verification key", {
        meta: { status: jwkResponse.status },
      });
      return false;
    }

    const jwkData = await jwkResponse.json();
    const jwk = jwkData.key;
    if (!jwk) {
      logger.error("No key returned from Plaid verification endpoint");
      return false;
    }

    const key = await importJWK(jwk, "ES256");

    const { payload } = await jwtVerify(verificationHeader, key, {
      algorithms: ["ES256"],
      maxTokenAge: "5m",
    });

    const bodyHash = (payload as Record<string, unknown>).request_body_sha256;
    if (bodyHash) {
      const digest = await crypto.subtle.digest(
        "SHA-256",
        new TextEncoder().encode(body),
      );
      const hexHash = Array.from(new Uint8Array(digest))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
      if (hexHash !== bodyHash) {
        logger.warn("Request body SHA-256 mismatch");
        return false;
      }
    }

    return true;
  } catch (err) {
    logger.error("Webhook verification error", {
      error: err as Error,
    });
    return false;
  }
}

interface PlaidWebhookBody {
  webhook_type: string;
  webhook_code: string;
  item_id: string;
  error?: {
    error_type: string;
    error_code: string;
    error_message: string;
    display_message: string | null;
  };
  new_transactions?: number;
  removed_transactions?: string[];
  consent_expiration_time?: string;
  account_ids_with_new_auth?: string[];
  [key: string]: unknown;
}

async function handleItemError(
  db: ReturnType<typeof createClient>,
  webhook: PlaidWebhookBody,
) {
  const { item_id, error } = webhook;
  logger.info("Processing ITEM error", {
    meta: {
      itemId: item_id,
      errorCode: error?.error_code,
      errorType: error?.error_type,
    },
  });

  const { error: updateError } = await db
    .from("plaid_items")
    .update({
      status: "error",
      error_code: error?.error_code ?? null,
      error_message: error?.error_message ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("item_id", item_id);

  if (updateError) {
    logger.error("Failed to update plaid_items status", {
      error: updateError as unknown as Error,
      meta: { itemId: item_id },
    });
    throw new Error(`Failed to update plaid_items status for ${item_id}: ${updateError.message}`);
  }

  logger.info("Marked plaid item as error", { meta: { itemId: item_id } });
}

async function handleItemPendingExpiration(
  db: ReturnType<typeof createClient>,
  webhook: PlaidWebhookBody,
) {
  const { item_id, consent_expiration_time } = webhook;
  logger.info("Processing ITEM pending expiration", {
    meta: { itemId: item_id, expiresAt: consent_expiration_time },
  });

  const { error: updateError } = await db
    .from("plaid_items")
    .update({
      status: "pending_expiration",
      consent_expires_at: consent_expiration_time ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("item_id", item_id);

  if (updateError) {
    logger.error("Failed to update pending expiration", {
      error: updateError as unknown as Error,
      meta: { itemId: item_id },
    });
    throw new Error(`Failed to update pending expiration for ${item_id}: ${updateError.message}`);
  }
}

async function handleTransactionsSync(
  db: ReturnType<typeof createClient>,
  webhook: PlaidWebhookBody,
  plaidConfig: { clientId: string; secret: string; baseUrl: string },
) {
  const { item_id } = webhook;
  logger.info("Processing TRANSACTIONS sync", {
    meta: { itemId: item_id },
  });

  const { data: plaidItem, error: lookupError } = await db
    .from("plaid_items")
    .select("access_token_encrypted, user_id")
    .eq("item_id", item_id)
    .single();

  if (lookupError || !plaidItem) {
    logger.warn("Plaid item not found for transaction sync", {
      meta: { itemId: item_id },
    });
    throw new Error(`Plaid item not found for transaction sync: ${item_id}`);
  }

  const decryptedToken = await decryptToken(
    plaidItem.access_token_encrypted,
  );

  const balanceResponse = await fetch(
    `${plaidConfig.baseUrl}/accounts/get`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: plaidConfig.clientId,
        secret: plaidConfig.secret,
        access_token: decryptedToken,
      }),
    },
  );

  if (!balanceResponse.ok) {
    const errText = await balanceResponse.text();
    logger.error("Balance refresh failed", {
      meta: { itemId: item_id, status: balanceResponse.status, error: errText },
    });
    throw new Error(`Balance refresh failed for ${item_id}: ${balanceResponse.status}`);
  }

  const balanceData = await balanceResponse.json();
  const accounts = balanceData.accounts ?? [];

  const balanceSummary = accounts.map(
    (a: Record<string, unknown>) => ({
      account_id: a.account_id,
      name: a.name,
      available: (a.balances as Record<string, unknown>)?.available,
      current: (a.balances as Record<string, unknown>)?.current,
      currency: (a.balances as Record<string, unknown>)?.iso_currency_code,
    }),
  );

  const { error: statusError } = await db
    .from("plaid_items")
    .update({
      status: "good",
      last_balance_refresh: new Date().toISOString(),
      cached_balances: balanceSummary,
      updated_at: new Date().toISOString(),
    })
    .eq("item_id", item_id);

  if (statusError) {
    logger.error("Failed to update cached balances", {
      error: statusError as unknown as Error,
      meta: { itemId: item_id },
    });
    throw new Error(`Failed to update cached balances for ${item_id}: ${statusError.message}`);
  }

  logger.info("Balance refresh completed", {
    meta: { itemId: item_id, accountCount: accounts.length },
  });
}

async function handleAuthUpdate(
  db: ReturnType<typeof createClient>,
  webhook: PlaidWebhookBody,
) {
  const { item_id, account_ids_with_new_auth } = webhook;
  logger.info("Processing AUTH update", {
    meta: {
      itemId: item_id,
      accountIds: account_ids_with_new_auth,
    },
  });

  const { error: updateError } = await db
    .from("plaid_items")
    .update({
      status: "good",
      last_auth_update: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("item_id", item_id);

  if (updateError) {
    logger.error("Failed to update auth timestamp", {
      error: updateError as unknown as Error,
      meta: { itemId: item_id },
    });
    throw new Error(`Failed to update auth timestamp for ${item_id}: ${updateError.message}`);
  }
}

async function logWebhookEvent(
  db: ReturnType<typeof createClient>,
  webhook: PlaidWebhookBody,
  status: "processed" | "skipped" | "error",
  idempotencyKey: string,
  errorDetail?: string,
) {
  try {
    await db.from("plaid_webhook_events").insert({
      item_id: webhook.item_id,
      webhook_type: webhook.webhook_type,
      webhook_code: webhook.webhook_code,
      status,
      idempotency_key: idempotencyKey,
      error_detail: errorDetail ?? null,
      payload_json: webhook,
      created_at: new Date().toISOString(),
    });
  } catch {
    logger.warn("Failed to log webhook event (table may not exist yet)");
  }
}

Deno.serve(async (req) => {
  const qsCheck = rejectQuerySecrets(req, corsHeaders);
  if (qsCheck.rejected) return qsCheck.response!;

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const db = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  let body: string;
  let webhook: PlaidWebhookBody;

  try {
    body = await req.text();
    webhook = JSON.parse(body);
  } catch {
    logger.warn("Invalid JSON body");
    return jsonResponse({ error: "Invalid request body" }, 400);
  }

  if (!webhook.webhook_type || !webhook.item_id) {
    logger.warn("Missing required webhook fields", {
      meta: {
        hasType: !!webhook.webhook_type,
        hasItemId: !!webhook.item_id,
      },
    });
    return jsonResponse({ error: "Missing webhook_type or item_id" }, 400);
  }

  let plaidConfig: ReturnType<typeof getPlaidConfig>;
  try {
    plaidConfig = getPlaidConfig();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error("Plaid configuration error", { error: err as Error });
    return jsonResponse({ error: msg }, 500);
  }

  const verificationHeader = req.headers.get("plaid-verification");
  if (verificationHeader) {
    const isValid = await verifyPlaidWebhook(body, verificationHeader, plaidConfig);
    if (!isValid) {
      logger.warn("Webhook verification failed", {
        meta: { webhookType: webhook.webhook_type, itemId: webhook.item_id },
      });
      return jsonResponse({ error: "Webhook verification failed" }, 401);
    }
    logger.info("Webhook signature verified");
  } else if (plaidConfig.env === "production") {
    logger.error("Missing plaid-verification header in production");
    return jsonResponse(
      { error: "Missing verification header" },
      401,
    );
  } else {
    logger.warn("No plaid-verification header (non-production, proceeding)");
  }

  logger.info("Webhook received", {
    meta: {
      webhookType: webhook.webhook_type,
      webhookCode: webhook.webhook_code,
      itemId: webhook.item_id,
    },
  });

  const idempotencyDigest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(body),
  );
  const idempotencyKey = Array.from(new Uint8Array(idempotencyDigest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  try {
    const { data: existing } = await db
      .from("plaid_webhook_events")
      .select("id")
      .eq("idempotency_key", idempotencyKey)
      .maybeSingle();

    if (existing) {
      logger.info("Duplicate webhook skipped", {
        meta: { idempotencyKey, itemId: webhook.item_id },
      });
      await logWebhookEvent(db, webhook, "skipped", idempotencyKey);
      return jsonResponse({ received: true, duplicate: true });
    }
  } catch {
    logger.warn("Idempotency check failed (table may not exist), proceeding");
  }

  try {
    switch (webhook.webhook_type) {
      case "ITEM": {
        switch (webhook.webhook_code) {
          case "ERROR":
            await handleItemError(db, webhook);
            break;
          case "PENDING_EXPIRATION":
            await handleItemPendingExpiration(db, webhook);
            break;
          case "USER_PERMISSION_REVOKED": {
            logger.info("User permission revoked", {
              meta: { itemId: webhook.item_id },
            });
            const { error: revokeError } = await db
              .from("plaid_items")
              .update({
                status: "revoked",
                updated_at: new Date().toISOString(),
              })
              .eq("item_id", webhook.item_id);
            if (revokeError) {
              logger.error("Failed to update revoked status", {
                error: revokeError as unknown as Error,
                meta: { itemId: webhook.item_id },
              });
              throw new Error(`Failed to update revoked status for ${webhook.item_id}: ${revokeError.message}`);
            }
            break;
          }
          default:
            logger.info("Unhandled ITEM webhook code", {
              meta: { code: webhook.webhook_code },
            });
        }
        break;
      }

      case "TRANSACTIONS": {
        switch (webhook.webhook_code) {
          case "SYNC_UPDATES_AVAILABLE":
          case "DEFAULT_UPDATE":
          case "INITIAL_UPDATE":
          case "HISTORICAL_UPDATE":
            await handleTransactionsSync(db, webhook, plaidConfig);
            break;
          case "TRANSACTIONS_REMOVED":
            logger.info("Transactions removed notification", {
              meta: {
                itemId: webhook.item_id,
                removedCount: webhook.removed_transactions?.length ?? 0,
              },
            });
            break;
          default:
            logger.info("Unhandled TRANSACTIONS webhook code", {
              meta: { code: webhook.webhook_code },
            });
        }
        break;
      }

      case "AUTH": {
        switch (webhook.webhook_code) {
          case "AUTOMATICALLY_VERIFIED":
          case "VERIFICATION_EXPIRED":
            await handleAuthUpdate(db, webhook);
            break;
          default:
            logger.info("Unhandled AUTH webhook code", {
              meta: { code: webhook.webhook_code },
            });
        }
        break;
      }

      default:
        logger.info("Unhandled webhook type", {
          meta: { type: webhook.webhook_type },
        });
    }

    await logWebhookEvent(db, webhook, "processed", idempotencyKey);

    return jsonResponse({ received: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error("Error processing webhook", {
      error: err as Error,
      meta: {
        webhookType: webhook.webhook_type,
        webhookCode: webhook.webhook_code,
        itemId: webhook.item_id,
      },
    });

    await logWebhookEvent(db, webhook, "error", idempotencyKey, msg);

    return jsonResponse({ error: msg }, 500);
  }
});
