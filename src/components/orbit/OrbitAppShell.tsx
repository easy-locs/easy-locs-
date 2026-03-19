/**
 * OrbitAppShell — Persistent shell for /app/* routes.
 * Centralizes realtime polling, notification dispatcher, and OrbitFAB.
 */
import { Outlet } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useOrbitEngine } from "@/stores/orbit-engine";
import { useEffect, lazy, Suspense } from "react";
import OrbitHeader from "./OrbitHeader";
import OrbitBottomNav from "./OrbitBottomNav";
import { startNotificationDispatcher, stopNotificationDispatcher } from "@/lib/orbit/notification-dispatcher";

const OrbitFAB = lazy(() => import("./OrbitFAB"));
const CartSheet = lazy(() => import("@/components/cart/CartSheet"));

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

  // Notification dispatcher — listens for real-time DB notifications
  useEffect(() => {
    if (!user?.id) return;
    startNotificationDispatcher({ userId: user.id });
    return () => stopNotificationDispatcher();
  }, [user?.id]);

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
      <Suspense fallback={null}>
        <OrbitFAB />
      </Suspense>
      <Suspense fallback={null}>
        <CartSheet />
      </Suspense>
    </div>
  );
}
