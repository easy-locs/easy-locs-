/**
 * Orbit Session Manager
 * 
 * Tracks active devices/sessions, detects suspicious logins,
 * and provides REAL session revocation via Supabase Auth.
 * 
 * FIXED: Deduplicates sessions by user_id + device_fingerprint
 * to prevent 189+ ghost sessions from accumulating.
 */

import { supabase } from "@/integrations/supabase/client";
import { getDeviceFingerprint } from "./orbit-keystore";

interface SessionInfo {
  device_fingerprint: string;
  device_label: string;
  browser: string;
  os: string;
}

function parseUserAgent(): { browser: string; os: string; label: string } {
  const ua = navigator.userAgent;
  let browser = "Unknown";
  let os = "Unknown";

  if (ua.includes("Firefox/")) browser = "Firefox";
  else if (ua.includes("Edg/")) browser = "Edge";
  else if (ua.includes("Chrome/") && !ua.includes("Edg/")) browser = "Chrome";
  else if (ua.includes("Safari/") && !ua.includes("Chrome/")) browser = "Safari";

  if (ua.includes("iPhone") || ua.includes("iPad")) os = "iOS";
  else if (ua.includes("Android")) os = "Android";
  else if (ua.includes("Mac OS")) os = "macOS";
  else if (ua.includes("Windows")) os = "Windows";
  else if (ua.includes("Linux")) os = "Linux";

  return { browser, os, label: `${browser} on ${os}` };
}

export interface DeviceSession {
  id: string;
  device_fingerprint: string;
  device_label: string;
  browser: string;
  os: string;
  is_current: boolean;
  last_active_at: string;
  created_at: string;
}

export interface LoginEvent {
  id: string;
  device_label: string;
  event_type: string;
  created_at: string;
  is_new_device: boolean;
}

