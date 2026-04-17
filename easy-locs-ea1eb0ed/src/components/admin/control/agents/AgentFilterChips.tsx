/**
 * AgentFilterChips — chip-based filter row replacing native <select>s.
 *
 * Each filter is a horizontal scrollable strip of toggleable chips.
 * Selecting a chip toggles its value on/off; "All" clears the filter.
 * Search stays as an input on the left because typing is faster than
 * clicking through chips for free-text matches.
 */
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  AGENT_KIND_META,
  KNOWN_AGENT_KINDS,
} from "@/components/admin/agents/agent-kind";
import type {
  AgentHealthStatus,
  AgentLifecycleStatus,
} from "@/lib/admin/agents-repo";

export interface FiltersState {
  q: string;
  kind: string;
  status: AgentLifecycleStatus | "";
  health: AgentHealthStatus | "";
  team: string;
}

interface Props {
  value: FiltersState;
  onChange: (next: FiltersState) => void;
  teamOptions: string[];
  matched: number;
  total: number;
  onReset: () => void;
}

const STATUSES: AgentLifecycleStatus[] = ["active", "canary", "disabled", "deprecated"];
const HEALTH: AgentHealthStatus[] = ["healthy", "degraded", "stale", "down", "unknown"];

function Chip({
  active,
  onClick,
  children,
  testId,
  tone = "default",
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  testId?: string;
  tone?: "default" | "success" | "warning" | "destructive";
}) {
  const toneActive =
    tone === "success"
      ? "bg-success/15 text-success border-success/40"
      : tone === "warning"
        ? "bg-warning/15 text-warning border-warning/40"
        : tone === "destructive"
          ? "bg-destructive/15 text-destructive border-destructive/40"
          : "bg-primary text-primary-foreground border-primary";
  return (
    <button
      type="button"
      onClick={onClick}
      data-testid={testId}
      data-active={active}
      className={cn(
        "h-7 px-2.5 rounded-full text-[0.6875rem] border transition-colors whitespace-nowrap font-medium",
        active
          ? toneActive
          : "bg-muted/40 text-muted-foreground border-border/40 hover:bg-muted hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

function chipRow(label: string, children: React.ReactNode) {
  return (
    <div className="flex items-center gap-1.5 min-w-0 overflow-x-auto pb-0.5 scrollbar-hide">
      <span className="text-[0.5625rem] uppercase tracking-wider text-muted-foreground/70 shrink-0 pr-1">
        {label}
      </span>
      {children}
    </div>
  );
}

export default function AgentFilterChips({
  value,
  onChange,
  teamOptions,
  matched,
  total,
  onReset,
}: Props) {
  const set = <K extends keyof FiltersState>(k: K, v: FiltersState[K]) =>
    onChange({ ...value, [k]: v });

  const hasFilter =
    !!value.q || !!value.kind || !!value.status || !!value.health || !!value.team;

  const toneFor = (s: AgentLifecycleStatus) =>
    s === "active"
      ? ("success" as const)
      : s === "canary"
        ? ("warning" as const)
        : ("destructive" as const);
  const healthTone = (h: AgentHealthStatus) =>
    h === "healthy"
      ? ("success" as const)
      : h === "degraded"
        ? ("warning" as const)
        : h === "stale" || h === "down"
          ? ("destructive" as const)
          : ("default" as const);

  return (
    <div className="space-y-2" data-testid="agents-filter-chips">
      <div className="flex items-center gap-2">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <Input
            value={value.q}
            onChange={(e) => set("q", e.target.value)}
            placeholder="Search by slug, name, team…"
            className="pl-8 h-9 text-sm rounded-xl"
            data-testid="agents-search"
          />
        </div>
        <span className="text-[0.625rem] uppercase tracking-wide text-muted-foreground tabular-nums shrink-0">
          {matched} / {total}
        </span>
        {hasFilter && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-[0.6875rem] gap-1"
            onClick={onReset}
            data-testid="agents-filter-reset"
          >
            <X className="w-3 h-3" />
            Reset
          </Button>
        )}
      </div>

      {chipRow(
        "Type",
        <>
          <Chip active={!value.kind} onClick={() => set("kind", "")}>
            All
          </Chip>
          {KNOWN_AGENT_KINDS.map((k) => (
            <Chip
              key={k}
              active={value.kind === k}
              onClick={() => set("kind", value.kind === k ? "" : k)}
              testId={`agents-chip-kind-${k}`}
            >
              {AGENT_KIND_META[k]?.label ?? k}
            </Chip>
          ))}
        </>,
      )}

      {chipRow(
        "Status",
        <>
          <Chip active={!value.status} onClick={() => set("status", "")}>
            All
          </Chip>
          {STATUSES.map((s) => (
            <Chip
              key={s}
              active={value.status === s}
              tone={toneFor(s)}
              onClick={() => set("status", value.status === s ? "" : s)}
              testId={`agents-chip-status-${s}`}
            >
              {s}
            </Chip>
          ))}
        </>,
      )}

      {chipRow(
        "Health",
        <>
          <Chip active={!value.health} onClick={() => set("health", "")}>
            All
          </Chip>
          {HEALTH.map((h) => (
            <Chip
              key={h}
              active={value.health === h}
              tone={healthTone(h)}
              onClick={() => set("health", value.health === h ? "" : h)}
              testId={`agents-chip-health-${h}`}
            >
              {h}
            </Chip>
          ))}
        </>,
      )}

      {teamOptions.length > 0 &&
        chipRow(
          "Team",
          <>
            <Chip active={!value.team} onClick={() => set("team", "")}>
              All
            </Chip>
            {teamOptions.map((t) => (
              <Chip
                key={t}
                active={value.team === t}
                onClick={() => set("team", value.team === t ? "" : t)}
                testId={`agents-chip-team-${t}`}
              >
                {t}
              </Chip>
            ))}
          </>,
        )}
    </div>
  );
}
