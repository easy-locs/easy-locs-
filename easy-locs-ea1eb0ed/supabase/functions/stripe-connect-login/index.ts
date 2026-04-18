import { requireRouterOrigin } from "../_shared/edge-function-consolidation.ts";
import Stripe from "npm:stripe@18.5.0";
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
  const rlResult = await checkServerRateLimit(req, "stripe-connect-login", { maxRequests: 10, windowSeconds: 60 });
  if (!rlResult.allowed) return rateLimitResponse(rlResult);

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401,
      });
    }

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      return new Response(JSON.stringify({ error: "Payment system not configured" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 503,
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabaseUser = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Authentication failed" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401,
      });
    }

    const { org_id } = await req.json();
    if (!org_id) {
      return new Response(JSON.stringify({ error: "org_id required" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400,
      });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const { data: org } = await supabaseAdmin
      .from("orgs")
      .select("stripe_account_id, owner_user_id")
      .eq("id", org_id)
      .single();

    if (!org?.stripe_account_id) {
      return new Response(JSON.stringify({ error: "No Stripe Connect account linked" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 404,
      });
    }

    if (org.owner_user_id !== user.id) {
      const { data: membership } = await supabaseAdmin
        .from("org_members")
        .select("role")
        .eq("user_id", user.id)
        .eq("org_id", org_id)
        .single();

      const adminRoles = ["owner", "admin"];
      if (!membership || !adminRoles.includes(membership.role)) {
        return new Response(JSON.stringify({ error: "Insufficient permissions" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 403,
        });
      }
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-04-30.basil" });

    const loginLink = await stripe.accounts.createLoginLink(org.stripe_account_id);

    console.log(`[STRIPE-CONNECT-LOGIN] Login link created for account ${org.stripe_account_id}`);

    return new Response(
      JSON.stringify({ url: loginLink.url }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[STRIPE-CONNECT-LOGIN] Error:", message);
    return new Response(
      JSON.stringify({ error: `Failed to create login link: ${message}` }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 },
    );
  }
});
