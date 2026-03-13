/**
 * Orbit Session Manager
 * 
 * Tracks active devices/sessions, detects suspicious logins,
 * and provides session revocation.
 */

import { supabase } from "@/integrations/supabase/client";
import { getDeviceFingerprint } from "./orbit-keystore";

interface SessionInfo {
  device_fingerprint: string;
  device_label: string;
  browser: string;
  os: string;
  country?: string;
  ip_hint?: string;
}

/** Parse user agent into readable device label */
function parseUserAgent(): { browser: string; os: string; label: string } {
  const ua = navigator.userAgent;
  let browser = "Unknown";
  let os = "Unknown";

  // Browser detection
  if (ua.includes("Firefox/")) browser = "Firefox";
  else if (ua.includes("Edg/")) browser = "Edge";
  else if (ua.includes("Chrome/") && !ua.includes("Edg/")) browser = "Chrome";
  else if (ua.includes("Safari/") && !ua.includes("Chrome/")) browser = "Safari";

  // OS detection
  if (ua.includes("iPhone") || ua.includes("iPad")) os = "iOS";
  else if (ua.includes("Android")) os = "Android";
  else if (ua.includes("Mac OS")) os = "macOS";
  else if (ua.includes("Windows")) os = "Windows";
  else if (ua.includes("Linux")) os = "Linux";

  return { browser, os, label: `${browser} on ${os}` };
}

/**
 * Register or update the current device session.
 * Called on login and periodically.
 */
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

  // Check if this device is known
  const { data: existing } = await supabase
    .from("user_sessions" as any)
    .select("id, last_active_at")
    .eq("user_id", userId)
    .eq("device_fingerprint", fingerprint)
    .maybeSingle();

  const isNewDevice = !existing;

  if (existing) {
    // Update last active
    await supabase
      .from("user_sessions" as any)
      .update({
        last_active_at: new Date().toISOString(),
        device_label: label,
      } as any)
      .eq("id", (existing as any).id);
  } else {
    // Insert new session
    await supabase.from("user_sessions" as any).insert({
      user_id: userId,
      device_fingerprint: fingerprint,
      device_label: label,
      browser,
      os,
      is_current: true,
      last_active_at: new Date().toISOString(),
    } as any);

    // Log suspicious login event if new device
    await logLoginEvent(userId, fingerprint, label, true);
  }

  return { isNewDevice, sessionInfo };
}

/** Log a login event for audit / suspicious detection */
async function logLoginEvent(
  userId: string,
  fingerprint: string,
  deviceLabel: string,
  isNewDevice: boolean
) {
  await supabase.from("login_events" as any).insert({
    user_id: userId,
    device_fingerprint: fingerprint,
    device_label: deviceLabel,
    is_new_device: isNewDevice,
    event_type: isNewDevice ? "new_device_login" : "login",
  } as any);
}

/** Get all active sessions for a user */
export async function getUserSessions(userId: string) {
  const { data } = await supabase
    .from("user_sessions" as any)
    .select("*")
    .eq("user_id", userId)
    .order("last_active_at", { ascending: false });

  return (data || []) as Array<{
    id: string;
    device_fingerprint: string;
    device_label: string;
    browser: string;
    os: string;
    is_current: boolean;
    last_active_at: string;
    created_at: string;
  }>;
}

/** Revoke a specific session (logout from device) */
export async function revokeSession(sessionId: string): Promise<boolean> {
  const { error } = await supabase
    .from("user_sessions" as any)
    .delete()
    .eq("id", sessionId);

  return !error;
}

/** Revoke all sessions except current device */
export async function revokeAllOtherSessions(userId: string): Promise<void> {
  const fingerprint = await getDeviceFingerprint();
  
  await supabase
    .from("user_sessions" as any)
    .delete()
    .eq("user_id", userId)
    .neq("device_fingerprint", fingerprint);
}

/** Get recent suspicious login events */
export async function getSuspiciousLogins(userId: string, limit = 10) {
  const { data } = await supabase
    .from("login_events" as any)
    .select("*")
    .eq("user_id", userId)
    .eq("is_new_device", true)
    .order("created_at", { ascending: false })
    .limit(limit);

  return (data || []) as Array<{
    id: string;
    device_label: string;
    event_type: string;
    created_at: string;
    is_new_device: boolean;
  }>;
}

/** Check if the current login is suspicious (new device) */
export async function checkSuspiciousLogin(userId: string): Promise<{
  isSuspicious: boolean;
  reason?: string;
}> {
  const fingerprint = await getDeviceFingerprint();
  
  const { data: known } = await supabase
    .from("user_sessions" as any)
    .select("id")
    .eq("user_id", userId)
    .eq("device_fingerprint", fingerprint)
    .maybeSingle();

  if (!known) {
    // Count total known devices
    const { count } = await supabase
      .from("user_sessions" as any)
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId);

    if ((count || 0) > 0) {
      return {
        isSuspicious: true,
        reason: "New device detected. If this wasn't you, change your password immediately.",
      };
    }
  }

  return { isSuspicious: false };
}
