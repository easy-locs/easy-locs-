import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useAppHealthCheck() {
  const [health, setHealth] = useState({
    db: true,
    auth: true,
    realtime: true,
    checkedAt: "",
    checked: false,
  });

  useEffect(() => {
    let mounted = true;

    // Log env check once
    const url = (import.meta as any).env?.VITE_SUPABASE_URL;
    const key = (import.meta as any).env?.VITE_SUPABASE_PUBLISHABLE_KEY;
    console.info("[SUPABASE_ENV_CHECK]", {
      url: url ? url.substring(0, 30) + "..." : "MISSING",
      key: key ? key.substring(0, 20) + "..." : "MISSING",
      clientExists: !!supabase,
    });

    if (supabase) {
      console.info("[SUPABASE_CLIENT_READY]");
    } else {
      console.error("[SUPABASE_GLOBAL_FAIL] client is falsy");
    }

    async function run() {
      const next = { db: false, auth: false, realtime: false, checkedAt: new Date().toISOString() };

      // ── Auth check ──
      try {
        const { data, error } = await supabase.auth.getSession();
        // Auth is "up" if the call itself succeeds, regardless of whether there's an active session
        if (error) {
          console.warn("[AUTH_TEST] error:", error.message);
          next.auth = false;
        } else {
          console.info("[AUTH_TEST] ok, session:", data?.session ? "active" : "none (anon)");
          next.auth = true;
        }
      } catch (e: any) {
        console.error("[AUTH_TEST] exception:", e?.message || e);
        next.auth = false;
      }

      // ── DB check — use a simple count on a known public-readable table ──
      try {
        const start = performance.now();
        const { data, error, status } = await supabase
          .from("storefront_pages")
          .select("id")
          .limit(1);
        const elapsed = (performance.now() - start).toFixed(1);

        if (error) {
          console.warn("[DB_TEST] fail:", { code: error.code, message: error.message, status, elapsed: elapsed + "ms" });
          next.db = false;
        } else {
          console.info("[DB_TEST] ok:", { rows: data?.length ?? 0, elapsed: elapsed + "ms" });
          next.db = true;
        }
      } catch (e: any) {
        console.error("[DB_TEST] exception:", e?.message || e);
      }

      // ── Realtime check ──
      try {
        const channel = supabase.channel("healthcheck-ping");
        const status = await new Promise<string>((resolve) => {
          const timeout = setTimeout(() => resolve("timeout"), 5000);
          channel.subscribe((st) => {
            clearTimeout(timeout);
            resolve(st);
          });
        });
        console.info("[RT_TEST]", status);
        next.realtime = status === "SUBSCRIBED";
        supabase.removeChannel(channel);
      } catch (e: any) {
        console.error("[RT_TEST] exception:", e?.message || e);
      }

      if (mounted) setHealth({ ...next, checked: true });
    }

    void run();
    const t = window.setInterval(run, 60_000);
    return () => { mounted = false; window.clearInterval(t); };
  }, []);

  return health;
}
