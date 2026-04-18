import { requireRouterOrigin } from "../_shared/edge-function-consolidation.ts";
import { requireAuthenticatedUser } from "../_shared/edge-auth.ts";
import { rejectQuerySecrets } from "../_shared/reject-query-secrets.ts";
import {
  redisGet,
  redisSet,
  redisDel,
  isRedisAvailable,
} from "../_shared/redis-client.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-trace-id, x-span-id, x-parent-span-id, x-request-id, traceparent",
};

const PUBLIC_READ_PREFIXES = [
  "presence:",
  "last_seen:",
  "active_users:",
];

function isReadAllowed(key: string, _userId: string): boolean {
  if (PUBLIC_READ_PREFIXES.some((prefix) => key.startsWith(prefix))) return true;
  if (key.startsWith("identity:")) return true;
  return false;
}

function isUserScopedWriteAllowed(key: string, userId: string): boolean {
  if (key === `identity:${userId}`) return true;
  if (key === `presence:${userId}`) return true;
  if (key === `last_seen:${userId}`) return true;
  if (key.startsWith(`session:${userId}:`)) return true;
  if (key.startsWith(`typing:`) && key.endsWith(`:${userId}`)) return true;
  return false;
}

Deno.serve(async (req) => {
  const __qsCheck = rejectQuerySecrets(req); if (__qsCheck.rejected) return __qsCheck.response!;
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const routerCheck = requireRouterOrigin(req);
  if (!routerCheck.allowed) return routerCheck.response!;
  try {
    const authCheck = await requireAuthenticatedUser(req);
    if (!authCheck.authorized) return authCheck.response!;

    const userId = authCheck.userId!;

    if (!isRedisAvailable()) {
      return new Response(
        JSON.stringify({ error: "Redis not available" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 503 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const action = body.action as string;

    if (action === "get") {
      const key = body.key as string;
      if (!key || !isReadAllowed(key, userId)) {
        return new Response(
          JSON.stringify({ error: "Key not allowed for read" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 403 }
        );
      }

      const value = await redisGet(key);
      return new Response(
        JSON.stringify({ value }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "set") {
      const { key, value, ttl_seconds } = body;
      if (!key || !isUserScopedWriteAllowed(key, userId)) {
        return new Response(
          JSON.stringify({ error: "Key not allowed for write" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 403 }
        );
      }

      await redisSet(key, value, ttl_seconds);
      return new Response(
        JSON.stringify({ stored: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "del") {
      const keys = (body.keys as string[]) ?? [];
      const validKeys = keys.filter((k: string) => isUserScopedWriteAllowed(k, userId));
      if (validKeys.length === 0) {
        return new Response(
          JSON.stringify({ deleted: 0 }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const deleted = await redisDel(...validKeys);
      return new Response(
        JSON.stringify({ deleted }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "incr") {
      const incrKey = body.key as string;
      if (!incrKey || !isUserScopedWriteAllowed(incrKey, userId)) {
        return new Response(
          JSON.stringify({ error: "Key not allowed for incr" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 403 }
        );
      }

      const { redisIncr: serverIncr } = await import("../_shared/redis-client.ts");
      const value = await serverIncr(incrKey);
      return new Response(
        JSON.stringify({ value }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "expire") {
      const expireKey = body.key as string;
      const seconds = body.seconds as number;
      if (!expireKey || !isUserScopedWriteAllowed(expireKey, userId) || !seconds) {
        return new Response(
          JSON.stringify({ error: "Key not allowed for expire" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 403 }
        );
      }

      const { redisExpire: serverExpire } = await import("../_shared/redis-client.ts");
      const ok = await serverExpire(expireKey, seconds);
      return new Response(
        JSON.stringify({ ok }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Unknown action. Use: get, set, del, incr, expire" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
    );
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return new Response(
      JSON.stringify({ error: msg }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
