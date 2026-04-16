import { Suspense, useTransition, useEffect, useRef, type ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { navigationPredictor } from "@/lib/performance/predictive-preloader";
import { prefetchRoute } from "@/lib/performance/route-prefetch";
import { prefetchEngine } from "@/lib/performance/prefetch-engine";

const PILLAR_PREFETCH_TASKS: Record<string, { key: string; fn: () => Promise<void>; priority: number }[]> = {
  "/dashboard": [
    { key: "/dashboard", fn: () => import("@/lib/performance/prefetch-engine").then((m) => m.prefetchEngine.prefetchDiscovery()), priority: 3 },
  ],
  "/wallet": [
    { key: "/wallet", fn: () => Promise.resolve(), priority: 2 },
  ],
  "/orbit": [
    { key: "/orbit", fn: () => Promise.resolve(), priority: 2 },
  ],
  "/radar": [
    { key: "/radar", fn: () => import("@/lib/performance/prefetch-engine").then((m) => m.prefetchEngine.prefetchDiscovery()), priority: 4 },
  ],
  "/me": [
    { key: "/me", fn: () => Promise.resolve(), priority: 5 },
  ],
};

let tasksRegistered = false;

function registerPillarPrefetchTasks(): void {
  if (tasksRegistered) return;
  tasksRegistered = true;
  for (const [, tasks] of Object.entries(PILLAR_PREFETCH_TASKS)) {
    for (const task of tasks) {
      prefetchEngine.register(task.key, task.fn, { priority: task.priority, ttlMs: 120_000 });
    }
  }
}

function PillarSkeleton({ pillar }: { pillar: string | null }) {
  return (
    <div className="flex flex-col gap-4 p-4 animate-pulse" data-pillar={pillar}>
      <div className="h-8 w-48 rounded-lg bg-muted/60" />
      <div className="h-4 w-72 rounded bg-muted/40" />
      <div className="h-40 w-full rounded-2xl bg-muted/30" />
      <div className="h-4 w-56 rounded bg-muted/40" />
      <div className="h-32 w-full rounded-2xl bg-muted/30" />
      <div className="h-4 w-40 rounded bg-muted/40" />
      <div className="h-24 w-full rounded-2xl bg-muted/30" />
    </div>
  );
}

export function PillarSuspenseBoundary({ children }: { children: ReactNode }) {
  const location = useLocation();
  const prevPath = useRef(location.pathname);
  const [, startTransition] = useTransition();

  useEffect(() => {
    registerPillarPrefetchTasks();
  }, []);

  useEffect(() => {
    const current = location.pathname;
    if (prevPath.current !== current) {
      navigationPredictor.recordNavigation(prevPath.current, current);

      startTransition(() => {
        const predictions = navigationPredictor.predict(current);
        for (const pred of predictions) {
          if (pred.confidence > 0.2) {
            prefetchRoute(pred.route);
          }
        }
      });

      prefetchEngine.runPredictive(current).catch(() => {});

      prevPath.current = current;
    }
  }, [location.pathname, startTransition]);

  const pillar = navigationPredictor.getPillarForRoute(location.pathname);

  return (
    <Suspense fallback={<PillarSkeleton pillar={pillar} />}>
      {children}
    </Suspense>
  );
}
