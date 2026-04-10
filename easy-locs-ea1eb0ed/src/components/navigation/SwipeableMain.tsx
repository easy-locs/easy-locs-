/**
 * SwipeableMain — Wraps main content with horizontal swipe gesture detection
 * for quick navigation between the 5 bottom nav tabs.
 */
import { type ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { useSwipeNavigation } from "@/hooks/useSwipeNavigation";
import { HIDE_NAV_PREFIXES } from "@/config/navigation";

export default function SwipeableMain({ children, className }: { children: ReactNode; className?: string }) {
  const { onTouchStart, onTouchEnd } = useSwipeNavigation();
  const { pathname } = useLocation();
  const hideNav = HIDE_NAV_PREFIXES.some((p) => pathname.startsWith(p));

  return (
    <main
      id="main-content"
      tabIndex={-1}
      className={hideNav ? undefined : className}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {children}
    </main>
  );
}
