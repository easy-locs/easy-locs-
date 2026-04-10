import { useEffect, useRef } from "react";
import { useGlobalExperienceStore } from "@/stores/globalExperienceStore";
import { EXPERIENCE_LIMITS } from "@/lib/experience/global-experience-types";

function useGlobalExperienceInit() {
  const refresh = useGlobalExperienceStore(s => s.refresh);
  const initialized = useGlobalExperienceStore(s => s.initialized);
  const intervalRef = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => {
    if (!initialized) {
      refresh();
    }

    intervalRef.current = setInterval(() => {
      refresh();
    }, EXPERIENCE_LIMITS.refreshIntervalMs);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);
}

export function GlobalExperienceInit() {
  useGlobalExperienceInit();
  return null;
}

export function GlobalExperienceProvider({ children }: { children: React.ReactNode }) {
  useGlobalExperienceInit();
  return <>{children}</>;
}
