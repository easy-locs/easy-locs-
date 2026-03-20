// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

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
    const { data: claims, error: claimsErr } = await userClient.auth.getUser(token);
    if (claimsErr || !claims.user) throw new Error("Not authenticated");
    const userId = claims.user.id;

    const { amount, currency, destinationType, destinationRef, note } = await req.json();

    const { data: orbit } = await admin
      .from("orbit_profiles_v2")
      .select("*")
      .eq("id", userId)
      .single();
    if (!orbit) throw new Error("No orbit profile");

    const walletId = `wallet_${orbit.orbit_id}`;
    const now = new Date().toISOString();

    const payoutRequest = {
      id: `payout_${crypto.randomUUID().slice(0, 8)}`,
      owner_orbit_id: orbit.orbit_id,
      wallet_id: walletId,
      amount,
      currency,
      status: "pending",
      destination_type: destinationType ?? null,
      destination_ref: destinationRef ?? null,
      note: note ?? null,
      created_at: now,
      updated_at: now,
    };

    const { data, error } = await admin
      .from("payout_requests")
      .insert(payoutRequest)
      .select()
      .single();
    if (error) throw error;

    return new Response(JSON.stringify({ payoutRequest: data }), {
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
