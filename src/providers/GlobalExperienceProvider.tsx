/**
 * GLOBAL EXPERIENCE PROVIDER
 * Initializes and periodically refreshes the experience orchestrator.
 * Sits high in the component tree, zero side effects on routing/auth.
 */

import { useEffect, useRef } from "react";
import { useGlobalExperienceStore } from "@/stores/globalExperienceStore";
import { EXPERIENCE_LIMITS } from "@/lib/experience/global-experience-types";

export function GlobalExperienceProvider({ children }: { children: React.ReactNode }) {
  const refresh = useGlobalExperienceStore(s => s.refresh);
  const initialized = useGlobalExperienceStore(s => s.initialized);
  const intervalRef = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => {
    // Initial compute on mount
    if (!initialized) {
      refresh();
    }

    // Periodic refresh every 5 minutes
    intervalRef.current = setInterval(() => {
      refresh();
    }, EXPERIENCE_LIMITS.refreshIntervalMs);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return <>{children}</>;
}
