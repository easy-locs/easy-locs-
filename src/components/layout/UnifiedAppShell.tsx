/**
 * UnifiedAppShell — Central app shell connecting all 5 navigation pillars.
 * Provides: bottom nav, status bar safe areas, network awareness, consistent structure.
 */
import { Outlet, useLocation } from "react-router-dom";
import { Suspense, lazy, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";

const UnifiedBottomNav = lazy(() => import("@/components/navigation/UnifiedBottomNav"));

const AUTH_PREFIXES = ["/login", "/signup", "/forgot-password", "/reset-password", "/verify-email", "/tenant-signup", "/auth/"];

export default function UnifiedAppShell() {
  const { pathname } = useLocation();
  const { user } = useAuth();
  const hideShell = AUTH_PREFIXES.some((p) => pathname.startsWith(p));

  // Sync network status
  useEffect(() => {
    const onOnline = () => document.documentElement.classList.remove("app-offline");
    const onOffline = () => document.documentElement.classList.add("app-offline");
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    if (!navigator.onLine) onOffline();
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  if (hideShell) return <Outlet />;

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background">
      <main className="flex-1 overflow-y-auto pb-[calc(56px+env(safe-area-inset-bottom,0px))]">
        <Outlet />
      </main>
      {user && (
        <Suspense fallback={null}>
          <UnifiedBottomNav />
        </Suspense>
      )}
    </div>
  );
}
