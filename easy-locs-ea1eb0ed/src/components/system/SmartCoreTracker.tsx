/**
 * SmartCoreTracker — Mounts inside Router to track route visits + dwell time.
 * Also initializes session on first mount.
 */
import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { trackRouteVisit, trackDwell, startSession } from "@/lib/smart-core";

export default function SmartCoreTracker() {
  const location = useLocation();
  const entryRef = useRef(Date.now());
  const prevRouteRef = useRef(location.pathname);
  const initialized = useRef(false);

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
  }, [location.pathname]);

  return null;
}
