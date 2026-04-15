import type { SupabaseClient } from "@supabase/supabase-js";

let _supabase: SupabaseClient | null = null;
let _heartbeatTimer: ReturnType<typeof setInterval> | null = null;
let _currentUserId: string | null = null;

const HEARTBEAT_INTERVAL_MS = 15_000;

export function initPresenceService(supabase: SupabaseClient): void {
  _supabase = supabase;
}

export async function setPresence(
  userId: string,
  status: "online" | "away" | "busy" = "online",
  metadata?: Record<string, unknown>,
  identity?: { name: string; avatar?: string; orbitId?: string }
): Promise<boolean> {
  if (!_supabase) return false;

  try {
    const { error } = await _supabase.functions.invoke("presence-heartbeat", {
      body: { action: "heartbeat", status, metadata, identity },
    });
    return !error;
  } catch {
    return false;
  }
}

export async function removePresence(userId: string): Promise<void> {
  if (!_supabase) return;

  try {
    await _supabase.functions.invoke("presence-heartbeat", {
      body: { action: "offline" },
    });
  } catch {}
}

export async function getPresence(
  userId: string
): Promise<{ userId: string; status: string; lastHeartbeat: number } | null> {
  if (!_supabase) return null;

  try {
    const { data, error } = await _supabase.functions.invoke("presence-heartbeat", {
      body: { action: "status", user_id: userId },
    });
    if (error || !data || !data.online) return null;
    return data.presence ?? null;
  } catch {
    return null;
  }
}

export async function isUserOnline(userId: string): Promise<boolean> {
  if (!_supabase) return false;

  try {
    const { data, error } = await _supabase.functions.invoke("presence-heartbeat", {
      body: { action: "status", user_id: userId },
    });
    if (error || !data) return false;
    return data.online ?? false;
  } catch {
    return false;
  }
}

export async function getLastSeen(userId: string): Promise<number | null> {
  if (!_supabase) return null;

  try {
    const { data, error } = await _supabase.functions.invoke("presence-heartbeat", {
      body: { action: "status", user_id: userId },
    });
    if (error || !data) return null;
    return data.lastSeen ?? null;
  } catch {
    return null;
  }
}

export async function getBulkPresence(
  userIds: string[]
): Promise<Record<string, { online: boolean; status?: string; lastHeartbeat?: number }>> {
  if (!_supabase || userIds.length === 0) return {};

  try {
    const { data, error } = await _supabase.functions.invoke("presence-heartbeat", {
      body: { action: "bulk_status", user_ids: userIds },
    });
    if (error || !data) return {};
    return data.users ?? {};
  } catch {
    return {};
  }
}

export async function getActiveUserCount(): Promise<number> {
  if (!_supabase) return 0;

  try {
    const { data, error } = await _supabase.functions.invoke("presence-heartbeat", {
      body: { action: "active_count" },
    });
    if (error || !data) return 0;
    return data.active_users ?? 0;
  } catch {
    return 0;
  }
}

let _currentIdentity: { name: string; avatar?: string; orbitId?: string } | undefined;

export function startHeartbeat(
  userId: string,
  status: "online" | "away" | "busy" = "online",
  identity?: { name: string; avatar?: string; orbitId?: string }
): void {
  stopHeartbeat();
  _currentUserId = userId;
  _currentIdentity = identity;

  setPresence(userId, status, undefined, identity);

  _heartbeatTimer = setInterval(() => {
    setPresence(userId, status, undefined, _currentIdentity);
  }, HEARTBEAT_INTERVAL_MS);
}

export function updateHeartbeatIdentity(identity: { name: string; avatar?: string; orbitId?: string }): void {
  _currentIdentity = identity;
}

export function stopHeartbeat(): void {
  if (_heartbeatTimer) {
    clearInterval(_heartbeatTimer);
    _heartbeatTimer = null;
  }

  if (_currentUserId) {
    removePresence(_currentUserId);
    _currentUserId = null;
  }
}

export async function setTypingIndicator(
  userId: string,
  conversationId: string
): Promise<boolean> {
  if (!_supabase) return false;

  try {
    const { error } = await _supabase.functions.invoke("redis-proxy", {
      body: {
        action: "set",
        key: `typing:${conversationId}:${userId}`,
        value: { userId, startedAt: Date.now() },
        ttl_seconds: 5,
      },
    });
    return !error;
  } catch {
    return false;
  }
}

export async function clearTypingIndicator(
  userId: string,
  conversationId: string
): Promise<void> {
  if (!_supabase) return;

  try {
    await _supabase.functions.invoke("redis-proxy", {
      body: {
        action: "del",
        keys: [`typing:${conversationId}:${userId}`],
      },
    });
  } catch {}
}

export function getPresenceConstants() {
  return {
    PRESENCE_TTL_SECONDS: 30,
    HEARTBEAT_INTERVAL_MS,
  } as const;
}
