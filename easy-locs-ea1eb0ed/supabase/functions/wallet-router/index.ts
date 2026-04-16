import { createDomainRouter } from "../_shared/domain-router.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { buildCacheHeaders } from "../_shared/cache-headers.ts";
import { invalidateCacheOnMutation } from "../_shared/edge-cache.ts";
import { proxyToFunction } from "../_shared/edge-function-consolidation.ts";
import { getCorsHeaders } from "../_shared/cors.ts";

function getSupabase() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
}

const router = createDomainRouter({
  domain: "wallet",
  routes: [
    {
      method: "POST",
      pattern: "/balance",
      handler: async (ctx) => {
        const supabase = getSupabase();

        const { data, error } = await supabase
          .from("wallet_accounts")
          .select("id, owner_user_id, currency, available_balance, balance, balance_locked, pending_balance, status, updated_at")
          .eq("owner_user_id", ctx.userId)
          .eq("status", "active")
          .maybeSingle();

        if (error) {
          return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...ctx.corsHeaders, "Content-Type": "application/json" },
          });
        }

        const cacheHeaders = buildCacheHeaders("user_data");
        return new Response(JSON.stringify({ wallet: data }), {
          headers: { ...ctx.corsHeaders, "Content-Type": "application/json", ...cacheHeaders },
        });
      },
    },
    {
      method: "POST",
      pattern: "/transactions",
      handler: async (ctx) => {
        const supabase = getSupabase();
        const { limit: reqLimit } = ctx.body as { limit?: number };
        const queryLimit = Math.min(reqLimit ?? 50, 200);

        const { data, error } = await supabase
          .from("wallet_transactions")
          .select("*")
          .eq("sender_id", ctx.userId)
          .order("created_at", { ascending: false })
          .limit(queryLimit);

        if (error) {
          return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...ctx.corsHeaders, "Content-Type": "application/json" },
          });
        }

        const cacheHeaders = buildCacheHeaders("user_data");
        return new Response(JSON.stringify({ transactions: data }), {
          headers: { ...ctx.corsHeaders, "Content-Type": "application/json", ...cacheHeaders },
        });
      },
    },
    {
      method: "POST",
      pattern: "/transfer",
      handler: async (ctx) => {
        const supabase = getSupabase();
        const { recipient_id, amount, currency, reference } = ctx.body as {
          recipient_id: string;
          amount: number;
          currency?: string;
          reference?: string;
        };

        if (!recipient_id || !amount || amount <= 0) {
          return new Response(
            JSON.stringify({ error: "Invalid transfer parameters" }),
            { status: 400, headers: { ...ctx.corsHeaders, "Content-Type": "application/json" } },
          );
        }

        const { data, error } = await supabase
          .from("wallet_transactions")
          .insert({
            sender_id: ctx.userId,
            recipient_id,
            amount,
            currency: currency || "AED",
            context_type: "transfer",
            title: "Transfer",
            subtitle: reference || null,
            status: "pending",
          })
          .select()
          .single();

        if (error) {
          return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...ctx.corsHeaders, "Content-Type": "application/json" },
          });
        }

        await invalidateCacheOnMutation("wallet");
        const cacheHeaders = buildCacheHeaders("mutation");
        return new Response(JSON.stringify({ transaction: data }), {
          status: 201,
          headers: { ...ctx.corsHeaders, "Content-Type": "application/json", ...cacheHeaders },
        });
      },
    },
    {
      method: "POST",
      pattern: "/topup",
      handler: async (ctx) => {
        const supabase = getSupabase();
        const { amount, currency, payment_method } = ctx.body as {
          amount: number;
          currency?: string;
          payment_method?: string;
        };

        if (!amount || amount <= 0) {
          return new Response(
            JSON.stringify({ error: "Invalid amount" }),
            { status: 400, headers: { ...ctx.corsHeaders, "Content-Type": "application/json" } },
          );
        }

        const { data, error } = await supabase
          .from("wallet_transactions")
          .insert({
            sender_id: ctx.userId,
            amount,
            currency: currency || "AED",
            context_type: "topup",
            title: "Top Up",
            subtitle: payment_method || "card",
            status: "pending",
          })
          .select()
          .single();

        if (error) {
          return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...ctx.corsHeaders, "Content-Type": "application/json" },
          });
        }

        await invalidateCacheOnMutation("wallet");
        const cacheHeaders = buildCacheHeaders("mutation");
        return new Response(JSON.stringify({ transaction: data }), {
          status: 201,
          headers: { ...ctx.corsHeaders, "Content-Type": "application/json", ...cacheHeaders },
        });
      },
    },
    {
      method: "POST",
      pattern: "/ops",
      handler: async (ctx) => {
        const cors = getCorsHeaders(ctx.req);
        return proxyToFunction(ctx.req, "wallet-ops", cors, ctx.rawBody);
      },
    },
    {
      method: "POST",
      pattern: "/pin",
      handler: async (ctx) => {
        const cors = getCorsHeaders(ctx.req);
        return proxyToFunction(ctx.req, "wallet-pin", cors, ctx.rawBody);
      },
    },
    {
      method: "POST",
      pattern: "/commission-split",
      handler: async (ctx) => {
        const cors = getCorsHeaders(ctx.req);
        return proxyToFunction(ctx.req, "commission-split", cors, ctx.rawBody);
      },
    },
    {
      method: "POST",
      pattern: "/purchase-locs",
      handler: async (ctx) => {
        const cors = getCorsHeaders(ctx.req);
        return proxyToFunction(ctx.req, "purchase-locs", cors, ctx.rawBody);
      },
    },
    {
      method: "POST",
      pattern: "/payout-request",
      handler: async (ctx) => {
        const cors = getCorsHeaders(ctx.req);
        return proxyToFunction(ctx.req, "payout-request-create", cors, ctx.rawBody);
      },
    },
    {
      method: "POST",
      pattern: "/qr-payment",
      handler: async (ctx) => {
        const cors = getCorsHeaders(ctx.req);
        return proxyToFunction(ctx.req, "qr-payment-session", cors, ctx.rawBody);
      },
    },
    {
      method: "POST",
      pattern: "/check-subscription",
      handler: async (ctx) => {
        const cors = getCorsHeaders(ctx.req);
        return proxyToFunction(ctx.req, "check-subscription", cors, ctx.rawBody);
      },
    },
    {
      method: "POST",
      pattern: "/award-loyalty-points",
      handler: async (ctx) => {
        const cors = getCorsHeaders(ctx.req);
        return proxyToFunction(ctx.req, "award-loyalty-points", cors, ctx.rawBody);
      },
    },
    {
      method: "POST",
      pattern: "/orbit-payment",
      handler: async (ctx) => {
        const cors = getCorsHeaders(ctx.req);
        return proxyToFunction(ctx.req, "orbit-payment", cors, ctx.rawBody);
      },
    },
    {
      method: "POST",
      pattern: "/crypto/payment",
      handler: async (ctx) => {
        const cors = getCorsHeaders(ctx.req);
        return proxyToFunction(ctx.req, "crypto-payment", cors, ctx.rawBody);
      },
    },
    {
      method: "POST",
      pattern: "/crypto/webhook",
      handler: async (ctx) => {
        const cors = getCorsHeaders(ctx.req);
        return proxyToFunction(ctx.req, "crypto-webhook", cors, ctx.rawBody);
      },
      requireAuth: false,
      rateLimit: false,
    },
    {
      method: "POST",
      pattern: "/mobile-money/payment",
      handler: async (ctx) => {
        const cors = getCorsHeaders(ctx.req);
        return proxyToFunction(ctx.req, "mobile-money-payment", cors, ctx.rawBody);
      },
    },
    {
      method: "POST",
      pattern: "/mobile-money/webhook",
      handler: async (ctx) => {
        const cors = getCorsHeaders(ctx.req);
        return proxyToFunction(ctx.req, "mobile-money-webhook", cors, ctx.rawBody);
      },
      requireAuth: false,
      rateLimit: false,
    },
    {
      method: "POST",
      pattern: "/process-referral-reward",
      handler: async (ctx) => {
        const cors = getCorsHeaders(ctx.req);
        return proxyToFunction(ctx.req, "process-referral-reward", cors, ctx.rawBody);
      },
    },
  ],
});

Deno.serve(router);

