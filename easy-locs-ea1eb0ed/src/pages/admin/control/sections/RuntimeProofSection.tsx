import { lazy, Suspense } from "react";
import { Loader2 } from "lucide-react";
import SectionPlaceholder from "./SectionPlaceholder";
import { getSection } from "../sections";

/**
 * Runtime Proof — Supreme Admin Dashboard P0 (#1031, P1.7).
 *
 * Badges for build, E2E, auth, dashboard, route health, edge function
 * health, integration health, cron health, and SLO/error budget. Each
 * badge expands to last check + last failure. Sourced from the existing
 * ExecutionProofPage which already aggregates the underlying snapshots
 * (system_health_snapshots, integration-health-monitor, cron dispatcher).
 */
const ExecutionProofPage = lazy(() => import("@/pages/admin/ExecutionProofPage"));

export default function RuntimeProofSection() {
  return (
    <SectionPlaceholder section={getSection("proof")}>
      <Suspense
        fallback={
          <div className="flex items-center gap-2 text-xs text-muted-foreground p-4">
            <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading proof…
          </div>
        }
      >
        <ExecutionProofPage />
      </Suspense>
    </SectionPlaceholder>
  );
}
