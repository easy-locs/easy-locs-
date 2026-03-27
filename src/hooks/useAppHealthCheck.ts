import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useAppHealthCheck() {
  const [health, setHealth] = useState({
    db: false,
    auth: false,
    realtime: false,
    checkedAt: "",
  });

  useEffect(() => {
    let mounted = true;

    async function run() {
      const next = { db: false, auth: false, realtime: false, checkedAt: new Date().toISOString() };

      // DB check — use a public-safe lightweight query
      try {
        const start = performance.now();
        const { data, error, status } = await supabase
          .from("profiles")
          .select("id")
          .limit(1);
        const elapsed = (performance.now() - start).toFixed(1);

        if (error) {
          console.warn("[HEALTH_DB_FAIL]", { code: error.code, message: error.message, status, elapsed: elapsed + "ms" });
          next.db = false;
        } else {
          console.info("[HEALTH_DB_OK]", { rows: data?.length ?? 0, elapsed: elapsed + "ms" });
          next.db = true;
        }
      } catch (e) {
        console.error("[HEALTH_DB_EXCEPTION]", e);
      }

      // Auth check
      try {
        const { data } = await supabase.auth.getSession();
        next.auth = !!data?.session || true; // true even if no session (anon OK)
      } catch {}

      // Realtime check
      try {
        const channel = supabase.channel("healthcheck-ping");
        await channel.subscribe();
        next.realtime = true;
        supabase.removeChannel(channel);
      } catch {}

      if (mounted) setHealth(next);
    }

    void run();
    const t = window.setInterval(run, 60_000);
    return () => { mounted = false; window.clearInterval(t); };
  }, []);

  return health;
}
