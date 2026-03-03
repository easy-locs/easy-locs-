import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@17.7.0?target=deno&deno-std=0.190.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  console.log(`[STRIPE-WEBHOOK] ${step}${details ? ` - ${JSON.stringify(details)}` : ""}`);
};

const PRODUCT_MAP: Record<string, string> = {
  "prod_U37B1NPO4TQTnD": "unlimited_monthly",
  "prod_U37COZzTYiHqG1": "unlimited_annual",
  "prod_U354fxGmmhSvn0": "unlimited_monthly",
  "prod_U355WIZ1brDxXV": "unlimited_annual",
  "prod_U355aIW4nePfxQ": "unlimited_monthly",
  "prod_U355FFHHJ8rgAT": "unlimited_annual",
  "prod_U2yLjzJN4Y7LYb": "unlimited_monthly",
  "prod_U2zlUjPtdVVjIw": "unlimited_annual",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const stripe = new Stripe((Deno.env.get("STRIPE_SECRET_KEY") || "").replace(/[^\x20-\x7E]/g, "").trim(), {
    apiVersion: "2024-12-18.acacia",
  });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  const signature = req.headers.get("stripe-signature");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

  if (!signature || !webhookSecret) {
    logStep("Missing signature or webhook secret");
    return new Response(JSON.stringify({ error: "Missing signature or webhook secret" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let event: Stripe.Event;
  try {
    const body = await req.text();
    event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
    logStep("Event received", { type: event.type, id: event.id });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logStep("Signature verification failed", { error: msg });
    return new Response(JSON.stringify({ error: `Webhook signature verification failed: ${msg}` }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    switch (event.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionChange(supabase, stripe, subscription);
        break;
      }
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionDeleted(supabase, stripe, subscription);
        break;
      }
      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        if (invoice.subscription) {
          logStep("Invoice paid, refreshing subscription", { subscriptionId: invoice.subscription });
          const sub = await stripe.subscriptions.retrieve(invoice.subscription as string);
          await handleSubscriptionChange(supabase, stripe, sub);
        }
        break;
      }
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        logStep("Payment failed", { customer: invoice.customer, subscription: invoice.subscription });
        if (invoice.customer) {
          const userId = await getUserIdByCustomerId(supabase, stripe, invoice.customer as string);
          if (userId) {
            await supabase.from("subscriptions").update({ status: "past_due" }).eq("user_id", userId);
            logStep("Set subscription to past_due", { userId });
          }
        }
        break;
      }
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutCompleted(supabase, stripe, session);
        break;
      }
      default:
        logStep("Unhandled event type", { type: event.type });
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logStep("ERROR processing event", { error: msg });
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

/* ── Handle checkout.session.completed for booking & rent payments ── */
async function handleCheckoutCompleted(supabase: any, stripe: Stripe, session: Stripe.Checkout.Session) {
  const metadata = session.metadata || {};
  const type = metadata.type;
  logStep("Checkout completed", { type, metadata });

  if (type === "seasonal_booking") {
    await handleBookingPayment(supabase, metadata, session);
  } else if (type === "rent_payment") {
    await handleRentPayment(supabase, metadata, session);
  }
}

async function handleBookingPayment(supabase: any, metadata: Record<string, string>, session: Stripe.Checkout.Session) {
  const bookingRequestId = metadata.booking_request_id;
  if (!bookingRequestId) return;

  logStep("Processing booking payment", { bookingRequestId });

  // Get booking request
  const { data: br } = await supabase
    .from("booking_requests")
    .select("*")
    .eq("id", bookingRequestId)
    .single();
  if (!br) { logStep("Booking request not found"); return; }

  // Update status to paid
  await supabase.from("booking_requests").update({ status: "paid" }).eq("id", bookingRequestId);

  // Get listing info
  const { data: listing } = await supabase
    .from("public_listings")
    .select("title, price_per_night")
    .eq("id", br.listing_id)
    .single();

  const nights = Math.ceil(
    (new Date(br.check_out).getTime() - new Date(br.check_in).getTime()) / (1000 * 60 * 60 * 24)
  );
  const totalPrice = nights * (listing?.price_per_night || 0);

  // Auto-create seasonal booking to block dates
  const { data: org } = await supabase
    .from("orgs")
    .select("owner_user_id")
    .eq("id", br.org_id)
    .single();

  if (org?.owner_user_id) {
    // Create booking entry in seasonal_bookings
    await supabase.from("seasonal_bookings").insert({
      org_id: br.org_id,
      user_id: org.owner_user_id,
      property_id: br.property_id,
      guest_name: br.guest_name,
      guest_email: br.guest_email || "",
      guest_phone: br.guest_phone || "",
      check_in: br.check_in,
      check_out: br.check_out,
      total_price: totalPrice,
      cleaning_fee: 0,
      deposit_amount: 0,
      notes: `Paiement en ligne - Stripe ${session.payment_intent || ""}`,
      status: "confirmed",
    });
    logStep("Seasonal booking created (dates blocked)", { check_in: br.check_in, check_out: br.check_out });

    // Notify owner
    await supabase.from("notifications").insert({
      user_id: org.owner_user_id,
      org_id: br.org_id,
      type: "info",
      title: "💳 Paiement reçu — réservation confirmée",
      message: `${br.guest_name} a payé ${totalPrice}€ pour ${listing?.title || "votre bien"} (${br.check_in} → ${br.check_out}). Les dates sont bloquées.`,
      link: "/dashboard/seasonal",
    });
  }

  // Email confirmation to guest
  const SENDGRID_API_KEY = Deno.env.get("SENDGRID_API_KEY");
  if (br.guest_email && SENDGRID_API_KEY) {
    await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: { Authorization: `Bearer ${SENDGRID_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: br.guest_email }] }],
        from: { email: "noreply@easy-locs.com", name: "Easy-Locs" },
        reply_to: { email: "contact@easy-locs.com", name: "Easy-Locs" },
        subject: `✅ Paiement confirmé — ${listing?.title || "Réservation"}`,
        content: [{
          type: "text/html",
          value: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;background:#fff;">
            <h2 style="color:#1a2744;text-align:center;">✅ Paiement confirmé</h2>
            <p style="color:#555;">Bonjour ${br.guest_name},</p>
            <p style="color:#555;">Votre paiement de <strong>${totalPrice} EUR</strong> a été reçu. Votre réservation est confirmée :</p>
            <table style="width:100%;margin:16px 0;border-collapse:collapse;">
              <tr><td style="padding:8px;color:#888;">Arrivée</td><td style="padding:8px;font-weight:600;">${br.check_in}</td></tr>
              <tr><td style="padding:8px;color:#888;">Départ</td><td style="padding:8px;font-weight:600;">${br.check_out}</td></tr>
              <tr><td style="padding:8px;color:#888;">Durée</td><td style="padding:8px;">${nights} nuit${nights > 1 ? "s" : ""}</td></tr>
            </table>
            <p style="color:#aaa;font-size:11px;text-align:center;margin-top:32px;">EASY-LOCS® — Gestion locative intelligente</p>
          </div>`,
        }],
      }),
    });
    logStep("Guest confirmation email sent");
  }
}

