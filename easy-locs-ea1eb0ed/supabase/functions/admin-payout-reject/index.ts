import { requireRouterOrigin } from "../_shared/edge-function-consolidation.ts";
import { getCorsHeaders } from "../_shared/cors.ts";
// deno-lint-ignore-file no-explicit-any
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { checkServerRateLimit, rateLimitResponse } from "../_shared/server-rate-limiter.ts";
import { rejectQuerySecrets } from "../_shared/reject-query-secrets.ts";

Deno.serve(async (req) => {
  const __qsCheck = rejectQuerySecrets(req); if (__qsCheck.rejected) return __qsCheck.response!;
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: getCorsHeaders(req) });
  }

  const routerCheck = requireRouterOrigin(req);
  if (!routerCheck.allowed) return routerCheck.response!;
  try {
    const rlResult = await checkServerRateLimit(req, "admin-payout-reject");
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
      headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      status: 200,
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      status: 400,
    });
  }
});
