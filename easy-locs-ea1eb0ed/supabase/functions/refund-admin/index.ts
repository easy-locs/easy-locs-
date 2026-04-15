import Stripe from "npm:stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { checkServerRateLimit, rateLimitResponse } from "../_shared/server-rate-limiter.ts";

const logStep = (step: string, details?: unknown) =>
  console.log(`[REFUND-ADMIN] ${step}${details ? ` - ${JSON.stringify(details)}` : ""}`);

const BOOKING_TABLES: Record<string, string> = {
  marketplace: "marketplace_bookings",
  storefront: "storefront_orders",
  concierge: "concierge_orders",
  rent: "rent_calls",
  property: "bookings",
};

function resolveBookingTable(bookingType: string): string {
  return BOOKING_TABLES[bookingType] || "marketplace_bookings";
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const rlResult = await checkServerRateLimit(req, "refund-admin");
    if (!rlResult.allowed) return rateLimitResponse(rlResult);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401,
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");

    const supabaseUser = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userError } = await supabaseUser.auth.getUser();
    const user = userData?.user;
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Authentication failed" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401,
      });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();
    const action: string = body.action;

    logStep("Request", { action, userId: user.id });

    const adminActions = ["list", "approve", "reject"];
    if (adminActions.includes(action)) {
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

      const isPlatformAdmin = profile?.role === "admin" || profile?.role === "super_admin";

      if (!isPlatformAdmin) {
        let hasOrgAdminRole = false;

        if (action === "approve" || action === "reject") {
          const refundId = body.refund_id;
          if (refundId) {
            const { data: refundReq } = await supabaseAdmin
              .from("refund_requests")
              .select("context_id, context_type")
              .eq("id", refundId)
              .maybeSingle();

            if (refundReq) {
              const refundTable = resolveBookingTable(refundReq.context_type);
              const { data: refundBooking } = await supabaseAdmin
                .from(refundTable)
                .select("org_id")
                .eq("id", refundReq.context_id)
                .maybeSingle();

              if (refundBooking?.org_id) {
                const { data: membership } = await supabaseAdmin
                  .from("org_members")
                  .select("role")
                  .eq("user_id", user.id)
                  .eq("org_id", refundBooking.org_id)
                  .maybeSingle();

                hasOrgAdminRole = !!membership && ["owner", "admin", "agent"].includes(membership.role);
              }
            }
          }
        } else {
          const { data: orgMemberships } = await supabaseAdmin
            .from("org_members")
            .select("role")
            .eq("user_id", user.id);

          hasOrgAdminRole = (orgMemberships || []).some((m: Record<string, unknown>) =>
            ["owner", "admin", "agent"].includes(m.role as string)
          );
        }

        if (!hasOrgAdminRole) {
          return new Response(JSON.stringify({ error: "Insufficient permissions" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 403,
          });
        }
      }
    }

    switch (action) {
      case "list": {
        const statusFilter: string = body.status || "pending";

        const { data: profile } = await supabaseAdmin
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .maybeSingle();
        const isGlobalAdmin = profile?.role === "admin" || profile?.role === "super_admin";

        let refunds: Record<string, unknown>[] = [];

        if (isGlobalAdmin) {
          let query = supabaseAdmin
            .from("refund_requests")
            .select("*")
            .order("created_at", { ascending: false })
            .limit(50);

          if (statusFilter !== "all") {
            query = query.eq("refund_status", statusFilter);
          }

          const { data, error } = await query;
          if (error) throw error;
          refunds = data || [];
        } else {
          const { data: orgMemberships } = await supabaseAdmin
            .from("org_members")
            .select("org_id")
            .eq("user_id", user.id)
            .in("role", ["owner", "admin", "agent"]);

          const orgIds = (orgMemberships || []).map((m: Record<string, unknown>) => m.org_id as string);

          if (orgIds.length === 0) {
            return new Response(
              JSON.stringify({ refunds: [] }),
              { headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }

          let query = supabaseAdmin
            .from("refund_requests")
            .select("*")
            .order("created_at", { ascending: false })
            .limit(50);

          if (statusFilter !== "all") {
            query = query.eq("refund_status", statusFilter);
          }

          const { data: allRefunds, error } = await query;
          if (error) throw error;

          for (const r of allRefunds || []) {
            const rTable = resolveBookingTable(r.context_type);
            const { data: booking } = await supabaseAdmin
              .from(rTable)
              .select("org_id")
              .eq("id", r.context_id)
              .maybeSingle();

            if (booking && orgIds.includes(booking.org_id)) {
              refunds.push(r);
            }
          }
        }

        return new Response(
          JSON.stringify({ refunds }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "approve": {
        const refundId: string = body.refund_id;

        if (!refundId) {
          return new Response(JSON.stringify({ error: "refund_id required" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400,
          });
        }

        const { data: refundReq } = await supabaseAdmin
          .from("refund_requests")
          .select("*")
          .eq("id", refundId)
          .single();

        if (!refundReq) {
          return new Response(JSON.stringify({ error: "Refund request not found" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 404,
          });
        }

        if (refundReq.refund_status !== "pending") {
          return new Response(JSON.stringify({
            error: `Refund already ${refundReq.refund_status}`,
            current_status: refundReq.refund_status,
          }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 409,
          });
        }

        let stripeRefundId: string | null = null;
        let refundMethod = "wallet_credit";

        const bId: string = refundReq.context_id;
        const bType: string = refundReq.context_type;
        const table = resolveBookingTable(bType);

        if (stripeKey && bId) {
          const { data: booking } = await supabaseAdmin
            .from(table)
            .select("stripe_payment_intent_id, payment_method, org_id")
            .eq("id", bId)
            .maybeSingle();

          const stripeBackedMethods = ["stripe", "card", "apple_pay", "google_pay"];
          if (booking?.stripe_payment_intent_id && stripeBackedMethods.includes(booking?.payment_method)) {
            refundMethod = "stripe_refund";
            const stripe = new Stripe(stripeKey, { apiVersion: "2025-04-30.basil" });
            try {
              const refund = await stripe.refunds.create({
                payment_intent: booking.stripe_payment_intent_id,
                reason: "requested_by_customer",
              });
              stripeRefundId = refund.id;
              logStep("Stripe refund created", { refundId: refund.id });
            } catch (err: unknown) {
              const msg = err instanceof Error ? err.message : String(err);
              logStep("Stripe refund failed", { error: msg });

              await supabaseAdmin
                .from("refund_requests")
                .update({
                  refund_status: "failed",
                  processed_at: new Date().toISOString(),
                  processed_by: user.id,
                })
                .eq("id", refundId);

              return new Response(
                JSON.stringify({ success: false, error: `Stripe refund failed: ${msg}` }),
                { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
              );
            }
          }
        }

        await supabaseAdmin
          .from("refund_requests")
          .update({
            refund_status: "processed",
            processed_at: new Date().toISOString(),
            processed_by: user.id,
            stripe_refund_id: stripeRefundId,
          })
          .eq("id", refundId);

        const sourceTable = resolveBookingTable(bType);
        await supabaseAdmin
          .from(sourceTable)
          .update({
            payment_status: "refunded",
            refunded_at: new Date().toISOString(),
          })
          .eq("id", bId);
        logStep("Booking/order marked as refunded", { table: sourceTable, id: bId });

        if (refundMethod === "wallet_credit" && refundReq.user_id && refundReq.amount > 0) {
          const { data: walletAccount } = await supabaseAdmin
            .from("wallet_accounts")
            .select("id, balance")
            .eq("owner_user_id", refundReq.user_id)
            .eq("is_default", true)
            .maybeSingle();

          if (walletAccount) {
            await supabaseAdmin
              .from("wallet_accounts")
              .update({ balance: (walletAccount.balance || 0) + refundReq.amount })
              .eq("id", walletAccount.id);

            await supabaseAdmin.from("wallet_ledger_entries").insert({
              wallet_account_id: walletAccount.id,
              type: "credit",
              amount: refundReq.amount,
              currency: refundReq.currency || "EUR",
              description: `Refund approved (${refundId})`,
              reference_type: "refund",
              reference_id: refundId,
              status: "completed",
            });

            logStep("Wallet credited for refund (non-Stripe payment)", { amount: refundReq.amount });
          }
        }

        await supabaseAdmin.from("notifications").insert({
          id: crypto.randomUUID(),
          user_id: refundReq.user_id,
          title: "Refund Processed",
          body: `Your refund of ${refundReq.amount} ${refundReq.currency || "EUR"} has been approved and processed.`,
          type: "wallet_refund",
          read: false,
          metadata_json: {
            refund_id: refundId,
            amount: refundReq.amount,
            currency: refundReq.currency,
            method: refundMethod,
          },
        });

        await supabaseAdmin.from("audit_logs").insert({
          user_id: user.id,
          action: "refund_approved",
          metadata_json: {
            refund_id: refundId,
            stripe_refund_id: stripeRefundId,
            refund_method: refundMethod,
            amount: refundReq.amount,
          },
        });

        return new Response(
          JSON.stringify({
            success: true,
            stripe_refund_id: stripeRefundId,
            refund_method: refundMethod,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "reject": {
        const refundId: string = body.refund_id;
        const reason: string = body.reason;

        if (!refundId) {
          return new Response(JSON.stringify({ error: "refund_id required" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400,
          });
        }

        await supabaseAdmin
          .from("refund_requests")
          .update({
            refund_status: "rejected",
            processed_at: new Date().toISOString(),
            processed_by: user.id,
            rejection_reason: reason || "Rejected by admin",
          })
          .eq("id", refundId);

        const { data: refundReq } = await supabaseAdmin
          .from("refund_requests")
          .select("user_id, amount, currency")
          .eq("id", refundId)
          .maybeSingle();

        if (refundReq?.user_id) {
          await supabaseAdmin.from("notifications").insert({
            id: crypto.randomUUID(),
            user_id: refundReq.user_id,
            title: "Refund Request Declined",
            body: reason || "Your refund request has been reviewed and declined.",
            type: "wallet_refund_rejected",
            read: false,
            metadata_json: { refund_id: refundId, reason },
          });
        }

        await supabaseAdmin.from("audit_logs").insert({
          user_id: user.id,
          action: "refund_rejected",
          metadata_json: { refund_id: refundId, reason },
        });

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "request": {
        const bookingId: string = body.booking_id;
        const bookingType: string = body.booking_type || "marketplace";
        const reason: string | undefined = body.reason;

        if (!bookingId) {
          return new Response(JSON.stringify({ error: "booking_id required" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400,
          });
        }

        const table = resolveBookingTable(bookingType);

        const userIdField = bookingType === "rent" ? "tenant_user_id" :
                            bookingType === "property" ? "guest_user_id" :
                            bookingType === "concierge" ? "user_id" :
                            bookingType === "storefront" ? "buyer_id" : "buyer_user_id";

        const { data: booking } = await supabaseAdmin
          .from(table)
          .select("*")
          .eq("id", bookingId)
          .maybeSingle();

        if (!booking) {
          return new Response(JSON.stringify({ error: "Booking not found" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 404,
          });
        }

        const bookingOwnerUserId = booking[userIdField] || booking.user_id || booking.buyer_user_id || booking.tenant_user_id;
        if (bookingOwnerUserId !== user.id) {
          logStep("Ownership check failed", { bookingOwner: bookingOwnerUserId, requestor: user.id });
          return new Response(JSON.stringify({ error: "You can only request refunds for your own bookings" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 403,
          });
        }

        const amount: number = booking.total || booking.total_price || booking.amount || 0;
        const currency: string = booking.currency || "EUR";

        const { data: existingRefund } = await supabaseAdmin
          .from("refund_requests")
          .select("id, refund_status")
          .eq("context_id", bookingId)
          .eq("user_id", user.id)
          .in("refund_status", ["pending", "approved", "processed"])
          .maybeSingle();

        if (existingRefund) {
          return new Response(JSON.stringify({ error: "A refund request already exists for this booking" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 409,
          });
        }

        const { data: refund, error: insertError } = await supabaseAdmin
          .from("refund_requests")
          .insert({
            user_id: user.id,
            context_type: bookingType,
            context_id: bookingId,
            amount,
            currency,
            reason: reason || null,
            refund_status: "pending",
          })
          .select("id")
          .single();

        if (insertError) throw insertError;

        logStep("Refund request created", { refundId: refund?.id, amount, currency });

        return new Response(
          JSON.stringify({
            success: true,
            refund_id: refund?.id,
            amount,
            currency,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      default:
        return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400,
        });
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logStep("Error", { error: message });
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
