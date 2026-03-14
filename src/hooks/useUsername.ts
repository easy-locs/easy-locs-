/**
 * useUsername — Manage @username for Orbit identity.
 * Handles validation, uniqueness check, and persistence.
 */
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const USERNAME_REGEX = /^[a-z0-9._]{3,24}$/;

export function useUsername() {
  const { user } = useAuth();
  const [username, setUsername] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("username")
        .eq("id", user.id)
        .maybeSingle();
      setUsername((data as any)?.username || null);
      setLoading(false);
    })();
  }, [user?.id]);

  const checkAvailability = useCallback(async (value: string): Promise<{ available: boolean; error?: string }> => {
    const normalized = value.toLowerCase().trim();
    if (!USERNAME_REGEX.test(normalized)) {
      return { available: false, error: "3-24 chars, lowercase letters, numbers, dots and underscores only" };
    }
    const { data } = await supabase
      .from("profiles")
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

    const { error } = await supabase
      .from("profiles")
      .update({ username: normalized } as any)
      .eq("id", user.id);
    if (error) return { success: false, error: error.message };
    setUsername(normalized);
    return { success: true };
  }, [user?.id, checkAvailability]);

  return { username, loading, checkAvailability, saveUsername };
}

/** Search users by @username */
export async function searchByUsername(query: string) {
  const normalized = query.toLowerCase().replace(/^@/, "").trim();
  if (!normalized) return [];
  const { data } = await supabase
    .from("profiles")
    .select("id, name, email, username, avatar_url")
    .ilike("username", `%${normalized}%` as any)
    .limit(10);
  return (data || []) as Array<{ id: string; name: string; email: string; username: string | null; avatar_url: string | null }>;
}
