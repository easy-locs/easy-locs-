/**
 * SmartCoreTracker — Mounts inside Router to track route visits + dwell time.
 * Also initializes session on first mount.
 * Wired to governance: trackPageOpen on route enter, updatePageState on paint.
 */
import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { trackRouteVisit, trackDwell, startSession } from "@/lib/smart-core";
import { trackPageOpen, updatePageState } from "@/engines/governance/page-open-engine";

let pageCounter = 0;

export default function SmartCoreTracker() {
  const location = useLocation();
  const entryRef = useRef(Date.now());
  const prevRouteRef = useRef(location.pathname);
  const initialized = useRef(false);
  const activePageIdRef = useRef<string | null>(null);

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

    const pageId = `page-${++pageCounter}`;
    activePageIdRef.current = pageId;
    trackPageOpen(pageId, location.pathname);

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (activePageIdRef.current === pageId) {
          updatePageState(pageId, "interaction_ready");
        }
      });
    });
  }, [location.pathname]);

  return null;
}
