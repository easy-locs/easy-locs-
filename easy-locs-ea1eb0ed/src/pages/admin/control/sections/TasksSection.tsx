import { lazy, Suspense } from "react";
import { Loader2 } from "lucide-react";
import SectionPlaceholder from "./SectionPlaceholder";
import { getSection } from "../sections";

/**
 * Tasks — Supreme Admin Dashboard P0 (#1031, P1.4).
 *
 * Live task console: lifecycle (queued → running → completed / blocked),
 * severity, domain, assignee. Reuses the existing ExecutionTaskPanel
 * which already streams `system.execution_tasks` over realtime, with
 * timeline and authorized retries.
 *
 * Phase 1 ships the read + lifecycle surface. NL intake (semantic dedup
 * + LLM classifier) is wired through the existing `chief-agent` edge
 * function; the Slash section already exposes the input UX.
 */
const ExecutionTaskPanel = lazy(() =>
  import("@/components/admin/ExecutionTaskPanel").then((m) => ({
    default: m.ExecutionTaskPanel,
  })),
);

export default function TasksSection() {
  return (
    <SectionPlaceholder section={getSection("tasks")}>
      <Suspense
        fallback={
          <div className="flex items-center gap-2 text-xs text-muted-foreground p-4">
            <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading tasks…
          </div>
        }
      >
        <ExecutionTaskPanel />
      </Suspense>
    </SectionPlaceholder>
  );
}
