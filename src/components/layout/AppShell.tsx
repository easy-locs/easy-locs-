/**
 * AppShell — Global layout shell for authenticated pages.
 * Provides: fixed bottom nav, safe-area support, no layout shifts.
 * PASS136: Single source of truth for navigation.
 */
import { Outlet, useLocation } from "react-router-dom";
import MobileBottomNav from "@/components/dashboard/MobileBottomNav";

const HIDE_SHELL_PREFIXES = ["/login", "/signup", "/forgot-password", "/reset-password", "/verify-email", "/tenant-signup"];

export default function AppShell({ children }: { children?: React.ReactNode }) {
  const { pathname } = useLocation();

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
