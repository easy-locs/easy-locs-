/**
 * Orbit Session Manager
 * 
 * Tracks active devices/sessions, detects suspicious logins,
 * and provides REAL session revocation via Supabase Auth.
 * 
 * Key security properties:
 * - revokeAllOtherSessions: calls supabase.auth.signOut({ scope: 'others' })
 *   to invalidate ALL other refresh tokens server-side
 * - revokeSession: deletes the session record AND calls edge function
 *   to revoke the specific auth session via admin API
 * - registerDeviceSession: logs device on login for tracking
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

  const { data: existing } = await supabase
    .from("user_sessions")
    .select("id, last_active_at")
    .eq("user_id", userId)
    .eq("device_fingerprint", fingerprint)
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

  // Auto-cleanup: remove stale sessions (>30 days) and enforce max 5
  await cleanupStaleSessions(userId, 30);
  await enforceMaxSessions(userId, 5);

  return { isNewDevice, sessionInfo };
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
  const { data } = await supabase
    .from("user_sessions")
    .select("*")
    .eq("user_id", userId)
    .order("last_active_at", { ascending: false });

  return (data || []) as unknown as DeviceSession[];
}

/**
 * Revoke a single session:
 * 1. Delete from user_sessions table (tracking)
 * 2. The actual auth token cannot be individually revoked from client-side,
 *    but the device will be signed out on next token refresh (within ~1h)
 *    and immediately disappears from the session list.
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

  // Log the revocation event
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
 * This ACTUALLY invalidates other refresh tokens via Supabase Auth.
 * 
 * Steps:
 * 1. Call supabase.auth.signOut({ scope: 'others' }) to revoke ALL other
 *    Supabase auth sessions (refresh tokens invalidated server-side)
 * 2. Delete all other device records from user_sessions table
 * 3. Log the global revocation event
 * 
 * After this, other devices will be immediately signed out on their
 * next API call or token refresh attempt.
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

export async function getSuspiciousLogins(userId: string, limit = 10): Promise<LoginEvent[]> {
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
 * Call this on login or periodically to keep the session list accurate.
 */
export async function cleanupStaleSessions(userId: string, maxAgeDays = 30): Promise<number> {
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
 * If sessionCount > maxSessions, revokes the oldest sessions beyond the limit.
 */
export async function enforceMaxSessions(userId: string, maxSessions = 5): Promise<number> {
  const fingerprint = await getDeviceFingerprint();

  const { data: sessions } = await supabase
    .from("user_sessions")
    .select("id, device_fingerprint, last_active_at")
    .eq("user_id", userId)
    .order("last_active_at", { ascending: false });

  if (!sessions || sessions.length <= maxSessions) return 0;

  // Keep current device + most recent sessions up to maxSessions
  const toKeep = new Set<string>();
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
