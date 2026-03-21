/**
 * SwipeableMain — Wraps main content with horizontal swipe gesture detection
 * for quick navigation between the 5 bottom nav tabs.
 */
import { type ReactNode } from "react";
import { useSwipeNavigation } from "@/hooks/useSwipeNavigation";

export default function SwipeableMain({ children, className }: { children: ReactNode; className?: string }) {
  const { onTouchStart, onTouchEnd } = useSwipeNavigation();

  return (
    <main
      id="main-content"
      className={className}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {children}
    </main>
  );
}