async function handleRentPayment(supabase: any, metadata: Record<string, string>, session: Stripe.Checkout.Session) {
  const rentCallId = metadata.rent_call_id;
  if (!rentCallId) return;

  logStep("Processing rent payment", { rentCallId });

  // Mark rent call as paid
  await supabase.from("rent_calls").update({
    paid: true,
    paid_date: new Date().toISOString(),
    payment_method: "stripe",
  }).eq("id", rentCallId);

  // Get rent call details for receipt generation
  const { data: rc } = await supabase.from("rent_calls").select("*").eq("id", rentCallId).single();
  if (!rc) return;

  // Get tenant + property info for notification
  const { data: tenant } = await supabase.from("tenants").select("name, email, tenant_user_id").eq("id", rc.tenant_id).single();
  const { data: org } = await supabase.from("orgs").select("owner_user_id, email, name").eq("id", rc.org_id).single();

  // Notify owner
  if (org?.owner_user_id) {
    await supabase.from("notifications").insert({
      user_id: org.owner_user_id,
      org_id: rc.org_id,
      type: "info",
      title: "💰 Loyer payé",
      message: `${tenant?.name || "Locataire"} a payé ${rc.total_amount}€ pour ${rc.month}.`,
      link: "/dashboard/rental?tab=payments",
    });
  }

  // Notify tenant
  if (tenant?.tenant_user_id) {
    await supabase.from("notifications").insert({
      user_id: tenant.tenant_user_id,
      org_id: rc.org_id,
      type: "info",
      title: "✅ Paiement confirmé",
      message: `Votre paiement de ${rc.total_amount}€ pour ${rc.month} a été reçu. La quittance sera générée.`,
      link: "/tenant/receipts",
    });
  }

  logStep("Rent payment processed, notifications sent");
}

async function handleSubscriptionChange(supabase: any, stripe: Stripe, subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string;
  const userId = await getUserIdByCustomerId(supabase, stripe, customerId);
  if (!userId) { logStep("No user found for customer", { customerId }); return; }

  const productId = subscription.items.data[0]?.price?.product as string;
  const plan = PRODUCT_MAP[productId] || "unlimited_monthly";
  const status = subscription.status === "trialing" ? "trialing" : subscription.status === "active" ? "active" : subscription.status;
  const currentPeriodEnd = new Date(subscription.current_period_end * 1000).toISOString();

  await supabase.from("subscriptions").upsert(
    { user_id: userId, stripe_customer_id: customerId, stripe_subscription_id: subscription.id, plan, status, current_period_end: currentPeriodEnd },
    { onConflict: "user_id" }
  );
  logStep("Subscription synced", { userId, plan, status });
}

async function handleSubscriptionDeleted(supabase: any, stripe: Stripe, subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string;
  const userId = await getUserIdByCustomerId(supabase, stripe, customerId);
  if (!userId) { logStep("No user found for deleted subscription", { customerId }); return; }
  await supabase.from("subscriptions").update({ status: "canceled", plan: "free", stripe_subscription_id: null }).eq("user_id", userId);
  logStep("Subscription canceled", { userId });
}

async function getUserIdByCustomerId(supabase: any, stripe: Stripe, customerId: string): Promise<string | null> {
  const { data: sub } = await supabase.from("subscriptions").select("user_id").eq("stripe_customer_id", customerId).limit(1).maybeSingle();
  if (sub?.user_id) return sub.user_id;
  try {
    const customer = await stripe.customers.retrieve(customerId);
    if ("deleted" in customer && customer.deleted) return null;
    const email = (customer as Stripe.Customer).email;
    if (!email) return null;
    const { data: profile } = await supabase.from("profiles").select("id").eq("email", email).limit(1).maybeSingle();
    return profile?.id || null;
  } catch { return null; }
}
