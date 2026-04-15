import { type ReactNode, useRef, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useSwipeNavigation } from "@/hooks/useSwipeNavigation";
import { HIDE_NAV_PREFIXES } from "@/config/navigation";

export default function SwipeableMain({ children, className }: { children: ReactNode; className?: string }) {
  const { onTouchStart, onTouchEnd } = useSwipeNavigation();
  const { pathname } = useLocation();
  const hideNav = HIDE_NAV_PREFIXES.some((p) => pathname.startsWith(p));
  const mainRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = mainRef.current;
    if (!el) return;
    const startHandler = (e: TouchEvent) => onTouchStart(e as unknown as React.TouchEvent);
    const endHandler = (e: TouchEvent) => onTouchEnd(e as unknown as React.TouchEvent);
    el.addEventListener("touchstart", startHandler, { passive: true });
    el.addEventListener("touchend", endHandler, { passive: true });
    return () => {
      el.removeEventListener("touchstart", startHandler);
      el.removeEventListener("touchend", endHandler);
    };
  }, [onTouchStart, onTouchEnd]);

  const resolvedClassName = [
    className,
    hideNav ? undefined : "swipeable-main--with-nav",
  ].filter(Boolean).join(" ") || undefined;

  return (
    <main
      ref={mainRef}
      id="main-content"
      tabIndex={-1}
      className={resolvedClassName}
    >
      {children}
    </main>
  );
}
