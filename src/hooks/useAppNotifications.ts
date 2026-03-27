import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useAppNotifications(userId?: string | null) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!userId) { setItems([]); setLoading(false); return; }
    setLoading(true);
    const { data } = await (supabase as any)
      .from("app_notifications")
      .select("*")
      .eq("user_id", userId)
      .is("dismissed_at", null)
      .order("created_at", { ascending: false })
      .limit(100);
    setItems(data || []);
    setLoading(false);
  }, [userId]);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`app-notifications-${userId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "app_notifications", filter: `user_id=eq.${userId}` }, () => { void load(); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [userId, load]);

  const unreadCount = useMemo(() => items.filter((x) => !x.read_at && !x.dismissed_at).length, [items]);

  return { items, loading, unreadCount, reload: load };
}
