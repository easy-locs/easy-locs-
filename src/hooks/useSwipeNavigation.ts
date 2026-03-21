/**
 * useSwipeNavigation — Detects horizontal swipe gestures to navigate between bottom nav tabs.
 * Fast, lightweight, no dependencies beyond React + router.
 */
import { useCallback, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { NAV_TABS_CONFIG } from "@/config/navigation";

const SWIPE_THRESHOLD = 50; // min px to trigger
const SWIPE_MAX_Y = 80; // max vertical drift
const SWIPE_TIMEOUT = 300; // max ms for gesture

export function useSwipeNavigation() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const touchRef = useRef<{ x: number; y: number; t: number } | null>(null);

  const getCurrentTabIndex = useCallback(() => {
    return NAV_TABS_CONFIG.findIndex((tab) => tab.match(pathname));
  }, [pathname]);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchRef.current = { x: touch.clientX, y: touch.clientY, t: Date.now() };
  }, []);

  const onTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!touchRef.current) return;
    const touch = e.changedTouches[0];
    const dx = touch.clientX - touchRef.current.x;
    const dy = Math.abs(touch.clientY - touchRef.current.y);
    const dt = Date.now() - touchRef.current.t;
    touchRef.current = null;

    if (dt > SWIPE_TIMEOUT || dy > SWIPE_MAX_Y || Math.abs(dx) < SWIPE_THRESHOLD) return;

    const currentIdx = getCurrentTabIndex();
    if (currentIdx < 0) return;

    const direction = dx < 0 ? 1 : -1; // left swipe = next, right swipe = prev
    const nextIdx = currentIdx + direction;

    if (nextIdx >= 0 && nextIdx < NAV_TABS_CONFIG.length) {
      navigate(NAV_TABS_CONFIG[nextIdx].path);
    }
  }, [getCurrentTabIndex, navigate]);

  return { onTouchStart, onTouchEnd };
}
