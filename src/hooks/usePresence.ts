/**
 * usePresence — Manages user online/offline presence via user_presence table.
 * Heartbeat every 30s, goes offline on unmount/blur.
 * Validates session before writes to prevent RLS 401s with stale/missing tokens.
 * 
 * GHOST MODE: When ghost mode is active, presence is suppressed entirely.
 * The user appears offline to all contacts and is hidden from the Nearby radar.
 */
import { useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { isGhostModeActive } from "@/lib/app-security";

type PresenceStatus = "online" | "offline" | "away" | "busy" | "in_call" | "dnd";

export function usePresence() {
  const { user, session } = useAuth();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const setStatus = useCallback(async (status: PresenceStatus) => {
    if (!user?.id) return;

    // Ghost mode: always report offline — invisible to all
    if (isGhostModeActive()) {
      status = "offline";
    }

    // Verify we have a valid session before writing — prevents RLS 401s
    const { data: { session: currentSession } } = await supabase.auth.getSession();
    if (!currentSession?.access_token) return;

    try {
      await supabase.from("user_presence").upsert({
        user_id: user.id,
        status,
        last_seen_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        device_type: /Mobi|Android/i.test(navigator.userAgent) ? "mobile" : "web",
      } as any, { onConflict: "user_id" });
    } catch (err) {
      // Silently ignore presence errors — not critical
      console.debug("[usePresence] upsert failed:", err);
    }
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id || !session) return;

    // Ghost mode: set offline immediately and skip heartbeat
    if (isGhostModeActive()) {
      setStatus("offline");
      return;
    }

    setStatus("online");

    intervalRef.current = setInterval(() => setStatus("online"), 30_000);

    const onVisibility = () => {
      if (document.hidden) setStatus("away");
      else setStatus("online");
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      document.removeEventListener("visibilitychange", onVisibility);
      setStatus("offline");
    };
  }, [user?.id, session, setStatus]);

  return { setStatus };
}
