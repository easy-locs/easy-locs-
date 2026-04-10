/**
 * reveal-contact — Secure endpoint to reveal provider contact data.
 * - Requires authenticated user
 * - Rate-limits reveals per user/day (10 phone, 10 whatsapp)
 * - Logs every reveal in contact_reveals
 * - Returns real phone/whatsapp only after validation
 */
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DAILY_REVEAL_LIMIT = 10;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = user.id;

    const body = await req.json();
    const { reveal_type, org_id, listing_id, service_id, source } = body;

    if (!reveal_type || !["phone", "whatsapp", "email"].includes(reveal_type)) {
      return new Response(JSON.stringify({ error: "Invalid reveal_type" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!org_id && !listing_id && !service_id) {
      return new Response(JSON.stringify({ error: "Must provide org_id, listing_id, or service_id" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Rate limit check
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const { count } = await adminClient
      .from("contact_reveals")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("reveal_type", reveal_type)
      .gte("created_at", todayStart.toISOString());

    if ((count || 0) >= DAILY_REVEAL_LIMIT) {
      return new Response(JSON.stringify({
        error: "Daily reveal limit reached",
        limit: DAILY_REVEAL_LIMIT,
        remaining: 0,
      }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch real contact data
    let contactData: Record<string, string | null> = {};

    if (source === "real_estate" && listing_id) {
      const { data: listing } = await adminClient
        .from("real_estate_listings")
        .select("contact_phone, contact_email")
        .eq("id", listing_id)
        .eq("status", "active")
        .single();

      if (listing) {
        contactData = { phone: listing.contact_phone, email: listing.contact_email };
      }
    } else if (source === "seasonal" && listing_id) {
      const { data: pl } = await adminClient
        .from("public_listings")
        .select("contact_phone, whatsapp_number, contact_email, telegram_username")
        .eq("id", listing_id)
        .eq("active", true)
        .single();

      if (pl) {
        contactData = {
          phone: pl.contact_phone,
          whatsapp: pl.whatsapp_number,
          email: pl.contact_email,
          telegram: pl.telegram_username,
        };
      }
    } else if (source === "marketplace" && service_id) {
      const { data: svc } = await adminClient
        .from("marketplace_services")
        .select("source_contact_phone, contact_whatsapp, source_contact_email, contact_email")
        .eq("id", service_id)
        .eq("active", true)
        .single();

      if (svc) {
        contactData = {
          phone: svc.source_contact_phone,
          whatsapp: svc.contact_whatsapp,
          email: svc.contact_email || svc.source_contact_email,
        };
      }
    } else if (source === "concierge" && service_id) {
      const { data: svc } = await adminClient
        .from("concierge_services")
        .select("provider_phone")
        .eq("id", service_id)
        .eq("active", true)
        .single();

      if (svc) {
        contactData = { phone: svc.provider_phone };
      }
    } else if (org_id) {
      const { data: org } = await adminClient
        .from("orgs")
        .select("email")
        .eq("id", org_id)
        .single();

      if (org) {
        contactData = { email: org.email };
      }
    }

    // Log the reveal
    await adminClient.from("contact_reveals").insert({
      user_id: userId,
      org_id: org_id || null,
      listing_id: listing_id || null,
      service_id: service_id || null,
      reveal_type,
    });

    // Return only the requested type
    const value = reveal_type === "phone" ? contactData.phone
      : reveal_type === "whatsapp" ? (contactData.whatsapp || contactData.phone)
      : contactData.email;

    return new Response(JSON.stringify({
      [reveal_type]: value || null,
      remaining: DAILY_REVEAL_LIMIT - (count || 0) - 1,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("reveal-contact error:", err);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
