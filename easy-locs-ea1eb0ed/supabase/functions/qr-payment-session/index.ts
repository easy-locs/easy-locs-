import { requireRouterOrigin } from "../_shared/edge-function-consolidation.ts";
/**
 * qr-payment-session — Secure QR payment flow.
 * 1. Creates a signed QR payment session with nonce + expiry
 * 2. Verifies scanned QR against session
 * 3. Creates payment intent via canonical Stripe path
 * 4. Updates session status
 * 
 * Endpoints:
 *   POST /create  — Create new QR session (merchant/terminal)
 *   POST /verify  — Verify scanned QR + create payment intent
 *   POST /status  — Check session status
 */
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { checkServerRateLimit, rateLimitResponse } from "../_shared/server-rate-limiter.ts";
import { withEdgeLogging } from "../_shared/with-logging.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version, x-trace-id, x-span-id, x-parent-span-id, x-request-id, traceparent",
};

function generateNonce(): string {
  const arr = new Uint8Array(16);
  crypto.getRandomValues(arr);
  return Array.from(arr).map(b => b.toString(16).padStart(2, "0")).join("");
}

async function signPayload(payload: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", encoder.encode(payload), key);
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(withEdgeLogging("qr-payment-session", async (req, logger) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const routerCheck = requireRouterOrigin(req);
  if (!routerCheck.allowed) return routerCheck.response!;
  const rlResult = await checkServerRateLimit(req, "qr-payment-session", { maxRequests: 10, windowSeconds: 60 });
  if (!rlResult.allowed) return rateLimitResponse(rlResult);

  const supabase = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");
  const body = await req.json();
  const action = body.action || "create";

  try {
    // ─── CREATE QR SESSION ───
    if (action === "create") {
      const { merchant_id, store_id, terminal_id, table_id, order_id, amount, currency, items_description } = body;
      if (!merchant_id || !amount) {
        return new Response(JSON.stringify({ error: "merchant_id and amount required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const nonce = generateNonce();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 min expiry
      const sessionId = crypto.randomUUID();

      // Sign the session
      const signingSecret = Deno.env.get("QR_SIGNING_SECRET") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
      const payloadStr = `${sessionId}:${merchant_id}:${amount}:${currency || "AED"}:${nonce}`;
      const signature = await signPayload(payloadStr, signingSecret);

      // Store session
      const { error: insertError } = await supabase.from("qr_payment_sessions").insert({
        id: sessionId,
        merchant_id,
        store_id: store_id || null,
        terminal_id: terminal_id || null,
        table_id: table_id || null,
        order_id: order_id || null,
        amount,
        currency: currency || "AED",
        nonce,
        signature,
        expires_at: expiresAt,
        status: "pending",
        items_description: items_description || null,
      });

      if (insertError) throw new Error(`Session creation failed: ${insertError.message}`);

      // Build QR payload
      const qrPayload = btoa(JSON.stringify({
        v: 2,
        sid: sessionId,
        m: merchant_id,
        a: amount,
        c: currency || "AED",
        n: nonce,
        sig: signature,
        exp: expiresAt,
        ctx: { store_id, terminal_id, table_id, order_id },
      }));

      return new Response(JSON.stringify({ session_id: sessionId, qr_payload: qrPayload, expires_at: expiresAt }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── VERIFY + PAY ───
    if (action === "verify") {
      const { qr_payload, payer_user_id } = body;
      if (!qr_payload || !payer_user_id) {
        return new Response(JSON.stringify({ error: "qr_payload and payer_user_id required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Decode
      let decoded: any;
      try { decoded = JSON.parse(atob(qr_payload)); } catch { 
        return new Response(JSON.stringify({ error: "Invalid QR payload" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Check expiry
      if (new Date(decoded.exp) < new Date()) {
        return new Response(JSON.stringify({ error: "QR code has expired" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Verify signature
      const signingSecret = Deno.env.get("QR_SIGNING_SECRET") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
      const payloadStr = `${decoded.sid}:${decoded.m}:${decoded.a}:${decoded.c}:${decoded.n}`;
      const expectedSig = await signPayload(payloadStr, signingSecret);
      if (decoded.sig !== expectedSig) {
        return new Response(JSON.stringify({ error: "Invalid QR signature" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Check session in DB
      const { data: session, error: sessionError } = await supabase
        .from("qr_payment_sessions")
        .select("*")
        .eq("id", decoded.sid)
        .eq("nonce", decoded.n)
        .single();

      if (sessionError || !session) {
        return new Response(JSON.stringify({ error: "Session not found or already used" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (session.status !== "pending") {
        return new Response(JSON.stringify({ error: `Session already ${session.status}` }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Create Stripe PaymentIntent via canonical path
      const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
      if (!stripeKey) throw new Error("STRIPE_SECRET_KEY not configured");
      const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

      const intent = await stripe.paymentIntents.create({
        amount: Math.round(session.amount * 100),
        currency: session.currency.toLowerCase(),
        metadata: {
          qr_session_id: session.id,
          merchant_id: session.merchant_id,
          store_id: session.store_id || "",
          terminal_id: session.terminal_id || "",
          table_id: session.table_id || "",
          order_id: session.order_id || "",
          payer_user_id,
          payment_source: "qr_scan",
        },
      });

      // Update session to "scanned"
      await supabase.from("qr_payment_sessions").update({
        status: "scanned",
        scanned_by: payer_user_id,
        scanned_at: new Date().toISOString(),
        stripe_payment_intent_id: intent.id,
      }).eq("id", session.id);

      // Record in transaction_intents
      await supabase.from("transaction_intents").insert({
        user_id: payer_user_id,
        intent_type: "qr_payment",
        amount: session.amount,
        currency: session.currency,
        status: "created",
        stripe_payment_intent_id: intent.id,
        metadata_json: {
          qr_session_id: session.id,
          merchant_id: session.merchant_id,
          store_id: session.store_id,
        },
      });

      return new Response(JSON.stringify({
        client_secret: intent.client_secret,
        payment_intent_id: intent.id,
        session: {
          id: session.id,
          amount: session.amount,
          currency: session.currency,
          merchant_id: session.merchant_id,
          items_description: session.items_description,
        },
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── STATUS CHECK ───
    if (action === "status") {
      const { session_id } = body;
      const { data: session } = await supabase.from("qr_payment_sessions").select("id, status, amount, currency, merchant_id").eq("id", session_id).single();
      return new Response(JSON.stringify({ session: session || null }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("qr-payment-session error:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
}));
