/**
 * useUsername — Manage @username for Orbit identity.
 * Handles validation, uniqueness check, and persistence.
 */
import { useState, useEffect, useCallback } from "react";
import { db } from "@/services/db";
import { useAuth } from "@/contexts/AuthContext";

const USERNAME_REGEX = /^[a-z0-9._]{3,24}$/;
const TELEGRAM_USERNAME_REGEX = /^[a-zA-Z][a-zA-Z0-9_]{4,31}$/;
const RESERVED_USERNAMES = new Set([
  "admin", "support", "help", "system", "moderator", "root",
  "null", "undefined", "anonymous", "deleted", "unknown",
]);

export function useUsername() {
  const { user } = useAuth();
  const [username, setUsername] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      const { data } = await db("profiles")
        .select("username")
        .eq("id", user.id)
        .maybeSingle();
      setUsername((data as any)?.username || null);
      setLoading(false);
    })();
  }, [user?.id]);

  const checkAvailability = useCallback(async (value: string): Promise<{ available: boolean; error?: string }> => {
    const normalized = value.toLowerCase().trim();
    if (!normalized || normalized.length < 3) {
      return { available: false, error: "Username must be at least 3 characters" };
    }
    if (normalized.length > 24) {
      return { available: false, error: "Username must be at most 24 characters" };
    }
    if (!USERNAME_REGEX.test(normalized)) {
      return { available: false, error: "3-24 chars, lowercase letters, numbers, dots and underscores only" };
    }
    if (RESERVED_USERNAMES.has(normalized)) {
      return { available: false, error: "This username is reserved" };
    }
    if (normalized.startsWith(".") || normalized.endsWith(".") || normalized.includes("..")) {
      return { available: false, error: "Username cannot start/end with a dot or contain consecutive dots" };
    }
    const { data } = await db("profiles")
      .select("id")
      .eq("username", normalized as any)
      .neq("id", user?.id || "")
      .maybeSingle();
    if (data) return { available: false, error: "Username already taken" };
    return { available: true };
  }, [user?.id]);

  const saveUsername = useCallback(async (value: string): Promise<{ success: boolean; error?: string }> => {
    if (!user?.id) return { success: false, error: "Not authenticated" };
    const normalized = value.toLowerCase().trim();
    const check = await checkAvailability(normalized);
    if (!check.available) return { success: false, error: check.error };

    const { error } = await db("profiles")
      .update({ username: normalized } as any)
      .eq("id", user.id);
    if (error) return { success: false, error: error.message };
    setUsername(normalized);
    return { success: true };
  }, [user?.id, checkAvailability]);

  return { username, loading, checkAvailability, saveUsername };
}

export function isValidTelegramUsername(username: string): boolean {
  return TELEGRAM_USERNAME_REGEX.test(username);
}

/** Search users by @username */
export async function searchByUsername(query: string) {
  const normalized = query.toLowerCase().replace(/^@/, "").trim();
  if (!normalized || normalized.length < 2) return [];
  const sanitized = normalized.replace(/[^a-z0-9._]/g, "");
  if (!sanitized) return [];
  const { data } = await db("profiles")
    .select("id, name, email, username")
    .ilike("username", `%${sanitized}%` as any)
    .limit(10);
  return (data || []) as unknown as Array<{ id: string; name: string; email: string; username: string | null }>;
}
