import { requireRouterOrigin } from "../_shared/edge-function-consolidation.ts";
// deno-lint-ignore-file no-explicit-any
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { checkServerRateLimit, rateLimitResponse } from "../_shared/server-rate-limiter.ts";
import { withEdgeLogging } from "../_shared/with-logging.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version, x-trace-id, x-span-id, x-parent-span-id, x-request-id, traceparent",
};

Deno.serve(withEdgeLogging("payout-request-create", async (req, logger) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const routerCheck = requireRouterOrigin(req);
  if (!routerCheck.allowed) return routerCheck.response!;
  try {
    const rlResult = await checkServerRateLimit(req, "payout-request-create");
    if (!rlResult.allowed) return rateLimitResponse(rlResult);

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
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();
    if (!orbit) throw new Error("No orbit profile");

    const walletId = `wallet_${orbit.id}`;
    const now = new Date().toISOString();

    const payoutRequest = {
      id: `payout_${crypto.randomUUID().slice(0, 8)}`,
      owner_orbit_id: orbit.id,
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
}));
