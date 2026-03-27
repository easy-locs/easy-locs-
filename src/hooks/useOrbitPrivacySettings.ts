import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useOrbitPrivacySettings(userId?: string | null) {
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!userId) { setSettings(null); setLoading(false); return; }
    setLoading(true);
    const { data } = await (supabase as any)
      .from("orbit_user_settings_v2")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (!data) {
      const { data: created } = await (supabase as any)
        .from("orbit_user_settings_v2")
        .insert({ user_id: userId })
        .select("*")
        .single();
      setSettings(created);
    } else {
      setSettings(data);
    }
    setLoading(false);
  }, [userId]);

  const patch = useCallback(async (partial: Record<string, unknown>) => {
    if (!userId) return;
    const { data } = await (supabase as any)
      .from("orbit_user_settings_v2")
      .update({ ...partial, updated_at: new Date().toISOString() })
      .eq("user_id", userId)
      .select("*")
      .single();
    setSettings(data);
  }, [userId]);

  useEffect(() => { void load(); }, [load]);

  return { settings, loading, reload: load, patch };
}
