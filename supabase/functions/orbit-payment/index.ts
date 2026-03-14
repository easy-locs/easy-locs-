/**
 * orbit-payment — Server-side payment processing for Orbit
 * Validates QR payloads, processes LOCS transfers, creates Stripe sessions
 * Includes: signature verification, anti-replay, expiration check, audit trail
 */
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PLATFORM_SPREAD = 0.02;

/** HMAC-SHA256 verify (mirrors client-side signPayload) */
async function verifySignature(payload: any): Promise<boolean> {
  const data = [
    payload.qr_type,
    payload.recipient_user_id,
    payload.amount.toString(),
    payload.currency,
    payload.nonce,
    payload.expires_at,
  ].join("|");

  const encoder = new TextEncoder();
  const keyData = encoder.encode(`orbit-pay-v1-${payload.recipient_user_id}`);
  const key = await crypto.subtle.importKey("raw", keyData, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(data));
  const expected = Array.from(new Uint8Array(sig), (b) => b.toString(16).padStart(2, "0")).join("");
  return expected === payload.signature;
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

    // ─── ACTION: validate_qr ───
    if (action === "validate_qr") {
      const { payload } = body;
      if (!payload || !payload.qr_type) {
        return new Response(JSON.stringify({ valid: false, error: "Invalid QR payload" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (payload.qr_type === "dynamic") {
        // Check expiration
        if (new Date(payload.expires_at) < new Date()) {
          return new Response(JSON.stringify({ valid: false, error: "QR code expired" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Verify signature
        const sigValid = await verifySignature(payload);
        if (!sigValid) {
          return new Response(JSON.stringify({ valid: false, error: "Invalid signature" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Anti-replay: check nonce
        const { data: existingNonce } = await supabase
          .from("wallet_transactions")
          .select("id")
          .eq("metadata_json->>qr_nonce", payload.nonce)
          .limit(1)
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

    // ─── ACTION: pay_locs ───
    if (action === "pay_locs") {
      const { recipient_user_id, amount, description, thread_id, context, qr_nonce } = body;

      if (!recipient_user_id || !amount || amount <= 0) {
        return new Response(JSON.stringify({ error: "Invalid payment parameters" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (recipient_user_id === user.id) {
        return new Response(JSON.stringify({ error: "Cannot pay yourself" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Check sender balance
      const { data: senderBal } = await supabase
        .from("wallet_balances")
        .select("balance")
        .eq("user_id", user.id)
        .eq("currency", "LOCS")
        .maybeSingle();

      if (!senderBal || (senderBal.balance as number) < amount) {
        return new Response(JSON.stringify({ error: "Insufficient LOCS balance" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const metadata: Record<string, any> = {};
      if (qr_nonce) metadata.qr_nonce = qr_nonce;
      if (context) {
        metadata.context_type = context.type;
        metadata.context_id = context.id;
        metadata.context_label = context.label;
      }

      // Create outgoing transaction
      const { error: txOutErr } = await supabase.from("wallet_transactions").insert({
        user_id: user.id,
        counterpart_user_id: recipient_user_id,
        type: "transfer",
        direction: "out",
        amount,
        currency: "LOCS",
        description: description || "LOCS Transfer",
        status: "completed",
        thread_id: thread_id || null,
        reference_type: context?.type || null,
        reference_id: context?.id || null,
        metadata_json: metadata,
      });
      if (txOutErr) throw new Error(txOutErr.message);

      // Create incoming transaction
      await supabase.from("wallet_transactions").insert({
        user_id: recipient_user_id,
        counterpart_user_id: user.id,
        type: "transfer",
        direction: "in",
        amount,
        currency: "LOCS",
        description: description || "LOCS received",
        status: "completed",
        thread_id: thread_id || null,
        reference_type: context?.type || null,
        reference_id: context?.id || null,
        metadata_json: metadata,
      });

      // Update balances
      await supabase
        .from("wallet_balances")
        .update({
          balance: (senderBal.balance as number) - amount,
          total_spent: supabase.rpc ? undefined : undefined,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", user.id)
        .eq("currency", "LOCS");

      const { data: recipientBal } = await supabase
        .from("wallet_balances")
        .select("balance")
        .eq("user_id", recipient_user_id)
        .eq("currency", "LOCS")
        .maybeSingle();

      if (recipientBal) {
        await supabase
          .from("wallet_balances")
          .update({
            balance: (recipientBal.balance as number) + amount,
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", recipient_user_id)
          .eq("currency", "LOCS");
      }

      // Audit
      await supabase.from("audit_logs").insert({
        user_id: user.id,
        action: "orbit_payment_locs",
        metadata_json: {
          recipient_user_id,
          amount,
          thread_id,
          context,
          qr_nonce: qr_nonce || null,
        },
      });

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── ACTION: pay_fiat ───
    if (action === "pay_fiat") {
      const { recipient_user_id, amount, currency = "EUR", description, thread_id, context } = body;

      if (!amount || amount < 1) {
        return new Response(JSON.stringify({ error: "Minimum payment is 1 EUR equivalent" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", { apiVersion: "2025-08-27.basil" });

      // Find or create customer
      const customers = await stripe.customers.list({ email: user.email!, limit: 1 });
      const customerId = customers.data.length > 0 ? customers.data[0].id : undefined;

      const amountInCents = Math.round(amount * 100);

      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        customer_email: customerId ? undefined : user.email!,
        line_items: [
          {
            price_data: {
              currency: currency.toLowerCase(),
              product_data: {
                name: `Payment to ${body.recipient_name || "recipient"}`,
                description: description || "Orbit Payment",
              },
              unit_amount: amountInCents,
            },
            quantity: 1,
          },
        ],
        mode: "payment",
        payment_method_types: ["card"],
        payment_method_options: {
          card: { request_three_d_secure: "any" },
        },
        success_url: `${req.headers.get("origin")}/app/orbit?payment=success`,
        cancel_url: `${req.headers.get("origin")}/app/orbit?payment=cancelled`,
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

      // Audit
      await supabase.from("audit_logs").insert({
        user_id: user.id,
        action: "orbit_payment_fiat_initiated",
        metadata_json: {
          session_id: session.id,
          amount,
          currency,
          recipient_user_id,
          thread_id,
          context,
        },
      });

      return new Response(JSON.stringify({ url: session.url }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[orbit-payment] Error:", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
