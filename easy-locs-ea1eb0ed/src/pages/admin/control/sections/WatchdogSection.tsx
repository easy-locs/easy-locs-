import { lazy, Suspense } from "react";
import { Loader2 } from "lucide-react";
import SectionPlaceholder from "./SectionPlaceholder";
import { getSection } from "../sections";

/**
 * Watchdog — Supreme Admin Dashboard P0 (#1031, embedded view of the
 * existing AdminWatchdogPage). Surfaces timeout enforcement, stuck-task
 * detection, dependency validation, duplicate prevention, incident log,
 * and anomaly/spike detection from the watchdog / merge-conflict-recovery
 * / wiring-verifier / learning-loop pipelines. Manual force-unblock and
 * quarantine actions stay routed through the Approvals queue (P0.7) —
 * the watchdog page itself is read+governed.
 */
const AdminWatchdogPage = lazy(() => import("@/pages/admin/AdminWatchdogPage"));

export default function WatchdogSection() {
  return (
    <SectionPlaceholder section={getSection("watchdog")}>
      <Suspense
        fallback={
          <div className="flex items-center gap-2 text-xs text-muted-foreground p-4">
            <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading watchdog…
          </div>
        }
      >
        <AdminWatchdogPage />
      </Suspense>
    </SectionPlaceholder>
  );
}
