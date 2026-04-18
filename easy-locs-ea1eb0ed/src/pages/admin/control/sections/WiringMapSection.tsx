import { lazy, Suspense } from "react";
import { Loader2 } from "lucide-react";
import SectionPlaceholder from "./SectionPlaceholder";
import { getSection } from "../sections";

/**
 * Wiring Map — Supreme Admin Dashboard P1 (#1031, P2.10).
 *
 * Searchable table of routes, hooks, services, repositories, edge
 * functions, tables/RPCs, cron jobs, CI/CD jobs, platform-bus events
 * and feature flags. Reuses the existing AdminWiringHealthPage data
 * (architecture lab / wiring health verifier) — does not re-scan.
 *
 * Phase 1 ships the read view inside the shell; reverse-dependency
 * exploration is layered on in Phase 2 without changing the data path.
 */
const AdminWiringHealthPage = lazy(() => import("@/pages/admin/AdminWiringHealthPage"));

export default function WiringMapSection() {
  return (
    <SectionPlaceholder section={getSection("wiring")}>
      <Suspense
        fallback={
          <div className="flex items-center gap-2 text-xs text-muted-foreground p-4">
            <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading wiring map…
          </div>
        }
      >
        <AdminWiringHealthPage />
      </Suspense>
    </SectionPlaceholder>
  );
}
