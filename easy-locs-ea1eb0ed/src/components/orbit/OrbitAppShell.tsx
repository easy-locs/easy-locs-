/**
 * OrbitAppShell — Persistent shell for /home and orbit routes.
 * Navigation is handled by the global MainBottomNav — NOT rendered here.
 */
import { Outlet } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useOrbitEngine } from "@/stores/orbit-engine";
import { useEffect, lazy, Suspense } from "react";
import { useNotificationStore } from "@/stores/notification.store";


const CartSheet = lazy(() => import("@/components/cart/CartSheet"));
const E2EERecoveryBanner = lazy(() => import("@/components/orbit/E2EERecoveryBanner"));

export default function OrbitAppShell({ children }: { children?: React.ReactNode }) {
  const { user, orgId } = useAuth();
  const { refreshModule } = useOrbitEngine();

  useEffect(() => {
    if (!user?.id) return;
    // One-time hydration on mount — no polling interval.
    // Realtime signals handle incremental updates via useRealtimeHub.
    refreshModule("all", user.id, orgId || undefined);
  }, [user?.id, orgId]);

  useEffect(() => {
    if (!user?.id) return;
    const cleanup = useNotificationStore.getState().startRealtime(user.id);
    return () => { if (typeof cleanup === "function") cleanup(); };
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
    <>
      <Suspense fallback={null}>
        <E2EERecoveryBanner />
      </Suspense>
      {children}
      <Outlet />
      <Suspense fallback={null}>
        <CartSheet />
      </Suspense>
    </>
  );
}
