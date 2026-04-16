import { createDomainRouter } from "../_shared/domain-router.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { buildCacheHeaders, generateETag, checkConditionalRequest } from "../_shared/cache-headers.ts";
import { getCachedResponse, setCachedResponse, invalidateCacheOnMutation } from "../_shared/edge-cache.ts";
import { proxyToFunction } from "../_shared/edge-function-consolidation.ts";
import { getCorsHeaders } from "../_shared/cors.ts";

const CACHE_NS = "identity";

function getSupabase() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
}

const router = createDomainRouter({
  domain: "identity",
  routes: [
    {
      method: "POST",
      pattern: "/profile",
      handler: async (ctx) => {
        const supabase = getSupabase();
        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", ctx.userId)
          .maybeSingle();

        if (error) {
          return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...ctx.corsHeaders, "Content-Type": "application/json" },
          });
        }

        const body = JSON.stringify({ profile: data });
        const cacheHeaders = buildCacheHeaders("user_data");

        return new Response(body, {
          headers: { ...ctx.corsHeaders, "Content-Type": "application/json", ...cacheHeaders },
        });
      },
    },
    {
      method: "POST",
      pattern: "/profile/update",
      handler: async (ctx) => {
        const supabase = getSupabase();
        const rawUpdates = ctx.body as Record<string, unknown>;

        const ALLOWED_PROFILE_FIELDS = new Set([
          "full_name", "display_name", "avatar_url", "bio", "phone",
          "city", "country", "language", "timezone", "currency",
          "notification_preferences", "theme", "onboarding_completed",
        ]);

        const BLOCKED_FIELDS = new Set([
          "id", "role", "is_admin", "is_super_admin", "email",
          "created_at", "updated_at", "stripe_customer_id",
          "subscription_tier", "permissions", "owner_id",
        ]);

        const sanitized: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(rawUpdates)) {
          if (key === "action") continue;
          if (BLOCKED_FIELDS.has(key)) continue;
          if (ALLOWED_PROFILE_FIELDS.has(key)) {
            sanitized[key] = value;
          }
        }

        if (Object.keys(sanitized).length === 0) {
          return new Response(JSON.stringify({ error: "No valid fields to update" }), {
            status: 400,
            headers: { ...ctx.corsHeaders, "Content-Type": "application/json" },
          });
        }

        const { data, error } = await supabase
          .from("profiles")
          .update(sanitized)
          .eq("id", ctx.userId)
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
        return new Response(JSON.stringify({ profile: data }), {
          headers: { ...ctx.corsHeaders, "Content-Type": "application/json", ...cacheHeaders },
        });
      },
    },
    {
      method: "POST",
      pattern: "/send-otp",
      handler: async (ctx) => {
        const { phone, email } = ctx.body as { phone?: string; email?: string };
        const supabase = getSupabase();

        if (phone) {
          const { error } = await supabase.auth.signInWithOtp({ phone });
          if (error) {
            return new Response(JSON.stringify({ error: error.message }), {
              status: 400,
              headers: { ...ctx.corsHeaders, "Content-Type": "application/json" },
            });
          }
        } else if (email) {
          const { error } = await supabase.auth.signInWithOtp({ email });
          if (error) {
            return new Response(JSON.stringify({ error: error.message }), {
              status: 400,
              headers: { ...ctx.corsHeaders, "Content-Type": "application/json" },
            });
          }
        }

        const cacheHeaders = buildCacheHeaders("mutation");
        return new Response(JSON.stringify({ sent: true }), {
          headers: { ...ctx.corsHeaders, "Content-Type": "application/json", ...cacheHeaders },
        });
      },
      requireAuth: false,
    },
    {
      method: "POST",
      pattern: "/verify-otp",
      handler: async (ctx) => {
        const { phone, email, token } = ctx.body as { phone?: string; email?: string; token: string };
        const supabase = getSupabase();

        let result;
        if (phone) {
          result = await supabase.auth.verifyOtp({ phone, token, type: "sms" });
        } else if (email) {
          result = await supabase.auth.verifyOtp({ email, token, type: "email" });
        } else {
          return new Response(JSON.stringify({ error: "Phone or email required" }), {
            status: 400,
            headers: { ...ctx.corsHeaders, "Content-Type": "application/json" },
          });
        }

        if (result.error) {
          return new Response(JSON.stringify({ error: result.error.message }), {
            status: 400,
            headers: { ...ctx.corsHeaders, "Content-Type": "application/json" },
          });
        }

        const cacheHeaders = buildCacheHeaders("mutation");
        return new Response(JSON.stringify({ session: result.data.session }), {
          headers: { ...ctx.corsHeaders, "Content-Type": "application/json", ...cacheHeaders },
        });
      },
      requireAuth: false,
    },
    {
      method: "POST",
      pattern: "/organizations",
      handler: async (ctx) => {
        const supabase = getSupabase();

        const cached = await getCachedResponse(
          ctx.req,
          { ttlSeconds: 120, varyByUser: true, namespace: CACHE_NS },
          ctx.userId,
        );
        if (cached) {
          const cacheHeaders = buildCacheHeaders("listing");
          for (const [k, v] of Object.entries(cacheHeaders)) cached.headers.set(k, v);
          for (const [k, v] of Object.entries(ctx.corsHeaders)) cached.headers.set(k, v);
          return cached;
        }

        const { data, error } = await supabase
          .from("storefront_pages")
          .select("id, name, slug, subcategory, city, logo_url, vertical, owner_id")
          .eq("owner_id", ctx.userId);

        if (error) {
          return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...ctx.corsHeaders, "Content-Type": "application/json" },
          });
        }

        const body = JSON.stringify({ organizations: data });
        await setCachedResponse(
          ctx.req,
          body,
          { ttlSeconds: 120, varyByUser: true, namespace: CACHE_NS },
          ctx.userId,
        );

        const etag = generateETag(body);
        const notModified = checkConditionalRequest(ctx.req, etag, ctx.corsHeaders);
        if (notModified) return notModified;

        const cacheHeaders = buildCacheHeaders({ ...{ maxAge: 60, sMaxAge: 120, staleWhileRevalidate: 30 }, etag });
        return new Response(body, {
          headers: { ...ctx.corsHeaders, "Content-Type": "application/json", ...cacheHeaders },
        });
      },
    },
    {
      method: "POST",
      pattern: "/reveal-contact",
      handler: async (ctx) => {
        const cors = getCorsHeaders(ctx.req);
        return proxyToFunction(ctx.req, "reveal-contact", cors, ctx.rawBody);
      },
    },
    {
      method: "POST",
      pattern: "/guest-session",
      handler: async (ctx) => {
        const cors = getCorsHeaders(ctx.req);
        return proxyToFunction(ctx.req, "guest-session", cors, ctx.rawBody);
      },
      requireAuth: false,
    },
    {
      method: "POST",
      pattern: "/generate-cv",
      handler: async (ctx) => {
        const cors = getCorsHeaders(ctx.req);
        return proxyToFunction(ctx.req, "generate-cv", cors, ctx.rawBody);
      },
    },
  ],
});

Deno.serve(router);
