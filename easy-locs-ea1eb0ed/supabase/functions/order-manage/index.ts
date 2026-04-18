import { requireRouterOrigin } from "../_shared/edge-function-consolidation.ts";
// deno-lint-ignore-file no-explicit-any
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { checkServerRateLimit, rateLimitResponse } from "../_shared/server-rate-limiter.ts";
import { withEdgeLogging } from "../_shared/with-logging.ts";

import { cFromEdge, cRpcEdge } from "../_shared/execution/content-mutation.ts";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version, x-trace-id, x-span-id, x-parent-span-id, x-request-id, traceparent",
};

Deno.serve(withEdgeLogging("order-manage", async (req, logger) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const routerCheck = requireRouterOrigin(req);
  if (!routerCheck.allowed) return routerCheck.response!;
  try {
    const rlResult = await checkServerRateLimit(req, "order-manage");
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

    const body = await req.json();
    const { orderId, action, status } = body;

    if (!orderId) throw new Error("orderId required");

    // Fetch order
    const { data: order, error: orderErr } = await admin
      .from("storefront_orders")
      .select("*")
      .eq("id", orderId)
      .single();

    if (orderErr || !order) throw new Error("Order not found");

    // Verify the caller is the seller or buyer
    const isSeller = order.seller_id === userId;
    const isBuyer = order.buyer_id === userId;
    if (!isSeller && !isBuyer) throw new Error("Not authorized for this order");

    if (action === "update_status") {
      if (!status) throw new Error("status required");

      // Validate status transitions
      const validTransitions: Record<string, string[]> = {
        pending: ["accepted", "cancelled"],
        accepted: ["preparing", "cancelled"],
        preparing: ["ready_for_pickup", "cancelled"],
        ready_for_pickup: ["completed", "cancelled"],
      };

      const allowed = validTransitions[order.status] ?? [];
      if (!allowed.includes(status) && status !== "completed") {
        throw new Error(`Cannot transition from ${order.status} to ${status}`);
      }

      const patch: Record<string, any> = {
        status,
        updated_at: new Date().toISOString(),
      };

      if (status === "completed" || status === "delivered") {
        patch.payment_status = "released";
      }

      const { data: updated, error: updateErr } = await cFromEdge(admin, "storefront_orders")
        .update(patch)
        .eq("id", orderId)
        .select("*")
        .single();

      if (updateErr) throw updateErr;

      // Log status history
      await cFromEdge(admin, "order_status_history").insert({
        order_id: orderId,
        status,
        actor_type: isSeller ? "merchant" : "customer",
        actor_id: userId,
      });

      // If order completed, create settlement entry for merchant
      if (status === "completed" && order.total > 0) {
        // Find or create merchant account
        const { data: merchantAcct } = await cFromEdge(admin, "merchant_accounts")
          .select("id")
          .eq("user_id", order.seller_id)
          .maybeSingle();

        if (merchantAcct) {
          const grossAmount = Number(order.total);
          const platformFee = Number((grossAmount * 0.05).toFixed(2));
          const processingFee = Number((grossAmount * 0.029).toFixed(2));
          const netAmount = Number((grossAmount - platformFee - processingFee).toFixed(2));

          // Insert settlement entry
          await cFromEdge(admin, "settlement_ledger").insert({
            merchant_id: merchantAcct.id,
            order_id: orderId,
            gross_amount: grossAmount,
            platform_fee: platformFee,
            processing_fee: processingFee,
            net_amount: netAmount,
            currency: order.currency || "AED",
            status: "released",
          });

          // Update merchant balance
          const { data: balance } = await cFromEdge(admin, "merchant_balances")
            .select("*")
            .eq("merchant_id", merchantAcct.id)
            .eq("currency", order.currency || "AED")
            .maybeSingle();

          if (balance) {
            await cFromEdge(admin, "merchant_balances").update({
              available_balance: Number(balance.available_balance) + netAmount,
              updated_at: new Date().toISOString(),
            }).eq("id", balance.id);
          } else {
            await cFromEdge(admin, "merchant_balances").insert({
              merchant_id: merchantAcct.id,
              currency: order.currency || "AED",
              pending_balance: 0,
              available_balance: netAmount,
              locked_balance: 0,
            });
          }
        }
      }

      return new Response(JSON.stringify({ order: updated }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    throw new Error(`Unknown action: ${action}`);
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
}));
