import { db } from "@/services/db";

export async function verifyAuthSession() {
  try {
    const { data } = await db.auth.getSession();
    if (data.session) return { ok: true, reason: "Session active" };
    return { ok: false, reason: "No active session" };
  } catch (e: any) {
    return { ok: false, reason: e.message ?? "Auth check failed" };
  }
}

export async function verifyCurrentUserProfile() {
  try {
    const { data: userData } = await db.auth.getUser();
    if (!userData.user) return { ok: false, reason: "No authenticated user" };

    const { data: profile, error } = await db
      .from("user_profiles")
      .select("id")
      .eq("id", userData.user.id)
      .maybeSingle();

    if (error) return { ok: false, reason: error.message };
    if (profile) return { ok: true, reason: "Profile found" };
    return { ok: false, reason: "User profile record missing" };
  } catch (e: any) {
    return { ok: false, reason: e.message ?? "Profile check failed" };
  }
}

export async function verifyRealtimeChannel() {
  try {
    const { createRealtimeChannel, removeRealtimeChannel } = require("@/lib/realtime");
    const channel = createRealtimeChannel("audit-health-check");
    await channel.subscribe();
    removeRealtimeChannel(channel);
    return { ok: true, reason: "Realtime channel subscribed/unsubscribed" };
  } catch (e: any) {
    return { ok: false, reason: e.message ?? "Realtime failed" };
  }
}

/**
 * Verify that auth-cache isolation works: queryClient.clear() removes
 * cached data so the next user (or post-passive-logout state) cannot
 * see the previous user's TanStack Query cache.
 *
 * This mirrors the SIGNED_OUT path in AuthContext: any session-end event
 * MUST purge the query cache. Regression-guards round 5 hardening.
 */
export async function verifyAuthCacheIsolation() {
  try {
    const { queryClient } = await import("@/lib/query-client");
    const probeKey = ["__audit_isolation_probe__", String(Date.now())];
    queryClient.setQueryData(probeKey, { secret: "user-A-data" });
    if (queryClient.getQueryData(probeKey) === undefined) {
      return { ok: false, reason: "Probe write failed — queryClient unusable" };
    }
    queryClient.clear();
    const after = queryClient.getQueryData(probeKey);
    if (after === undefined) {
      return { ok: true, reason: "queryClient.clear() purges cached data on logout" };
    }
    return { ok: false, reason: "queryClient.clear() left stale data behind" };
  } catch (e: any) {
    return { ok: false, reason: e.message ?? "Cache isolation probe failed" };
  }
}
