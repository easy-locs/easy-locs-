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

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Auth error: ${userError.message}`);
    const user = userData.user;
    if (!user) throw new Error("User not authenticated");

    const { data: orgMember } = await supabaseClient
      .from("org_members")
      .select("org_id")
      .eq("user_id", user.id)
      .limit(1)
      .single();

    if (!orgMember) throw new Error("No organization found");

    const { data: org } = await supabaseClient
      .from("orgs")
      .select("stripe_account_id")
      .eq("id", orgMember.org_id)
      .single();

    if (!org?.stripe_account_id) {
      return new Response(JSON.stringify({ success: true, message: "No Stripe account to disconnect" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Clear the Stripe account from this org (does NOT delete the Stripe account itself)
    await supabaseClient
      .from("orgs")
      .update({ stripe_account_id: null, stripe_onboarding_complete: false } as any)
      .eq("id", orgMember.org_id);

    // Log the action
    await supabaseClient.from("audit_logs").insert({
      action: "stripe_disconnect",
      user_id: user.id,
      org_id: orgMember.org_id,
      metadata_json: { previous_account_id: org.stripe_account_id },
    });

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
