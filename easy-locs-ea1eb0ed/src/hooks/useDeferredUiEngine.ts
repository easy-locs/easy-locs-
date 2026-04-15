import { useEffect, useRef, useState } from "react";
import type { UiIssue } from "@/lib/ui-engine/types";

interface DeferredUiEngineResult {
  ready: boolean;
  timedOut: boolean;
}

export function useDeferredUiEngine(label: string, timeoutMs = 5000): DeferredUiEngineResult {
  const idleRef = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fallbackRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [ready, setReady] = useState(false);
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    let cancelled = false;

    fallbackRef.current = setTimeout(() => {
      if (!cancelled) {
        setTimedOut(true);
        setReady(true);
        console.warn(`[deferred-ui-engine] "${label}" timed out after ${timeoutMs}ms — allowing user progression`);
      }
    }, timeoutMs);

    const activate = () => {
      if (cancelled) return;
      Promise.all([
        import("@/lib/ui-engine/runUiEngine"),
        import("@/lib/shared/platform-bus"),
      ]).then(([{ runUiEngine }, { platformBus }]) => {
        if (cancelled) return;
        try {
          const report = runUiEngine(window.location.pathname);
          if (report) {
            platformBus.emit("ui-engine:report", {
              route: window.location.pathname,
              label,
              score: report.score,
              issueCount: report.issues?.length ?? 0,
              patchCount: report.patchedCount ?? 0,
              issues: (report.issues ?? []).map((i: UiIssue) => ({
                id: i.id,
                type: i.type,
                message: i.message,
                severity: i.severity,
                patchable: i.patchable,
              })),
              timestamp: Date.now(),
            });
          }
        } catch (err) {
          console.warn(`[deferred-ui-engine] "${label}" execution failed:`, err);
        }
        if (!cancelled) {
          setReady(true);
          if (fallbackRef.current) clearTimeout(fallbackRef.current);
        }
      }).catch(err => {
        console.warn(`[deferred-ui-engine] Failed to load for "${label}":`, err);
        if (!cancelled) {
          setReady(true);
          if (fallbackRef.current) clearTimeout(fallbackRef.current);
        }
      });
    };

    if (typeof requestIdleCallback === "function") {
      idleRef.current = requestIdleCallback(() => activate(), { timeout: timeoutMs });
    } else {
      timerRef.current = setTimeout(activate, Math.min(timeoutMs, 2000));
    }

    return () => {
      cancelled = true;
      if (idleRef.current !== null) cancelIdleCallback(idleRef.current);
      if (timerRef.current !== null) clearTimeout(timerRef.current);
      if (fallbackRef.current !== null) clearTimeout(fallbackRef.current);
    };
  }, [label, timeoutMs]);

  return { ready, timedOut };
}
