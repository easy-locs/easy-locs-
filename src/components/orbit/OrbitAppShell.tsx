/**
 * OrbitAppShell — Persistent shell for /app/* routes.
 * PASS 164-166: Refactored — header & nav extracted to separate files.
 * Realtime subscriptions and polling centralized here.
 */
import { Outlet } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useOrbitEngine } from "@/stores/orbit-engine";
import { useEffect } from "react";
import OrbitHeader from "./OrbitHeader";
import OrbitBottomNav from "./OrbitBottomNav";

export default function OrbitAppShell() {
  const { user, orgId } = useAuth();
  const { refreshModule } = useOrbitEngine();

  // Initial full refresh + polling fallback (60s)
  useEffect(() => {
    if (!user?.id) return;
    refreshModule("all", user.id, orgId || undefined);
    const interval = setInterval(() => refreshModule("all", user.id, orgId || undefined), 60_000);
    return () => clearInterval(interval);
  }, [user?.id, orgId]);

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
