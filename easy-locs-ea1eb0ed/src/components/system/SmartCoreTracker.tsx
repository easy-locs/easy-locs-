/**
 * SmartCoreTracker — Mounts inside Router to track route visits + dwell time.
 * Also initializes session on first mount.
 * Wired to governance: trackPageOpen on route enter, updatePageState on paint.
 * Dedup-safe: guards against React double-effect and rapid remounts.
 */
import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { trackRouteVisit, trackDwell, startSession } from "@/lib/smart-core";
import { trackPageOpen, updatePageState } from "@/engines/governance/page-open-engine";
import { createPageOpenDedupKey } from "@/services/governance/governance-dedup";

export default function SmartCoreTracker() {
  const location = useLocation();
  const entryRef = useRef(Date.now());
  const prevRouteRef = useRef(location.pathname);
  const initialized = useRef(false);
  const activePageIdRef = useRef<string | null>(null);
  const lastTrackedRoute = useRef<string | null>(null);

  useEffect(() => {
    if (!initialized.current) {
      startSession();
      initialized.current = true;
    }
  }, []);

  useEffect(() => {
    const now = Date.now();
    if (prevRouteRef.current !== location.pathname) {
      const dwell = now - entryRef.current;
      if (dwell > 500) {
        trackDwell(prevRouteRef.current, dwell);
      }
    }
    prevRouteRef.current = location.pathname;
    entryRef.current = now;
    trackRouteVisit(location.pathname);

    if (lastTrackedRoute.current === location.pathname) return;
    lastTrackedRoute.current = location.pathname;

    const { pageId, isDuplicate } = createPageOpenDedupKey(location.pathname);
    if (isDuplicate) return;

    activePageIdRef.current = pageId;
    trackPageOpen(pageId, location.pathname);

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (activePageIdRef.current === pageId) {
          updatePageState(pageId, "interaction_ready");
        }
      });
    });

    return () => {
      lastTrackedRoute.current = null;
    };
  }, [location.pathname]);

  return null;
}
