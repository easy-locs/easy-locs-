import { requireRouterOrigin } from "../_shared/edge-function-consolidation.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { checkServerRateLimit, rateLimitResponse } from "../_shared/server-rate-limiter.ts";
import { rejectQuerySecrets } from "../_shared/reject-query-secrets.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version, x-trace-id, x-span-id, x-parent-span-id, x-request-id, traceparent",
};

Deno.serve(async (req) => {
  const __qsCheck = rejectQuerySecrets(req); if (__qsCheck.rejected) return __qsCheck.response!;
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const routerCheck = requireRouterOrigin(req);
  if (!routerCheck.allowed) return routerCheck.response!;
  try {
    const rlResult = await checkServerRateLimit(req, "rent-create-payment");
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
    const { data: { user }, error: userError } = await userClient.auth.getUser(token);
    if (userError || !user) throw new Error("Not authenticated");
    const userId = user.id;

    const { leaseId, dueDate, reference } = await req.json();

    const { data: ownerOrbit } = await admin
      .from("profiles").select("*").eq("id", userId).single();

    const { data: lease } = await admin
      .from("leases").select("*").eq("id", leaseId).single();

    if (!lease) throw new Error("Lease not found");
    if (lease.owner_orbit_id !== ownerOrbit.id) throw new Error("Not allowed");

    const now = new Date().toISOString();
    const paymentId = crypto.randomUUID();

    const payment = {
      id: paymentId,
      lease_id: lease.id,
      property_id: lease.property_id,
      org_id: lease.org_id,
      tenant_id: lease.tenant_id,
      amount: lease.rent_amount,
      currency: lease.currency ?? "AED",
      due_date: dueDate,
      status: "pending",
      reference: reference ?? null,
      created_at: now,
      updated_at: now,
    };

    const { data: created, error: pErr } = await admin
      .from("rent_calls")
      .insert(payment)
      .select()
      .single();
    if (pErr) throw pErr;

    await admin.from("notifications").insert({
      id: crypto.randomUUID(),
      user_id: userId,
      type: "rent",
      title: "Rent payment created",
      body: `Payment ${paymentId} scheduled for ${dueDate}`,
      read: false,
      metadata_json: { paymentId, leaseId },
    });

    return new Response(
      JSON.stringify({ payment: created }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
    );
  }
});
