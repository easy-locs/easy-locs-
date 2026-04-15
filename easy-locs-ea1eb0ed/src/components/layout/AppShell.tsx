/**
 * AppShell — Global layout shell for authenticated pages.
 * Bottom nav is handled globally in App.tsx — NOT rendered here.
 */
import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { prefetchCriticalData } from "@/lib/query-prefetch";
import { prefetchAdjacentRoutes } from "@/lib/runtime/smart-prefetch";
import { scheduleIdle } from "@/lib/performance";

const HIDE_SHELL_PREFIXES = ["/login", "/signup", "/forgot-password", "/reset-password", "/verify-email", "/tenant-signup"];

export default function AppShell({ children }: { children?: React.ReactNode }) {
  const { pathname } = useLocation();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    scheduleIdle(() => prefetchCriticalData(queryClient, user?.id));
  }, [queryClient, user?.id]);

  useEffect(() => {
    scheduleIdle(() => prefetchAdjacentRoutes(pathname));
  }, [pathname]);

  const hideShell = HIDE_SHELL_PREFIXES.some((p) => pathname.startsWith(p));
  if (hideShell) return <>{children}</>;

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background app-main">
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
