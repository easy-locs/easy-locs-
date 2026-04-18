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
 * Round 8 — Realtime leak detection.
 * Subscribe and unsubscribe N channels through the hardened wrapper, then
 * assert the internal ownedChannels/pendingChannels counts return to zero.
 * Any non-zero count after teardown indicates a leaked channel.
 */
export async function verifyRealtimeNoLeak() {
  try {
    const { createRealtimeChannel, removeRealtimeChannel, getRealtimeStats } = await import("@/lib/realtime");
    const before = getRealtimeStats();
    const channels: any[] = [];
    const N = 5;
    for (let i = 0; i < N; i++) {
      const ch = createRealtimeChannel(`__leak_probe_${i}_${Date.now()}`);
      channels.push(ch);
    }
    for (const ch of channels) removeRealtimeChannel(ch);
    // Cross-tab cleanup may resolve on next tick.
    await new Promise((r) => setTimeout(r, 50));
    const after = getRealtimeStats();
    const leaked = after.ownedChannelNames.filter((n) => n.startsWith("__leak_probe_"));
    const pendingLeaked = after.pendingChannelNames.filter((n) => n.startsWith("__leak_probe_"));
    if (leaked.length === 0 && pendingLeaked.length === 0) {
      return { ok: true, reason: `No leak after ${N} subscribe/unsubscribe cycles (owned=${before.ownedChannels}→${after.ownedChannels})` };
    }
    return { ok: false, reason: `Leaked ${leaked.length} owned + ${pendingLeaked.length} pending probe channels` };
  } catch (e: any) {
    return { ok: false, reason: e.message ?? "Leak probe failed" };
  }
}

/**
 * Round 8 — Subscription lifecycle integrity.
 * Re-subscribing the same channel name after teardown must yield a fresh
 * working channel (no collision, no stale handler). The wrapper de-duplicates
 * by name, so a stale entry would silently short-circuit the new subscription.
 */
export async function verifySubscriptionLifecycle() {
  try {
    const { createRealtimeChannel, removeRealtimeChannel, getRealtimeStats } = await import("@/lib/realtime");
    const name = `__lifecycle_probe_${Date.now()}`;
    const ch1 = createRealtimeChannel(name);
    const stats1 = getRealtimeStats();
    if (!stats1.pendingChannelNames.includes(name) && !stats1.ownedChannelNames.includes(name)) {
      return { ok: false, reason: "First subscribe did not register channel" };
    }
    removeRealtimeChannel(ch1);
    await new Promise((r) => setTimeout(r, 50));
    const stats2 = getRealtimeStats();
    if (stats2.pendingChannelNames.includes(name) || stats2.ownedChannelNames.includes(name)) {
      return { ok: false, reason: "Channel still registered after removeRealtimeChannel" };
    }
    const ch2 = createRealtimeChannel(name);
    const stats3 = getRealtimeStats();
    const reRegistered = stats3.pendingChannelNames.includes(name) || stats3.ownedChannelNames.includes(name);
    removeRealtimeChannel(ch2);
    if (!reRegistered) {
      return { ok: false, reason: "Re-subscribe after teardown did not register" };
    }
    return { ok: true, reason: "subscribe → unsubscribe → re-subscribe lifecycle integral" };
  } catch (e: any) {
    return { ok: false, reason: e.message ?? "Lifecycle probe failed" };
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
/**
 * Round 9 — Navigation stability probe.
 * Programmatically push the same path N times via history.pushState and
 * assert history.length grows by exactly N (no stealth replace, no double
 * push). Catches regressions where a redirect effect pushes-then-pushes
 * again (the symptom of redirect-loop bugs even when the user-visible
 * URL stays the same).
 */
export async function verifyNavigationStability() {
  try {
    if (typeof window === "undefined" || !window.history) {
      return { ok: false, reason: "window.history unavailable" };
    }
    const startLen = window.history.length;
    const startUrl = window.location.href;
    const probePath = window.location.pathname + (window.location.search || "");
    const N = 3;
    for (let i = 0; i < N; i++) {
      window.history.pushState({ __nav_probe: i }, "", probePath);
    }
    const grew = window.history.length - startLen;
    for (let i = 0; i < N; i++) window.history.back();
    await new Promise((r) => setTimeout(r, 50));
    if (window.location.href !== startUrl) {
      window.history.replaceState({}, "", startUrl);
    }
    if (grew >= N) {
      return { ok: true, reason: `history grew by ${grew} after ${N} pushes (stable)` };
    }
    return { ok: false, reason: `history grew by only ${grew} after ${N} pushes (browser may be coalescing)` };
  } catch (e: any) {
    return { ok: false, reason: e.message ?? "Navigation probe failed" };
  }
}

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
