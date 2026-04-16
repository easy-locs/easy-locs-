import { Routes, useLocation } from "react-router-dom";
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useTransition,
  type ReactNode,
} from "react";

const TransitionLocationContext = createContext<ReturnType<typeof useLocation> | null>(null);

export function useTransitionLocation() {
  const ctx = useContext(TransitionLocationContext);
  return ctx ?? undefined;
}

export function TransitionRouter({ children }: { children: ReactNode }) {
  const location = useLocation();
  const [isPending, startTransition] = useTransition();
  const [displayLocation, setDisplayLocation] = useState(location);

  useEffect(() => {
    if (location.key !== displayLocation.key) {
      startTransition(() => {
        setDisplayLocation(location);
      });
    }
  }, [location.key, displayLocation.key]);

  return (
    <TransitionLocationContext.Provider value={displayLocation}>
      <div
        style={{ opacity: isPending ? 0.85 : 1, transition: "opacity 150ms ease" }}
        data-transition-pending={isPending || undefined}
      >
        {children}
      </div>
    </TransitionLocationContext.Provider>
  );
}

export function TransitionRoutes({ children }: { children: ReactNode }) {
  const loc = useTransitionLocation();
  return <Routes location={loc}>{children}</Routes>;
}

export function NavigationTracker() {
  const location = useLocation();
  const prevPathRef = useRef(location.pathname);

  useEffect(() => {
    const from = prevPathRef.current;
    const to = location.pathname;
    if (from !== to) {
      import("@/lib/performance/prefetch-engine")
        .then(({ prefetchEngine }) => {
          prefetchEngine.recordNavigation(from, to);
        })
        .catch(() => {});
      prevPathRef.current = to;
    }
  }, [location.pathname]);

  return null;
}
