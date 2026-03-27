import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useOrbitCallHistory(currentOrbitId?: string | null) {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    if (!currentOrbitId) {
      setHistory([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const { data } = await (supabase as any)
      .from("call_logs")
      .select("*")
      .or(`caller_orbit_id.eq.${currentOrbitId},receiver_orbit_id.eq.${currentOrbitId}`)
      .order("created_at", { ascending: false })
      .limit(100);

    setHistory(data || []);
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, [currentOrbitId]);

  return { history, loading, reload: load };
}
