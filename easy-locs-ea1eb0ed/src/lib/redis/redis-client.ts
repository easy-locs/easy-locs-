import type { SupabaseClient } from "@supabase/supabase-js";

let _supabase: SupabaseClient | null = null;

export function initRedisProxy(supabase: SupabaseClient): void {
  _supabase = supabase;
}

export function isRedisAvailable(): boolean {
  return _supabase !== null;
}

export function getRedisClient(): SupabaseClient | null {
  return _supabase;
}

export async function redisGet<T = unknown>(key: string): Promise<T | null> {
  if (!_supabase) return null;

  try {
    const { data, error } = await _supabase.functions.invoke("redis-proxy", {
      body: { action: "get", key },
    });
    if (error || !data) return null;
    return (data.value as T) ?? null;
  } catch {
    return null;
  }
}

export async function redisSet(
  key: string,
  value: unknown,
  ttlSeconds?: number
): Promise<boolean> {
  if (!_supabase) return false;

  try {
    const { error } = await _supabase.functions.invoke("redis-proxy", {
      body: { action: "set", key, value, ttl_seconds: ttlSeconds },
    });
    return !error;
  } catch {
    return false;
  }
}

export async function redisDel(...keys: string[]): Promise<number> {
  if (!_supabase || keys.length === 0) return 0;

  try {
    const { data, error } = await _supabase.functions.invoke("redis-proxy", {
      body: { action: "del", keys },
    });
    if (error || !data) return 0;
    return (data.deleted as number) ?? 0;
  } catch {
    return 0;
  }
}

export async function redisIncr(key: string): Promise<number | null> {
  if (!_supabase) return null;

  try {
    const { data, error } = await _supabase.functions.invoke("redis-proxy", {
      body: { action: "incr", key },
    });
    if (error || !data) return null;
    return (data.value as number) ?? null;
  } catch {
    return null;
  }
}

export async function redisExpire(
  key: string,
  seconds: number
): Promise<boolean> {
  if (!_supabase) return false;

  try {
    const { error } = await _supabase.functions.invoke("redis-proxy", {
      body: { action: "expire", key, seconds },
    });
    return !error;
  } catch {
    return false;
  }
}

export function resetRedisClient(): void {
  _supabase = null;
}
