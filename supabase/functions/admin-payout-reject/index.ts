// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing Authorization header");

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) throw new Error("Not authenticated");

    const userId = claimsData.claims.sub;

    const { data: membership } = await admin
      .from("org_members")
      .select("role")
      .eq("user_id", userId)
      .in("role", ["owner", "admin"])
      .limit(1)
      .single();

    if (!membership) throw new Error("Admin only");

    const { payoutRequestId, reason } = await req.json();
    if (!payoutRequestId) throw new Error("payoutRequestId required");

    const now = new Date().toISOString();

    const { data: updated, error } = await admin
      .from("payout_requests")
      .update({
        status: "rejected",
        note: reason ?? "Rejected by admin",
        updated_at: now,
      })
      .eq("id", payoutRequestId)
      .select()
      .single();

    if (error) throw error;

    return new Response(JSON.stringify({ payoutRequest: updated }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
