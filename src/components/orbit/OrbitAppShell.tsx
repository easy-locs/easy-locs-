/**
 * OrbitAppShell — Persistent shell for /home and orbit routes.
 * Navigation is handled by the global MainBottomNav — NOT rendered here.
 */
import { Outlet } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useOrbitEngine } from "@/stores/orbit-engine";
import { useEffect, lazy, Suspense } from "react";
import { startUnifiedNotificationDispatcher, stopUnifiedNotificationDispatcher } from "@/lib/notifications/dispatcher";

const OrbitFAB = lazy(() => import("./OrbitFAB"));
const CartSheet = lazy(() => import("@/components/cart/CartSheet"));

export default function OrbitAppShell({ children }: { children?: React.ReactNode }) {
  const { user, orgId } = useAuth();
  const { refreshModule } = useOrbitEngine();

  useEffect(() => {
    if (!user?.id) return;
    refreshModule("all", user.id, orgId || undefined);
    const interval = setInterval(() => refreshModule("all", user.id, orgId || undefined), 60_000);
    return () => clearInterval(interval);
  }, [user?.id, orgId]);

  useEffect(() => {
    if (!user?.id) return;
    startUnifiedNotificationDispatcher(user.id);
    return () => stopUnifiedNotificationDispatcher();
  }, [user?.id]);

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
    <div className="min-h-[100dvh] flex flex-col bg-background">
      <main className="flex-1 overflow-y-auto pb-[calc(56px+env(safe-area-inset-bottom,0px))]">
        {children}
        <Outlet />
      </main>
      <Suspense fallback={null}>
        <OrbitFAB />
      </Suspense>
      <Suspense fallback={null}>
        <CartSheet />
      </Suspense>
    </div>
  );
}
