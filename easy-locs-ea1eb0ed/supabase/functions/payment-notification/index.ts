import { requireRouterOrigin } from "../_shared/edge-function-consolidation.ts";
import { getCorsHeaders } from "../_shared/cors.ts";
import { requireAuthenticatedUser } from "../_shared/edge-auth.ts";
/**
 * payment-notification — Bank-style transaction notifications with payment location.
 * Called after successful payment webhook to create rich user notifications.
 *
 * POST body:
 *   { user_id, amount, currency, merchant_name, payment_type, location?, payment_intent_id }
 */
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { withEdgeLogging } from "../_shared/with-logging.ts";

Deno.serve(withEdgeLogging("payment-notification", async (req, logger) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: getCorsHeaders(req) });
  }

  const routerCheck = requireRouterOrigin(req);
  if (!routerCheck.allowed) return routerCheck.response!;

  const authResult = await requireAuthenticatedUser(req);
  if (!authResult.authorized) return authResult.response!;
  const callerUserId = authResult.userId;

  const supabase = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");

  try {
    const {
      user_id,
      amount,
      currency = "AED",
      merchant_name,
      payment_type = "payment",
      location,
      payment_intent_id,
      order_id,
    } = await req.json();

    if (!user_id || !amount) {
      return new Response(JSON.stringify({ error: "user_id and amount required" }), {
        status: 400, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      });
    }

    // Ensure the authenticated caller can only create notifications for themselves
    // (service_role callers – e.g. other edge functions – are exempt from this check)
    if (callerUserId !== "service_role" && callerUserId !== user_id) {
      return new Response(JSON.stringify({ error: "Forbidden: cannot create notifications for another user" }), {
        status: 403, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      });
    }

    const formattedAmount = `${Number(amount).toFixed(2)} ${currency}`;

    const typeLabels: Record<string, string> = {
      payment: "Payment Completed",
      topup: "Wallet Top Up",
      transfer: "Money Sent",
      receive: "Money Received",
      qr_payment: "QR Payment",
      refund: "Refund Processed",
    };

    const title = typeLabels[payment_type] || "Transaction Update";

    let body = `${formattedAmount}`;
    if (merchant_name) body += ` at ${merchant_name}`;
    if (location?.city) body += ` · ${location.city}`;
    if (location?.country) body += `, ${location.country}`;

    const now = new Date();
    const timeStr = now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
    body += ` · ${timeStr}`;

    const { error: notifError } = await supabase.from("notifications").insert({
      id: crypto.randomUUID(),
      user_id,
      title,
      body,
      type: "wallet_" + payment_type,
      read: false,
      metadata_json: {
        amount,
        currency,
        merchant_name: merchant_name || null,
        payment_type,
        payment_intent_id: payment_intent_id || null,
        order_id: order_id || null,
        location: location || null,
        timestamp: now.toISOString(),
      },
    });

    if (notifError) {
      logger.error("notification_insert_failed", { error: notifError });
    }

    await supabase.from("payment_provider_events").insert({
      provider: "internal",
      event_type: "notification_sent",
      event_id: crypto.randomUUID(),
      payment_intent_id: payment_intent_id || null,
      payload_json: {
        user_id,
        title,
        body,
        payment_type,
        amount,
        currency,
      },
    });

    logger.info("payment_notification_sent", { user_id, payment_type, currency });
    return new Response(JSON.stringify({ success: true, title, body }), {
      headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    logger.error("payment_notification_error", { error: message });
    return new Response(JSON.stringify({ error: message }), {
      status: 500, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
    });
  }
}));
