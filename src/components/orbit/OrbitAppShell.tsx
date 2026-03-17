/**
 * OrbitAppShell — Persistent shell for /app/* routes.
 * PASS 164-166: Refactored — header & nav extracted to separate files.
 * Realtime subscriptions and polling centralized here.
 */
import { Outlet } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useOrbitEngine } from "@/stores/orbit-engine";
import { useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import OrbitHeader from "./OrbitHeader";
import OrbitBottomNav from "./OrbitBottomNav";

export default function OrbitAppShell() {
  const { user, orgId } = useAuth();
  const { refresh } = useOrbitEngine();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const debouncedRefresh = useCallback(() => {
    if (!user?.id) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      refresh(user.id, orgId || undefined);
    }, 1500);
  }, [user?.id, orgId, refresh]);

  // Polling fallback — 60s
  useEffect(() => {
    if (!user?.id) return;
    refresh(user.id, orgId || undefined);
    const interval = setInterval(() => refresh(user.id, orgId || undefined), 60_000);
    return () => clearInterval(interval);
  }, [user?.id, orgId]);

  // Realtime subscriptions
  useEffect(() => {
    if (!user?.id) return;
    const channels: ReturnType<typeof supabase.channel>[] = [];

    const msgChannel = supabase
      .channel("orbit-messages")
      .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, debouncedRefresh)
      .subscribe();
    channels.push(msgChannel);

    const notifChannel = supabase
      .channel("orbit-notifications")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` }, debouncedRefresh)
      .subscribe();
    channels.push(notifChannel);

    if (orgId) {
      const bookingChannel = supabase
        .channel("orbit-bookings")
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "booking_requests", filter: `org_id=eq.${orgId}` }, debouncedRefresh)
        .subscribe();
      channels.push(bookingChannel);
    }

    return () => {
      channels.forEach((ch) => supabase.removeChannel(ch));
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [user?.id, orgId, debouncedRefresh]);

  // Network status
  useEffect(() => {
    const { setNetworkStatus } = useOrbitEngine.getState();
    const onOnline = () => setNetworkStatus("online");
    const onOffline = () => setNetworkStatus("offline");
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    if (!navigator.onLine) setNetworkStatus("offline");
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  return (
    <div className="min-h-[100dvh] flex flex-col" style={{ background: "hsl(var(--hud-bg))" }}>
      <OrbitHeader />
      <main className="flex-1 overflow-y-auto pb-16">
        <Outlet />
      </main>
      <OrbitBottomNav />
    </div>
  );
}
