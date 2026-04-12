import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import type { UiEngineReport } from "@/lib/ui-engine/types";
import { runUiEngine } from "@/lib/ui-engine/runUiEngine";
import { platformBus } from "@/lib/shared/platform-bus";

interface UseUiEngineOptions {
  enabled?: boolean;
  autoRun?: boolean;
  delayMs?: number;
  observeDom?: boolean;
}

export function useUiEngine(options: UseUiEngineOptions = {}) {
  const {
    enabled = true,
    autoRun = true,
    delayMs = 500,
    observeDom = true,
  } = options;

  const location = useLocation();
  const [report, setReport] = useState<UiEngineReport | null>(null);
  const [running, setRunning] = useState(false);

  const route = useMemo(() => location.pathname, [location.pathname]);

  const execute = () => {
    if (!enabled) return null;
    setRunning(true);
    try {
      const next = runUiEngine(route);
      setReport(next);

      if (next) {
        platformBus.emit("ui-engine:report", {
          route,
          score: next.score,
          issueCount: next.issues?.length ?? 0,
          patchCount: next.patchedCount ?? 0,
          issues: (next.issues ?? []).map(i => ({
            id: i.id,
            type: i.type,
            message: i.message,
            severity: i.severity,
            patchable: i.patchable,
          })),
          timestamp: Date.now(),
        });
      }

      return next;
    } finally {
      setRunning(false);
    }
  };

  useEffect(() => {
    if (!enabled || !autoRun) return;
    const t = window.setTimeout(() => execute(), delayMs);
    return () => window.clearTimeout(t);
     
  }, [enabled, autoRun, delayMs, route]);

  useEffect(() => {
    if (!enabled || !observeDom) return;

    let timeout: number | null = null;
    const obs = new MutationObserver(() => {
      if (timeout) window.clearTimeout(timeout);
      timeout = window.setTimeout(() => execute(), 300);
    });

    obs.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
    });

    return () => {
      if (timeout) window.clearTimeout(timeout);
      obs.disconnect();
    };
     
  }, [enabled, observeDom, route]);

  return { report, running, execute };
}
