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
    .from("user_sessions" as any)
    .select("id, last_active_at")
    .eq("user_id", userId)
    .eq("device_fingerprint", fingerprint)
    .maybeSingle();

  const isNewDevice = !existing;

  if (existing) {
    await supabase
      .from("user_sessions" as any)
      .update({ last_active_at: new Date().toISOString(), device_label: label } as any)
      .eq("id", (existing as any).id);
  } else {
    await supabase.from("user_sessions" as any).insert({
      user_id: userId,
      device_fingerprint: fingerprint,
      device_label: label,
      browser,
      os,
      is_current: true,
      last_active_at: new Date().toISOString(),
    } as any);

    await logLoginEvent(userId, fingerprint, label, true);
  }

  return { isNewDevice, sessionInfo };
}

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

export async function getUserSessions(userId: string): Promise<DeviceSession[]> {
  const { data } = await supabase
    .from("user_sessions" as any)
    .select("*")
    .eq("user_id", userId)
    .order("last_active_at", { ascending: false });

  return (data || []) as unknown as DeviceSession[];
}

export async function revokeSession(sessionId: string): Promise<boolean> {
  const { error } = await supabase
    .from("user_sessions" as any)
    .delete()
    .eq("id", sessionId);
  return !error;
}

export async function revokeAllOtherSessions(userId: string): Promise<void> {
  const fingerprint = await getDeviceFingerprint();
  await supabase
    .from("user_sessions" as any)
    .delete()
    .eq("user_id", userId)
    .neq("device_fingerprint", fingerprint);
}

export async function getSuspiciousLogins(userId: string, limit = 10): Promise<LoginEvent[]> {
  const { data } = await supabase
    .from("login_events" as any)
    .select("*")
    .eq("user_id", userId)
    .eq("is_new_device", true)
    .order("created_at", { ascending: false })
    .limit(limit);

  return (data || []) as unknown as LoginEvent[];
}

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
