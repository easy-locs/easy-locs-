import { requireRouterOrigin } from "../_shared/edge-function-consolidation.ts";
import { requireAuthenticatedUser } from "../_shared/edge-auth.ts";
import {
  setPresence,
  removePresence,
  getPresence,
  isUserOnline,
  getLastSeen,
  getBulkPresence,
  storeSession,
  getSession,
  removeSession,
} from "../_shared/redis-presence.ts";
import { rejectQuerySecrets } from "../_shared/reject-query-secrets.ts";
import {
  redisIncr,
  redisExpire,
  redisGet,
  redisSet,
  isRedisAvailable,
} from "../_shared/redis-client.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-trace-id, x-span-id, x-parent-span-id, x-request-id, traceparent",
};

const ACTIVE_USERS_KEY = "active_users:count";
const ACTIVE_USERS_TTL = 60;

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
        JSON.stringify({ error: "Redis not available", online: false }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 503 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const action = body.action ?? "heartbeat";

    if (action === "heartbeat") {
      const status = body.status ?? "online";
      const metadata = body.metadata;
      const wasOnline = await isUserOnline(userId);
      const ok = await setPresence(userId, status, metadata);

      if (ok && !wasOnline) {
        await redisIncr(ACTIVE_USERS_KEY);
      } else if (ok && wasOnline) {
        const currentCount = await redisGet<number>(ACTIVE_USERS_KEY);
        if (currentCount === null) {
          await redisSet(ACTIVE_USERS_KEY, 1, ACTIVE_USERS_TTL);
        }
      }

      if (ok) {
        await redisExpire(ACTIVE_USERS_KEY, ACTIVE_USERS_TTL);
      }

      if (ok && body.identity) {
        const identity = body.identity as { name: string; avatar?: string; orbitId?: string };
        await redisSet(`identity:${userId}`, identity, 300).catch(() => {});
      }

      return new Response(
        JSON.stringify({ ok, userId }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "offline") {
      const wasOnline = await isUserOnline(userId);
      await removePresence(userId);

      if (wasOnline) {
        const count = await redisGet<number>(ACTIVE_USERS_KEY);
        if (count && count > 0) {
          await redisSet(ACTIVE_USERS_KEY, count - 1, ACTIVE_USERS_TTL);
        }
      }

      return new Response(
        JSON.stringify({ ok: true, userId }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "status") {
      const targetUserId = body.user_id ?? userId;
      const presence = await getPresence(targetUserId);
      const online = presence !== null;
      const lastSeen = online ? null : await getLastSeen(targetUserId);

      return new Response(
        JSON.stringify({ online, presence, lastSeen }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "bulk_status") {
      const userIds = (body.user_ids as string[]) ?? [];
      if (userIds.length === 0 || userIds.length > 100) {
        return new Response(
          JSON.stringify({ error: "user_ids must be 1-100 entries" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
        );
      }

      const presenceMap = await getBulkPresence(userIds);
      const result: Record<string, { online: boolean; status?: string; lastHeartbeat?: number }> = {};

      for (const [id, data] of presenceMap) {
        result[id] = data
          ? { online: true, status: data.status, lastHeartbeat: data.lastHeartbeat }
          : { online: false };
      }

      return new Response(
        JSON.stringify({ users: result }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "active_count") {
      const count = await redisGet<number>(ACTIVE_USERS_KEY);
      return new Response(
        JSON.stringify({ active_users: count ?? 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "store_session") {
      const sessionId = body.session_id as string;
      const userAgent = body.user_agent as string | undefined;
      if (!sessionId) {
        return new Response(
          JSON.stringify({ error: "session_id required" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
        );
      }

      const ok = await storeSession({
        userId,
        sessionId,
        startedAt: Date.now(),
        userAgent,
      });

      return new Response(
        JSON.stringify({ ok, userId }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "get_session") {
      const sessionId = body.session_id as string;
      if (!sessionId) {
        return new Response(
          JSON.stringify({ error: "session_id required" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
        );
      }

      const session = await getSession(userId, sessionId);
      return new Response(
        JSON.stringify({ session }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "remove_session") {
      const sessionId = body.session_id as string;
      if (!sessionId) {
        return new Response(
          JSON.stringify({ error: "session_id required" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
        );
      }

      await removeSession(userId, sessionId);
      return new Response(
        JSON.stringify({ ok: true, userId }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Unknown action. Use: heartbeat, offline, status, bulk_status, active_count, store_session, get_session, remove_session" }),
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
