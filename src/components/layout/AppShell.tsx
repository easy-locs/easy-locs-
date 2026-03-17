/**
 * AppShell — Global layout shell for authenticated pages.
 * Provides: fixed bottom nav, safe-area support, no layout shifts.
 * PASS136: Single source of truth for navigation.
 * PASS145: Prefetches critical queries on mount.
 */
import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import MobileBottomNav from "@/components/dashboard/MobileBottomNav";
import { useAuth } from "@/contexts/AuthContext";
import { prefetchCriticalData } from "@/lib/query-prefetch";
import { scheduleIdle } from "@/lib/performance";

const HIDE_SHELL_PREFIXES = ["/login", "/signup", "/forgot-password", "/reset-password", "/verify-email", "/tenant-signup"];

export default function AppShell({ children }: { children?: React.ReactNode }) {
  const { pathname } = useLocation();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // PASS145: Prefetch critical data during idle
  useEffect(() => {
    scheduleIdle(() => prefetchCriticalData(queryClient, user?.id));
  }, [queryClient, user?.id]);

  const hideShell = HIDE_SHELL_PREFIXES.some((p) => pathname.startsWith(p));

  if (hideShell) return <>{children}</>;

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background">
      <main className="flex-1 overflow-y-auto pb-[calc(60px+env(safe-area-inset-bottom,0px))] lg:pb-0">
        {children}
      </main>
      <MobileBottomNav />
    </div>
  );
}
