/**
 * orbit-payment — Server-side payment processing for Orbit
 * - Server-side QR signing with real HMAC secret
 * - Atomic LOCS transfers via DB RPC
 * - Stripe 3DS fiat payments
 * - Anti-replay nonce persistence
 * - Full audit trail
 */
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/** Server-side HMAC signing key — derived from service role key (never exposed to client) */
function getSigningKey(): string {
  return `orbit-qr-sign-${(Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "").slice(-16)}`;
}

/** Sign a dynamic QR payload server-side */
async function signQRPayload(payload: Record<string, any>): Promise<string> {
  const data = [
    "dynamic",
    payload.recipient_user_id,
    payload.amount.toString(),
    payload.currency,
    payload.nonce,
    payload.expires_at,
  ].join("|");

  const encoder = new TextEncoder();
  const keyData = encoder.encode(getSigningKey());
  const key = await crypto.subtle.importKey("raw", keyData, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(data));
  return Array.from(new Uint8Array(sig), (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Verify a dynamic QR payload server-side */
async function verifyQRSignature(payload: Record<string, any>): Promise<boolean> {
  const expected = await signQRPayload(payload);
  return expected === payload.signature;
}

/** Generate cryptographic nonce */
function generateNonce(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, (b) => b.toString(16).padStart(2, "0")).join("");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    // Auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData.user) throw new Error("Not authenticated");
    const user = userData.user;

    const body = await req.json();
    const { action } = body;

    // ─── ACTION: generate_qr ─── Server-side QR generation & signing
    if (action === "generate_qr") {
      const { qr_type, recipient_type, amount, currency, locs_equivalent, reference_type, reference_id, description, expires_in_minutes, org_id } = body;

      // Get user profile name
      const { data: profile } = await supabase
        .from("profiles")
        .select("name, first_name, last_name, email")
        .eq("id", user.id)
        .maybeSingle();

      const userName = profile?.name
        || (profile?.first_name ? `${profile.first_name} ${profile.last_name || ""}`.trim() : null)
        || profile?.email
        || user.email
        || "User";

      if (qr_type === "static") {
        const payload = {
          qr_type: "static",
          version: 1,
          recipient_user_id: user.id,
          recipient_name: userName,
          recipient_type: recipient_type || "user",
          org_id: org_id || null,
          created_at: new Date().toISOString(),
        };

        return new Response(JSON.stringify({ payload, encoded: btoa(JSON.stringify(payload)) }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Dynamic QR — server-signed
      const nonce = generateNonce();
      const expiresAt = new Date(Date.now() + (expires_in_minutes || 30) * 60 * 1000).toISOString();

      const base = {
        qr_type: "dynamic",
        version: 1,
        recipient_user_id: user.id,
        recipient_name: userName,
        amount: amount || 0,
        currency: currency || "EUR",
        locs_equivalent: locs_equivalent || null,
        reference_type: reference_type || null,
        reference_id: reference_id || null,
        description: description || null,
        expires_at: expiresAt,
        nonce,
      };

      const signature = await signQRPayload(base);
      const payload = { ...base, signature };

      return new Response(JSON.stringify({ payload, encoded: btoa(JSON.stringify(payload)) }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── ACTION: validate_qr ───
    if (action === "validate_qr") {
      const { payload } = body;
      if (!payload || !payload.qr_type) {
        return new Response(JSON.stringify({ valid: false, error: "Invalid QR payload" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (payload.qr_type === "dynamic") {
        // Check expiration
        if (new Date(payload.expires_at) < new Date()) {
          return new Response(JSON.stringify({ valid: false, error: "QR code expired" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Verify server-side signature
        const sigValid = await verifyQRSignature(payload);
        if (!sigValid) {
          return new Response(JSON.stringify({ valid: false, error: "Invalid signature — QR may be tampered" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Anti-replay: check nonce in persistent store
        const { data: existingNonce } = await supabase
          .from("payment_nonces")
          .select("nonce")
          .eq("nonce", payload.nonce)
          .maybeSingle();

        if (existingNonce) {
          return new Response(JSON.stringify({ valid: false, error: "QR code already used" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }

      // Verify recipient exists
      const { data: recipient } = await supabase
        .from("profiles")
        .select("id, name, email")
        .eq("id", payload.recipient_user_id)
        .maybeSingle();

      return new Response(JSON.stringify({
        valid: true,
        recipient: recipient ? { id: recipient.id, name: recipient.name || recipient.email } : null,
        payload,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── ACTION: pay_locs ─── Uses atomic DB RPC with integrity checks
    if (action === "pay_locs") {
      const { recipient_user_id, amount, description, thread_id, context, qr_nonce } = body;

      if (!recipient_user_id || !amount || amount <= 0) {
        return new Response(JSON.stringify({ error: "Invalid payment parameters" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Anti-tampering: validate amount is a safe number
      if (!Number.isFinite(amount) || amount > 1_000_000) {
        return new Response(JSON.stringify({ error: "Amount out of bounds" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Validate recipient exists before transfer
      const { data: recipientProfile } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", recipient_user_id)
        .maybeSingle();
      if (!recipientProfile) {
        return new Response(JSON.stringify({ error: "Recipient not found" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Build metadata with integrity hash
      const metadata: Record<string, any> = {
        initiated_at: new Date().toISOString(),
        client_fingerprint: req.headers.get("user-agent")?.slice(0, 64) || "unknown",
      };
      if (qr_nonce) metadata.qr_nonce = qr_nonce;
      if (context) {
        metadata.context_type = context.type;
        metadata.context_id = context.id;
        metadata.context_label = context.label;
      }

      // Sign transaction metadata for audit integrity
      const txIntegrityData = `${user.id}|${recipient_user_id}|${amount}|LOCS|${Date.now()}`;
      const encoder = new TextEncoder();
      const keyData = encoder.encode(getSigningKey());
      const integrityKey = await crypto.subtle.importKey("raw", keyData, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
      const integritySignature = await crypto.subtle.sign("HMAC", integrityKey, encoder.encode(txIntegrityData));
      metadata.integrity_hash = Array.from(new Uint8Array(integritySignature), (b) => b.toString(16).padStart(2, "0")).join("").slice(0, 32);

      // Call atomic RPC — handles locking, balance check, debit, credit, nonce, audit
      const { data: result, error: rpcError } = await supabase.rpc("transfer_locs", {
        _sender_id: user.id,
        _recipient_id: recipient_user_id,
        _amount: amount,
        _description: description || "LOCS Transfer",
        _thread_id: thread_id || null,
        _reference_type: context?.type || null,
        _reference_id: context?.id || null,
        _qr_nonce: qr_nonce || null,
        _metadata: metadata,
      });

      if (rpcError) {
        console.error("[orbit-payment] RPC error:", rpcError);
        return new Response(JSON.stringify({ error: rpcError.message }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (result && !result.success) {
        return new Response(JSON.stringify({ error: result.error }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ success: true, ...result }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── ACTION: pay_fiat ─── Stripe checkout with 3DS
    if (action === "pay_fiat") {
      const { recipient_user_id, recipient_name, amount, currency = "EUR", description, thread_id, context } = body;

      if (!amount || amount < 1) {
        return new Response(JSON.stringify({ error: "Minimum payment is 1 EUR equivalent" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", { apiVersion: "2025-08-27.basil" });

      const customers = await stripe.customers.list({ email: user.email!, limit: 1 });
      const customerId = customers.data.length > 0 ? customers.data[0].id : undefined;
      const amountInCents = Math.round(amount * 100);

      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        customer_email: customerId ? undefined : user.email!,
        line_items: [{
          price_data: {
            currency: currency.toLowerCase(),
            product_data: {
              name: `Payment to ${recipient_name || "recipient"}`,
              description: description || "Orbit Payment",
            },
            unit_amount: amountInCents,
          },
          quantity: 1,
        }],
        mode: "payment",
        // No payment_method_types — lets Stripe dynamically show Apple Pay, Google Pay, cards, etc.
        payment_method_options: {
          card: { request_three_d_secure: "any" },
        },
        success_url: `${req.headers.get("origin")}/dashboard/communication?payment=success`,
        cancel_url: `${req.headers.get("origin")}/dashboard/communication?payment=cancelled`,
        metadata: {
          user_id: user.id,
          recipient_user_id: recipient_user_id || "",
          amount: amount.toString(),
          currency,
          thread_id: thread_id || "",
          context_type: context?.type || "",
          context_id: context?.id || "",
          type: "orbit_payment",
        },
      });

      // Create pending wallet transaction for tracking
      const { data: txRecord } = await supabase.from("wallet_transactions").insert({
        user_id: user.id,
        counterpart_user_id: recipient_user_id || null,
        type: "payment",
        direction: "out",
        amount,
        currency,
        description: description || "Fiat payment",
        status: "pending",
        thread_id: thread_id || null,
        reference_type: context?.type || "fiat_checkout",
        reference_id: session.id,
        metadata_json: {
          stripe_session_id: session.id,
          recipient_name: recipient_name || null,
          context_type: context?.type || null,
          context_id: context?.id || null,
        },
      }).select("id").maybeSingle();

      // Audit
      await supabase.from("audit_logs").insert({
        user_id: user.id,
        action: "orbit_payment_fiat_initiated",
        metadata_json: {
          session_id: session.id,
          tx_id: txRecord?.id,
          amount, currency, recipient_user_id, thread_id, context,
        },
      });

      return new Response(JSON.stringify({ url: session.url, session_id: session.id, tx_id: txRecord?.id }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[orbit-payment] Error:", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
