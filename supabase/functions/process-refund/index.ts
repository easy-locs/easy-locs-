import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "npm:stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: unknown) =>
  console.log(`[PROCESS-REFUND] ${step}${details ? ` - ${JSON.stringify(details)}` : ""}`);

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate caller
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization header");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY not configured");

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Verify user from JWT
    const supabaseUser = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) throw new Error("Unauthorized");

    const { booking_id, booking_type, reason } = await req.json();
    logStep("Request received", { booking_id, booking_type, user_id: user.id });

    if (!booking_id) throw new Error("booking_id required");
    const type = booking_type || "marketplace"; // "marketplace" | "concierge"

    // Fetch the booking
    const table = type === "concierge" ? "concierge_orders" : "marketplace_bookings";
    const { data: booking, error: fetchError } = await supabaseAdmin
      .from(table)
      .select("*, org_id")
      .eq("id", booking_id)
      .single();

    if (fetchError || !booking) throw new Error("Booking not found");

    // Verify user has access to this org
    const { data: membership } = await supabaseAdmin
      .from("org_members")
      .select("role")
      .eq("user_id", user.id)
      .eq("org_id", booking.org_id)
      .single();

    if (!membership) throw new Error("Unauthorized: not a member of this organization");

    // Check role >= agent
    const roleLevel: Record<string, number> = {
      owner: 100, admin: 80, agent: 60, staff: 40, accountant: 30, member: 20,
    };
    if ((roleLevel[membership.role] || 0) < 60) {
      throw new Error("Unauthorized: insufficient role for refunds");
    }

    // Check if payment was via Stripe
    const paymentIntentId = booking.stripe_payment_intent_id;
    const paymentMethod = booking.payment_method;

    let stripeRefundId: string | null = null;
    let refundStatus = "manual";

    if (paymentIntentId && paymentMethod === "stripe") {
      // Get provider's connected Stripe account
      const { data: org } = await supabaseAdmin
        .from("orgs")
        .select("stripe_account_id")
        .eq("id", booking.org_id)
        .single();

      const stripe = new Stripe(stripeKey, { apiVersion: "2025-04-30.basil" });

      try {
        const refundParams: Stripe.RefundCreateParams = {
          payment_intent: paymentIntentId,
          reason: "requested_by_customer",
        };

        // If provider has a connected account, refund on that account
        const stripeOptions: Stripe.RequestOptions = {};
        if (org?.stripe_account_id) {
          stripeOptions.stripeAccount = org.stripe_account_id;
        }

        logStep("Creating Stripe refund", {
          paymentIntentId,
          connectedAccount: org?.stripe_account_id || "platform",
        });

        const refund = await stripe.refunds.create(refundParams, stripeOptions);
        stripeRefundId = refund.id;
        refundStatus = refund.status || "succeeded";
        logStep("Stripe refund created", { refundId: refund.id, status: refund.status });
      } catch (stripeErr: unknown) {
        const msg = stripeErr instanceof Error ? stripeErr.message : String(stripeErr);
        logStep("Stripe refund failed", { error: msg });
        // Still mark as refunded in DB but flag as manual
        refundStatus = "stripe_failed";
      }
    }

    // Update booking status
    const updateData: Record<string, unknown> = {
      status: "refunded",
      refunded_at: new Date().toISOString(),
      payment_confirmed: false,
    };

    const { error: updateError } = await supabaseAdmin
      .from(table)
      .update(updateData)
      .eq("id", booking_id);

    if (updateError) throw new Error(`Failed to update booking: ${updateError.message}`);

    // Audit log
    await supabaseAdmin.from("audit_logs").insert({
      user_id: user.id,
      org_id: booking.org_id,
      action: `${type}_refund`,
      metadata_json: {
        booking_id,
        stripe_refund_id: stripeRefundId,
        refund_status: refundStatus,
        reason: reason || "",
        amount: booking.total_price,
        currency: booking.currency,
      },
    });

    logStep("Refund completed", { booking_id, refundStatus, stripeRefundId });

    return new Response(
      JSON.stringify({
        success: true,
        refund_status: refundStatus,
        stripe_refund_id: stripeRefundId,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    logStep("Error", { error: message });
    return new Response(
      JSON.stringify({ error: message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 },
    );
  }
});
