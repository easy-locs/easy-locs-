import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // Validate JWT and extract caller identity
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user?.id) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = user.id;

    const { event_type, payload, org_id } = await req.json();
    if (!event_type || !org_id) {
      return new Response(JSON.stringify({ error: "Missing event_type or org_id" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify caller is a member of the org
    const supabase = createClient(supabaseUrl, serviceKey);
    const { data: membership } = await supabase
      .from("org_members")
      .select("id")
      .eq("user_id", userId)
      .eq("org_id", org_id)
      .maybeSingle();

    if (!membership) {
      return new Response(JSON.stringify({ error: "Forbidden: not an org member" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get active webhooks for this org matching the event
    const { data: webhooks } = await supabase
      .from("webhooks")
      .select("*")
      .eq("org_id", org_id)
      .eq("active", true);

    if (!webhooks || webhooks.length === 0) {
      return new Response(JSON.stringify({ dispatched: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const matching = webhooks.filter(
      (w: any) => w.events.includes("*") || w.events.includes(event_type)
    );

    let dispatched = 0;
    for (const webhook of matching) {
      const body = JSON.stringify({ event: event_type, timestamp: new Date().toISOString(), data: payload });

      // Create HMAC signature
      const encoder = new TextEncoder();
      const key = await crypto.subtle.importKey(
        "raw", encoder.encode(webhook.secret),
        { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
      );
      const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(body));
      const signature = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, "0")).join("");

      let success = false;
      let responseStatus: number | null = null;
      let responseBody = "";

      try {
        const resp = await fetch(webhook.url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Webhook-Signature": signature,
            "X-Webhook-Event": event_type,
          },
          body,
          signal: AbortSignal.timeout(10000),
        });
        responseStatus = resp.status;
        responseBody = await resp.text().catch(() => "");
        success = resp.ok;
      } catch (err) {
        responseBody = String(err);
      }

      // Log delivery
      await supabase.from("webhook_deliveries").insert({
        webhook_id: webhook.id,
        event_type,
        payload,
        response_status: responseStatus,
        response_body: responseBody.substring(0, 500),
        success,
      });

      // Update webhook stats
      if (success) {
        await supabase.from("webhooks").update({
          last_triggered_at: new Date().toISOString(),
          failure_count: 0,
        }).eq("id", webhook.id);
      } else {
        await supabase.from("webhooks").update({
          failure_count: (webhook.failure_count || 0) + 1,
        }).eq("id", webhook.id);
      }

      dispatched++;
    }

    return new Response(JSON.stringify({ dispatched, matched: matching.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
