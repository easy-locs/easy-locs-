import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { booking_request_id } = await req.json();
    if (!booking_request_id) throw new Error("booking_request_id required");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Get the booking request with listing and property info
    const { data: br, error: brErr } = await supabase
      .from("booking_requests")
      .select("*")
      .eq("id", booking_request_id)
      .single();
    if (brErr || !br) throw new Error("Booking request not found");

    const { data: listing } = await supabase
      .from("public_listings")
      .select("title, price_per_night, slug")
      .eq("id", br.listing_id)
      .single();

    const { data: property } = await supabase
      .from("properties")
      .select("label, address, city, country")
      .eq("id", br.property_id)
      .single();

    const { data: org } = await supabase
      .from("orgs")
      .select("owner_user_id, email, name, stripe_account_id, stripe_onboarding_complete")
      .eq("id", br.org_id)
      .single();

    const nights = Math.ceil(
      (new Date(br.check_out).getTime() - new Date(br.check_in).getTime()) / (1000 * 60 * 60 * 24)
    );
    const totalPrice = nights * (listing?.price_per_night || 0);
    const propertyLabel = listing?.title || property?.label || "Logement";

    // Generate payment link
    let paymentUrl = "";
    if (totalPrice > 0) {
      const origin = Deno.env.get("SUPABASE_URL")?.replace(".supabase.co", "") || "";
      const fnUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/create-booking-payment`;
      
      try {
        const payRes = await fetch(fnUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
          },
          body: JSON.stringify({
            booking_request_id: br.id,
            listing_id: br.listing_id,
            guest_email: br.guest_email,
            guest_name: br.guest_name,
            amount: totalPrice,
            nights,
            property_label: propertyLabel,
            origin: "https://easylocs.lovable.app",
          }),
        });
        const payData = await payRes.json();
        if (payData.url) paymentUrl = payData.url;
      } catch (e) {
        console.error("Failed to generate payment link:", e);
      }
    }

    // 1. Notify owner (in-app + email)
    if (org?.owner_user_id) {
      await supabase.from("notifications").insert({
        user_id: org.owner_user_id,
        org_id: br.org_id,
        type: "info",
        title: "🏖️ Nouvelle demande de réservation",
        message: `${br.guest_name} souhaite réserver ${propertyLabel} du ${br.check_in} au ${br.check_out} (${nights} nuits, ${totalPrice}€).`,
        link: "/dashboard/seasonal",
      });
    }

    const SENDGRID_API_KEY = Deno.env.get("SENDGRID_API_KEY");

    // Email to owner
    if (org?.email && SENDGRID_API_KEY) {
      await fetch("https://api.sendgrid.com/v3/mail/send", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${SENDGRID_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          personalizations: [{ to: [{ email: org.email }] }],
          from: { email: "noreply@easy-locs.com", name: "Easy-Locs" },
          reply_to: { email: "contact@easy-locs.com", name: "Easy-Locs" },
          subject: `🏖️ Nouvelle demande — ${br.guest_name}`,
          content: [{
            type: "text/html",
            value: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;background:#fff;">
              <div style="text-align:center;margin-bottom:24px;">
                <h1 style="color:#1a1a1a;font-size:22px;">🏖️ Nouvelle demande de réservation</h1>
              </div>
              <table style="width:100%;border-collapse:collapse;margin:16px 0;">
                <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#888;">Voyageur</td><td style="padding:8px;border-bottom:1px solid #eee;font-weight:600;">${br.guest_name}</td></tr>
                <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#888;">Email</td><td style="padding:8px;border-bottom:1px solid #eee;">${br.guest_email}</td></tr>
                ${br.guest_phone ? `<tr><td style="padding:8px;border-bottom:1px solid #eee;color:#888;">Telephone</td><td style="padding:8px;border-bottom:1px solid #eee;">${br.guest_phone}</td></tr>` : ""}
                <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#888;">Bien</td><td style="padding:8px;border-bottom:1px solid #eee;">${propertyLabel}</td></tr>
                <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#888;">Dates</td><td style="padding:8px;border-bottom:1px solid #eee;">${br.check_in} → ${br.check_out} (${nights} nuits)</td></tr>
                <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#888;">Montant</td><td style="padding:8px;border-bottom:1px solid #eee;font-weight:600;color:#16a34a;">${totalPrice} EUR</td></tr>
                ${br.message ? `<tr><td style="padding:8px;border-bottom:1px solid #eee;color:#888;">Message</td><td style="padding:8px;border-bottom:1px solid #eee;">${br.message}</td></tr>` : ""}
              </table>
              <p style="text-align:center;margin-top:24px;">
                <a href="https://easylocs.lovable.app/dashboard/seasonal" style="background:#2563eb;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">Gérer les réservations</a>
              </p>
              <p style="text-align:center;color:#aaa;font-size:11px;margin-top:24px;">Notification automatique EASY-LOCS®</p>
            </div>`,
          }],
        }),
      });
    }

    // 2. Email to guest with payment link
    if (br.guest_email && SENDGRID_API_KEY) {
      const paymentSection = paymentUrl
        ? `<div style="text-align:center;margin:24px 0;">
            <a href="${paymentUrl}" style="background:#16a34a;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:700;font-size:16px;">💳 Payer ${totalPrice} EUR</a>
            <p style="color:#888;font-size:12px;margin-top:8px;">Paiement sécurisé par carte ou Apple Pay</p>
          </div>`
        : "";

      await fetch("https://api.sendgrid.com/v3/mail/send", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${SENDGRID_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          personalizations: [{ to: [{ email: br.guest_email }] }],
          from: { email: "noreply@easy-locs.com", name: org?.name || "Easy-Locs" },
          reply_to: { email: org?.email || "contact@easy-locs.com", name: org?.name || "Easy-Locs" },
          subject: `✅ Votre demande de réservation — ${propertyLabel}`,
          content: [{
            type: "text/html",
            value: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;background:#fff;">
              <div style="text-align:center;margin-bottom:24px;">
                <h1 style="color:#1a1a1a;font-size:22px;">✅ Demande de réservation reçue</h1>
              </div>
              <p style="color:#555;font-size:15px;">Bonjour ${br.guest_name},</p>
              <p style="color:#555;font-size:15px;">Votre demande de réservation pour <strong>${propertyLabel}</strong> a bien été enregistrée.</p>
              <table style="width:100%;border-collapse:collapse;margin:16px 0;background:#f9fafb;border-radius:8px;">
                <tr><td style="padding:10px 12px;color:#888;">Arrivée</td><td style="padding:10px 12px;font-weight:600;">${br.check_in}</td></tr>
                <tr><td style="padding:10px 12px;color:#888;">Départ</td><td style="padding:10px 12px;font-weight:600;">${br.check_out}</td></tr>
                <tr><td style="padding:10px 12px;color:#888;">Durée</td><td style="padding:10px 12px;">${nights} nuit${nights > 1 ? "s" : ""}</td></tr>
                ${totalPrice > 0 ? `<tr><td style="padding:10px 12px;color:#888;">Total</td><td style="padding:10px 12px;font-weight:700;color:#16a34a;">${totalPrice} EUR</td></tr>` : ""}
              </table>
              ${paymentSection}
              <p style="color:#888;font-size:13px;text-align:center;">Le propriétaire reviendra vers vous dans les plus brefs délais.</p>
              <p style="text-align:center;color:#aaa;font-size:11px;margin-top:32px;">EASY-LOCS® — Gestion locative intelligente</p>
            </div>`,
          }],
        }),
      });
    }

    return new Response(JSON.stringify({ success: true, payment_url: paymentUrl }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[NOTIFY-BOOKING] ERROR:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
