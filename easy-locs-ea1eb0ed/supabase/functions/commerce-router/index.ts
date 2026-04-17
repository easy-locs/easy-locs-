import { createDomainRouter } from "../_shared/domain-router.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { buildCacheHeaders } from "../_shared/cache-headers.ts";
import { invalidateCacheOnMutation } from "../_shared/edge-cache.ts";
import { cachedQuery, QUERY_CACHE_NAMESPACES, invalidateQueryCache } from "../_shared/redis-query-cache.ts";
import { proxyToFunction } from "../_shared/edge-function-consolidation.ts";
import { getCorsHeaders } from "../_shared/cors.ts";

import { cFromEdge, cRpcEdge } from "../_shared/execution/content-mutation.ts";
const CACHE_NS = "commerce";

function getSupabase() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
}

const router = createDomainRouter({
  domain: "commerce",
  routes: [
    {
      method: "POST",
      pattern: "/bookings/list",
      handler: async (ctx) => {
        const { listing_id, status } = ctx.body as { listing_id?: string; status?: string };
        const supabase = getSupabase();

        let query = supabase
          .from("bookings")
          .select("*")
          .eq("user_id", ctx.userId)
          .order("created_at", { ascending: false })
          .limit(100);

        if (listing_id) query = query.eq("listing_id", listing_id);
        if (status) query = query.eq("status", status);

        const { data, error } = await query;
        if (error) {
          return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...ctx.corsHeaders, "Content-Type": "application/json" },
          });
        }

        const cacheHeaders = buildCacheHeaders("user_data");
        return new Response(JSON.stringify({ bookings: data }), {
          headers: { ...ctx.corsHeaders, "Content-Type": "application/json", ...cacheHeaders },
        });
      },
    },
    {
      method: "POST",
      pattern: "/bookings/create",
      handler: async (ctx) => {
        const supabase = getSupabase();
        const booking = ctx.body as Record<string, unknown>;

        const { data, error } = await cFromEdge(supabase, "bookings")
          .insert({ ...booking, user_id: ctx.userId })
          .select()
          .single();

        if (error) {
          return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...ctx.corsHeaders, "Content-Type": "application/json" },
          });
        }

        await invalidateCacheOnMutation(CACHE_NS);
        const cacheHeaders = buildCacheHeaders("mutation");
        return new Response(JSON.stringify({ booking: data }), {
          status: 201,
          headers: { ...ctx.corsHeaders, "Content-Type": "application/json", ...cacheHeaders },
        });
      },
    },
    {
      method: "POST",
      pattern: "/bookings/update",
      handler: async (ctx) => {
        const { id, action: _action, ...rawUpdates } = ctx.body as { id: string; action?: string } & Record<string, unknown>;
        const supabase = getSupabase();

        const ALLOWED_BOOKING_FIELDS = new Set([
          "status", "notes", "scheduled_date", "scheduled_time",
          "cancellation_reason", "rating", "review",
        ]);
        const sanitized: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(rawUpdates)) {
          if (ALLOWED_BOOKING_FIELDS.has(key)) sanitized[key] = value;
        }

        if (Object.keys(sanitized).length === 0) {
          return new Response(JSON.stringify({ error: "No valid fields to update" }), {
            status: 400,
            headers: { ...ctx.corsHeaders, "Content-Type": "application/json" },
          });
        }

        const { data, error } = await cFromEdge(supabase, "bookings")
          .update(sanitized)
          .eq("id", id)
          .eq("user_id", ctx.userId)
          .select()
          .single();

        if (error) {
          return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...ctx.corsHeaders, "Content-Type": "application/json" },
          });
        }

        await invalidateCacheOnMutation(CACHE_NS);
        const cacheHeaders = buildCacheHeaders("mutation");
        return new Response(JSON.stringify({ booking: data }), {
          headers: { ...ctx.corsHeaders, "Content-Type": "application/json", ...cacheHeaders },
        });
      },
    },
    {
      method: "POST",
      pattern: "/orders/list",
      handler: async (ctx) => {
        const supabase = getSupabase();
        const { status } = ctx.body as { status?: string };

        let query = supabase
          .from("orders")
          .select("*")
          .eq("user_id", ctx.userId)
          .order("created_at", { ascending: false })
          .limit(50);

        if (status) query = query.eq("status", status);

        const { data, error } = await query;
        if (error) {
          return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...ctx.corsHeaders, "Content-Type": "application/json" },
          });
        }

        const cacheHeaders = buildCacheHeaders("user_data");
        return new Response(JSON.stringify({ orders: data }), {
          headers: { ...ctx.corsHeaders, "Content-Type": "application/json", ...cacheHeaders },
        });
      },
    },
    {
      method: "POST",
      pattern: "/transactions/list",
      handler: async (ctx) => {
        const supabase = getSupabase();

        const data = await cachedQuery(
          {
            namespace: QUERY_CACHE_NAMESPACES.USER_DASHBOARD,
            keyParts: ["transactions", ctx.userId],
            ttlSeconds: 60,
          },
          async () => {
            const { data, error } = await supabase
              .from("transactions")
              .select("*")
              .eq("user_id", ctx.userId)
              .order("created_at", { ascending: false })
              .limit(100);
            if (error) throw error;
            return data;
          },
        );

        const cacheHeaders = buildCacheHeaders("user_data");
        return new Response(JSON.stringify({ transactions: data }), {
          headers: { ...ctx.corsHeaders, "Content-Type": "application/json", ...cacheHeaders },
        });
      },
    },
    {
      method: "POST",
      pattern: "/payments/create-intent",
      handler: async (ctx) => {
        const supabase = getSupabase();
        const { amount, currency, metadata } = ctx.body as {
          amount: number;
          currency: string;
          metadata?: Record<string, unknown>;
        };

        const { data, error } = await cFromEdge(supabase, "transactions")
          .insert({
            user_id: ctx.userId,
            amount,
            currency: currency || "USD",
            status: "pending",
            transaction_type: "payment",
            metadata,
          })
          .select()
          .single();

        if (error) {
          return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...ctx.corsHeaders, "Content-Type": "application/json" },
          });
        }

        await invalidateQueryCache(QUERY_CACHE_NAMESPACES.USER_DASHBOARD, ["transactions", ctx.userId]);
        await invalidateCacheOnMutation(CACHE_NS);

        const cacheHeaders = buildCacheHeaders("mutation");
        return new Response(JSON.stringify({ transaction: data }), {
          status: 201,
          headers: { ...ctx.corsHeaders, "Content-Type": "application/json", ...cacheHeaders },
        });
      },
    },
    {
      method: "POST",
      pattern: "/esign/create-envelope",
      handler: async (ctx) => {
        const cors = getCorsHeaders(ctx.req);
        return proxyToFunction(ctx.req, "esign-create-envelope", cors, ctx.rawBody);
      },
    },
    {
      method: "POST",
      pattern: "/esign/webhook",
      handler: async (ctx) => {
        const cors = getCorsHeaders(ctx.req);
        return proxyToFunction(ctx.req, "esign-webhook", cors, ctx.rawBody);
      },
      requireAuth: false,
      rateLimit: false,
    },
    {
      method: "POST",
      pattern: "/order-manage",
      handler: async (ctx) => {
        const cors = getCorsHeaders(ctx.req);
        return proxyToFunction(ctx.req, "order-manage", cors, ctx.rawBody);
      },
    },
    {
      method: "POST",
      pattern: "/shop-import",
      handler: async (ctx) => {
        const cors = getCorsHeaders(ctx.req);
        return proxyToFunction(ctx.req, "shop-import-processor", cors, ctx.rawBody);
      },
    },
    {
      method: "POST",
      pattern: "/social-preview",
      handler: async (ctx) => {
        const cors = getCorsHeaders(ctx.req);
        return proxyToFunction(ctx.req, "social-preview", cors, ctx.rawBody);
      },
      requireAuth: false,
    },
    {
      method: "POST",
      pattern: "/uae-scrape-onboard",
      handler: async (ctx) => {
        const cors = getCorsHeaders(ctx.req);
        return proxyToFunction(ctx.req, "uae-scrape-onboard", cors, ctx.rawBody);
      },
    },
  ],
});

Deno.serve(router);