export async function registerDeviceSession(userId: string): Promise<{
  isNewDevice: boolean;
  sessionInfo: SessionInfo;
}> {
  const fingerprint = await getDeviceFingerprint();
  const { browser, os, label } = parseUserAgent();

  const sessionInfo: SessionInfo = {
    device_fingerprint: fingerprint,
    device_label: label,
    browser,
    os,
  };

  // First deduplicate: remove all but the most recent session for this fingerprint
  await deduplicateSessions(userId, fingerprint);

  const { data: existing } = await supabase
    .from("user_sessions")
    .select("id, last_active_at")
    .eq("user_id", userId)
    .eq("device_fingerprint", fingerprint)
    .order("last_active_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const isNewDevice = !existing;

  if (existing) {
    await supabase
      .from("user_sessions")
      .update({ last_active_at: new Date().toISOString(), device_label: label })
      .eq("id", existing.id);
  } else {
    await supabase.from("user_sessions").insert({
      user_id: userId,
      device_fingerprint: fingerprint,
      device_label: label,
      browser,
      os,
      is_current: true,
      last_active_at: new Date().toISOString(),
    });

    await logLoginEvent(userId, fingerprint, label, true);
  }

  // Auto-cleanup: remove stale sessions (>7 days) and enforce max 5
  await cleanupStaleSessions(userId, 7);
  await enforceMaxSessions(userId, 5);

  return { isNewDevice, sessionInfo };
}

/**
 * Deduplicate sessions — keep only the most recent session per device_fingerprint.
 * This fixes the 189+ sessions problem caused by duplicate inserts.
 */
async function deduplicateSessions(userId: string, fingerprint: string): Promise<void> {
  const { data: dupes } = await supabase
    .from("user_sessions")
    .select("id, last_active_at")
    .eq("user_id", userId)
    .eq("device_fingerprint", fingerprint)
    .order("last_active_at", { ascending: false });

  if (!dupes || dupes.length <= 1) return;

  // Keep the first (most recent), delete the rest
  const toDelete = dupes.slice(1).map(s => s.id);
  if (toDelete.length > 0) {
    await supabase
      .from("user_sessions")
      .delete()
      .in("id", toDelete);
    console.log(`[SessionManager] Cleaned ${toDelete.length} duplicate sessions for fingerprint`);
  }
}

async function logLoginEvent(
  userId: string,
  fingerprint: string,
  deviceLabel: string,
  isNewDevice: boolean
) {
  await supabase.from("login_events").insert({
    user_id: userId,
    device_fingerprint: fingerprint,
    device_label: deviceLabel,
    is_new_device: isNewDevice,
    event_type: isNewDevice ? "new_device_login" : "login",
  });
}

export async function getUserSessions(userId: string): Promise<DeviceSession[]> {
  // First deduplicate ALL sessions for this user
  await deduplicateAllSessions(userId);

  const { data } = await supabase
    .from("user_sessions")
    .select("*")
    .eq("user_id", userId)
    .order("last_active_at", { ascending: false })
    .limit(10); // Hard cap

  return (data || []) as unknown as DeviceSession[];
}

/**
 * Deduplicate ALL sessions for a user — one session per unique device_fingerprint.
 */
async function deduplicateAllSessions(userId: string): Promise<void> {
  const { data: all } = await supabase
    .from("user_sessions")
    .select("id, device_fingerprint, last_active_at")
    .eq("user_id", userId)
    .order("last_active_at", { ascending: false });

  if (!all || all.length <= 5) return;

  // Group by fingerprint, keep only the most recent per fingerprint
  const seen = new Set<string>();
  const toDelete: string[] = [];

  for (const s of all) {
    if (seen.has(s.device_fingerprint)) {
      toDelete.push(s.id);
    } else {
      seen.add(s.device_fingerprint);
    }
  }

  if (toDelete.length > 0) {
    // Delete in batches of 50
    for (let i = 0; i < toDelete.length; i += 50) {
      const batch = toDelete.slice(i, i + 50);
      await supabase.from("user_sessions").delete().in("id", batch);
    }
    console.log(`[SessionManager] Deduplicated ${toDelete.length} total sessions`);
  }
}

/**
 * Revoke a single session
 */
export async function revokeSession(sessionId: string): Promise<boolean> {
  const { error } = await supabase
    .from("user_sessions")
    .delete()
    .eq("id", sessionId);

  if (error) {
    console.error("[SessionManager] Failed to revoke session:", error);
    return false;
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    const fingerprint = await getDeviceFingerprint();
    await supabase.from("login_events").insert({
      user_id: user.id,
      device_fingerprint: fingerprint,
      device_label: "Session revoked",
      is_new_device: false,
      event_type: "session_revoked",
    });
  }

  return true;
}

/**
 * Revoke ALL other sessions — the nuclear option.
 */
export async function revokeAllOtherSessions(userId: string): Promise<boolean> {
  const fingerprint = await getDeviceFingerprint();

  // CRITICAL: Actually revoke auth tokens server-side
  const { error: signOutError } = await supabase.auth.signOut({ scope: "others" });
  if (signOutError) {
    console.error("[SessionManager] Failed to revoke other auth sessions:", signOutError);
    return false;
  }

  // Clean up tracking records
  await supabase
    .from("user_sessions")
    .delete()
    .eq("user_id", userId)
    .neq("device_fingerprint", fingerprint);

  // Log the event
  await supabase.from("login_events").insert({
    user_id: userId,
    device_fingerprint: fingerprint,
    device_label: "All other sessions revoked",
    is_new_device: false,
    event_type: "all_sessions_revoked",
  });

  return true;
}

export async function getSuspiciousLogins(userId: string, limit = 5): Promise<LoginEvent[]> {
  const { data } = await supabase
    .from("login_events")
    .select("*")
    .eq("user_id", userId)
    .eq("is_new_device", true)
    .order("created_at", { ascending: false })
    .limit(limit);

  return (data || []) as unknown as LoginEvent[];
}

/**
 * Clean up stale sessions — removes sessions inactive for more than `maxAgeDays`.
 */
export async function cleanupStaleSessions(userId: string, maxAgeDays = 7): Promise<number> {
  const cutoff = new Date(Date.now() - maxAgeDays * 24 * 60 * 60 * 1000).toISOString();
  const { data } = await supabase
    .from("user_sessions")
    .delete()
    .eq("user_id", userId)
    .lt("last_active_at", cutoff)
    .select("id");

  return data?.length || 0;
}

/**
 * Enforce maximum active sessions.
 */
export async function enforceMaxSessions(userId: string, maxSessions = 5): Promise<number> {
  const fingerprint = await getDeviceFingerprint();

  const { data: sessions } = await supabase
    .from("user_sessions")
    .select("id, device_fingerprint, last_active_at")
    .eq("user_id", userId)
    .order("last_active_at", { ascending: false });

  if (!sessions || sessions.length <= maxSessions) return 0;

  const toKeep = new Set<string>();
  // Always keep current device
  for (const s of sessions) {
    if (s.device_fingerprint === fingerprint) { toKeep.add(s.id); continue; }
    if (toKeep.size < maxSessions) toKeep.add(s.id);
  }

  const toRevoke = sessions.filter(s => !toKeep.has(s.id));
  if (toRevoke.length === 0) return 0;

  await supabase
    .from("user_sessions")
    .delete()
    .in("id", toRevoke.map(s => s.id));

  return toRevoke.length;
}

export async function checkSuspiciousLogin(userId: string): Promise<{
  isSuspicious: boolean;
  reason?: string;
}> {
  const fingerprint = await getDeviceFingerprint();

  const { data: known } = await supabase
    .from("user_sessions")
    .select("id")
    .eq("user_id", userId)
    .eq("device_fingerprint", fingerprint)
    .maybeSingle();

  if (!known) {
    const { count } = await supabase
      .from("user_sessions")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId);

    if ((count || 0) > 0) {
      return {
        isSuspicious: true,
        reason: "Nouvel appareil détecté. Si ce n'était pas vous, changez votre mot de passe immédiatement.",
      };
    }
  }

  return { isSuspicious: false };
}
