/**
 * useSwipeNavigation — Detects horizontal swipe gestures to navigate between bottom nav tabs.
 * Safe: disabled on pages with maps, scanners, carousels, or wallet screens.
 */
import { useCallback, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { NAV_TABS_CONFIG } from "@/config/navigation";

const SWIPE_THRESHOLD = 60;
const SWIPE_MAX_Y = 60;
const SWIPE_TIMEOUT = 250;

/** Paths where swipe navigation is disabled to avoid conflicts */
const SWIPE_DISABLED_PREFIXES = [
  "/map", "/ride", "/send", "/track",
  "/wallet/", "/checkout", "/pos",
  "/qr", "/scan", "/pay/",
  "/orbit/chat", "/call",
  "/travel/hotel", "/travel/stay", "/travel/flight",
  "/food/restaurant", "/food/r/",
  "/shop/store", "/shop/mall",
  "/property/detail", "/property/booking",
  "/store/", "/s/",
  "/mobility/taxi", "/mobility/delivery",
  "/browse/",
];

export function useSwipeNavigation() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const touchRef = useRef<{ x: number; y: number; t: number } | null>(null);

  const isDisabled = SWIPE_DISABLED_PREFIXES.some((p) => pathname.startsWith(p));

  const getCurrentTabIndex = useCallback(() => {
    return NAV_TABS_CONFIG.findIndex((tab) => tab.match(pathname));
  }, [pathname]);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    if (isDisabled) return;
    const target = e.target as HTMLElement | null;
    if (target?.closest("[data-no-swipe], .overflow-x-auto, .overflow-x-scroll, .swiper, .embla, .photo-gallery")) return;
    const touch = e.touches[0];
    touchRef.current = { x: touch.clientX, y: touch.clientY, t: Date.now() };
  }, [isDisabled]);

  const onTouchEnd = useCallback((e: React.TouchEvent) => {
    if (isDisabled || !touchRef.current) return;
    const touch = e.changedTouches[0];
    const dx = touch.clientX - touchRef.current.x;
    const dy = Math.abs(touch.clientY - touchRef.current.y);
    const dt = Date.now() - touchRef.current.t;
    touchRef.current = null;

    if (dt > SWIPE_TIMEOUT || dy > SWIPE_MAX_Y || Math.abs(dx) < SWIPE_THRESHOLD) return;

    const currentIdx = getCurrentTabIndex();
    if (currentIdx < 0) return;

    const direction = dx < 0 ? 1 : -1;
    const nextIdx = currentIdx + direction;

    if (nextIdx >= 0 && nextIdx < NAV_TABS_CONFIG.length) {
      navigate(NAV_TABS_CONFIG[nextIdx].path);
    }
  }, [isDisabled, getCurrentTabIndex, navigate]);

  return { onTouchStart, onTouchEnd };
}
