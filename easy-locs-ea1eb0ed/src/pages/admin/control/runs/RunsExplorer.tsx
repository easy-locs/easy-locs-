/**
 * ACP Agent 7 (#866) — Runs Explorer.
 *
 * Mounted by `RunsSection` at /admin/control/runs. Reads `?agent=:slug`
 * to select an agent (legacy redirect from /admin/agents/:slug/runs),
 * otherwise prompts the operator to pick one. The list reuses
 * `agentsRepo.listAgentRunsRich` — exactly the hook driving
 * `AdminAgentRunsPage` — and applies operator-side filters (status,
 * cost, latency, model, period) plus a compact run-rate timeline.
 *
 * The right pane shows the selected run with syntax-highlighted
 * prompt/response (JSON or markdown), per-step metrics, the tool-call
 * DAG, and a Replay button that re-dispatches the run via the
 * canonical `taskDispatcher`.
 */
import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Loader2,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
  ExternalLink,
  Filter,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { agentsRepo, type AgentRow, type AgentRunRichRow } from "@/lib/admin/agents-repo";
import SectionPlaceholder from "../sections/SectionPlaceholder";
import { getSection } from "../sections";
import { AutoHighlight, JsonHighlight } from "./syntax";
import { ToolDag } from "./ToolDag";
import ReplayDialog from "./ReplayDialog";

type StatusFilter =
  | "all"
  | "succeeded"
  | "failed"
  | "blocked"
  | "running"
  | "pending_review"
  | "queued";

type PeriodFilter = "1h" | "24h" | "7d" | "30d" | "all";

interface Filters {
  status: StatusFilter;
  model: string; // free-text contains
  maxCostUsd: string; // empty = no filter
  maxLatencyMs: string; // empty = no filter
  period: PeriodFilter;
  q: string;
}

const DEFAULT_FILTERS: Filters = {
  status: "all",
  model: "",
  maxCostUsd: "",
  maxLatencyMs: "",
  period: "24h",
  q: "",
};

function fmtMs(ms: number | null): string {
  if (ms == null) return "—";
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}
function fmtUsd(n: number | null): string {
  if (n == null) return "—";
  return n < 0.01 ? `$${n.toFixed(6)}` : `$${n.toFixed(4)}`;
}
function statusTone(status: string): string {
  if (status === "succeeded") return "bg-success/15 text-success";
  if (status === "failed" || status === "blocked") return "bg-destructive/15 text-destructive";
  if (status === "running") return "bg-info/15 text-info";
  if (status === "pending_review") return "bg-warning/15 text-warning";
  return "bg-muted text-muted-foreground";
}

function periodCutoff(p: PeriodFilter): number | null {
  const now = Date.now();
  switch (p) {
    case "1h":
      return now - 60 * 60 * 1000;
    case "24h":
      return now - 24 * 60 * 60 * 1000;
    case "7d":
      return now - 7 * 24 * 60 * 60 * 1000;
    case "30d":
      return now - 30 * 24 * 60 * 60 * 1000;
    case "all":
    default:
      return null;
  }
}

function applyFilters(rows: AgentRunRichRow[], f: Filters): AgentRunRichRow[] {
  const cutoff = periodCutoff(f.period);
  const maxCost = f.maxCostUsd.trim() === "" ? null : Number(f.maxCostUsd);
  const maxLat = f.maxLatencyMs.trim() === "" ? null : Number(f.maxLatencyMs);
  const model = f.model.trim().toLowerCase();
  const q = f.q.trim().toLowerCase();
  return rows.filter((r) => {
    if (f.status !== "all" && r.status !== f.status) return false;
    if (cutoff != null && new Date(r.created_at).getTime() < cutoff) return false;
    if (maxCost != null && Number.isFinite(maxCost) && (r.cost_usd ?? 0) > maxCost) return false;
    if (maxLat != null && Number.isFinite(maxLat) && (r.latency_ms ?? 0) > maxLat) return false;
    if (model && !(r.model ?? "").toLowerCase().includes(model)) return false;
    if (q) {
      const hay = [
        r.task_id,
        r.type,
        r.status,
        r.model ?? "",
        r.provider ?? "",
        r.purpose ?? "",
      ]
        .join(" ")
        .toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

export default function RunsExplorer() {
  const [searchParams, setSearchParams] = useSearchParams();
  const agentSlug = searchParams.get("agent");
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [replayOpen, setReplayOpen] = useState(false);

  const agentsQuery = useQuery({
    queryKey: ["admin-control-runs-agents"],
    queryFn: () => agentsRepo.listAgents(),
    staleTime: 60_000,
  });

  const agent: AgentRow | null = useMemo(() => {
    if (!agentsQuery.data) return null;
    if (!agentSlug) return null;
    return agentsQuery.data.find((a) => a.slug === agentSlug) ?? null;
  }, [agentsQuery.data, agentSlug]);

  const domain = useMemo(() => {
    if (!agent) return "ai";
    const cap = agent.capabilities?.[0];
    return cap?.domain ?? "ai";
  }, [agent]);

  const runsQuery = useQuery({
    queryKey: ["admin-control-runs", agent?.id, domain],
    queryFn: () => agentsRepo.listAgentRunsRich(agent!.id, domain, 200),
    enabled: !!agent,
    refetchInterval: 15_000,
  });

  const filtered = useMemo(
    () => (runsQuery.data ? applyFilters(runsQuery.data, filters) : []),
    [runsQuery.data, filters],
  );

  // Auto-select first run when the list changes and the current selection is gone.
  useEffect(() => {
    if (!filtered.length) {
      if (selectedRunId !== null) setSelectedRunId(null);
      return;
    }
    if (!filtered.find((r) => r.task_id === selectedRunId)) {
      setSelectedRunId(filtered[0].task_id);
    }
  }, [filtered, selectedRunId]);

  const selected = filtered.find((r) => r.task_id === selectedRunId) ?? null;

  function handleAgentChange(slug: string) {
    const next = new URLSearchParams(searchParams);
    if (slug) next.set("agent", slug);
    else next.delete("agent");
    setSearchParams(next, { replace: true });
    setSelectedRunId(null);
  }

  return (
    <SectionPlaceholder section={getSection("runs")}>
      <div className="space-y-4">
        <AgentPicker
          agents={agentsQuery.data ?? []}
          loading={agentsQuery.isLoading}
          error={agentsQuery.error as Error | null}
          selectedSlug={agentSlug}
          onChange={handleAgentChange}
        />

        {!agent ? (
          <div className="rounded-xl border border-dashed border-border/60 bg-card/40 p-8 text-center text-sm text-muted-foreground">
            {agentSlug ? (
              <>
                Agent <code className="font-mono">{agentSlug}</code> was not found.
              </>
            ) : (
              "Pick an agent to inspect its recent runs, replay a prompt, and walk the tool DAG."
            )}
          </div>
        ) : (
          <>
            <FiltersBar filters={filters} onChange={setFilters} />
            <Timeline rows={filtered} />
            <div className="grid grid-cols-12 gap-4">
              <div className="col-span-12 lg:col-span-5">
                <RunsList
                  loading={runsQuery.isLoading}
                  error={runsQuery.error as Error | null}
                  rows={filtered}
                  totalRaw={runsQuery.data?.length ?? 0}
                  selectedId={selectedRunId}
                  onSelect={setSelectedRunId}
                  onRefresh={() => runsQuery.refetch()}
                />
              </div>
              <div className="col-span-12 lg:col-span-7">
                <RunDetailPane
                  run={selected}
                  domain={domain}
                  onReplay={() => setReplayOpen(true)}
                />
              </div>
            </div>
          </>
        )}
      </div>

      <ReplayDialog
        open={replayOpen}
        onOpenChange={setReplayOpen}
        run={selected}
        domain={domain}
      />
    </SectionPlaceholder>
  );
}

function AgentPicker({
  agents,
  loading,
  error,
  selectedSlug,
  onChange,
}: {
  agents: AgentRow[];
  loading: boolean;
  error: Error | null;
  selectedSlug: string | null;
  onChange: (slug: string) => void;
}) {
  return (
    <div className="rounded-lg border border-border/40 bg-card/40 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Agent</span>
        {loading ? (
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" /> Loading agents…
          </span>
        ) : error ? (
          <span className="inline-flex items-center gap-1 text-xs text-destructive">
            <AlertTriangle className="h-3 w-3" /> {error.message}
          </span>
        ) : (
          <Select value={selectedSlug ?? ""} onValueChange={onChange}>
            <SelectTrigger className="h-8 w-[260px] text-xs">
              <SelectValue placeholder="Select an agent…" />
            </SelectTrigger>
            <SelectContent>
              {agents.map((a) => (
                <SelectItem key={a.id} value={a.slug} className="text-xs">
                  {a.display_name}{" "}
                  <span className="text-muted-foreground">· {a.slug}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        {selectedSlug ? (
          <Link
            to={`/admin/agents/${selectedSlug}`}
            className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
          >
            agent profile <ExternalLink className="h-3 w-3" />
          </Link>
        ) : null}
      </div>
    </div>
  );
}

function FiltersBar({
  filters,
  onChange,
}: {
  filters: Filters;
  onChange: (next: Filters) => void;
}) {
  function patch<K extends keyof Filters>(key: K, value: Filters[K]) {
    onChange({ ...filters, [key]: value });
  }
  return (
    <div className="rounded-lg border border-border/40 bg-card/40 p-3 space-y-2">
      <div className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-muted-foreground">
        <Filter className="h-3 w-3" /> Filters
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Select value={filters.status} onValueChange={(v) => patch("status", v as StatusFilter)}>
          <SelectTrigger className="h-8 w-[140px] text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="succeeded">succeeded</SelectItem>
            <SelectItem value="failed">failed</SelectItem>
            <SelectItem value="blocked">blocked</SelectItem>
            <SelectItem value="running">running</SelectItem>
            <SelectItem value="pending_review">pending_review</SelectItem>
            <SelectItem value="queued">queued</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filters.period} onValueChange={(v) => patch("period", v as PeriodFilter)}>
          <SelectTrigger className="h-8 w-[120px] text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1h">Last hour</SelectItem>
            <SelectItem value="24h">Last 24h</SelectItem>
            <SelectItem value="7d">Last 7d</SelectItem>
            <SelectItem value="30d">Last 30d</SelectItem>
            <SelectItem value="all">All time</SelectItem>
          </SelectContent>
        </Select>

        <Input
          value={filters.model}
          onChange={(e) => patch("model", e.target.value)}
          placeholder="model contains…"
          className="h-8 w-[160px] text-xs"
        />
        <Input
          value={filters.maxCostUsd}
          onChange={(e) => patch("maxCostUsd", e.target.value)}
          placeholder="max cost USD"
          inputMode="decimal"
          className="h-8 w-[120px] text-xs"
        />
        <Input
          value={filters.maxLatencyMs}
          onChange={(e) => patch("maxLatencyMs", e.target.value)}
          placeholder="max latency ms"
          inputMode="numeric"
          className="h-8 w-[140px] text-xs"
        />
        <Input
          value={filters.q}
          onChange={(e) => patch("q", e.target.value)}
          placeholder="search id / type / purpose…"
          className="h-8 w-[220px] text-xs"
        />

        {filters !== DEFAULT_FILTERS ? (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-8 text-xs"
            onClick={() => onChange(DEFAULT_FILTERS)}
          >
            Reset
          </Button>
        ) : null}
      </div>
    </div>
  );
}

/**
 * Compact run-rate timeline. Buckets the filtered rows into 24 equal
 * slots across the active period and draws a sparkline-style bar chart
 * with status segmentation.
 */
function Timeline({ rows }: { rows: AgentRunRichRow[] }) {
  const buckets = useMemo(() => {
    if (rows.length === 0) return [] as Array<{ ok: number; fail: number; other: number }>;
    const stamps = rows.map((r) => new Date(r.created_at).getTime());
    const min = Math.min(...stamps);
    const max = Math.max(...stamps);
    const span = Math.max(1, max - min);
    const N = 24;
    const buckets: Array<{ ok: number; fail: number; other: number }> = Array.from(
      { length: N },
      () => ({ ok: 0, fail: 0, other: 0 }),
    );
    for (const r of rows) {
      const t = new Date(r.created_at).getTime();
      const idx = Math.min(N - 1, Math.floor(((t - min) / span) * N));
      const target = buckets[idx];
      if (r.status === "succeeded") target.ok += 1;
      else if (r.status === "failed" || r.status === "blocked") target.fail += 1;
      else target.other += 1;
    }
    return buckets;
  }, [rows]);

  if (buckets.length === 0) {
    return null;
  }
  const peak = buckets.reduce(
    (m, b) => Math.max(m, b.ok + b.fail + b.other),
    1,
  );

  return (
    <div className="rounded-lg border border-border/40 bg-card/40 p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
          Timeline · {rows.length} runs
        </div>
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <span className="h-2 w-2 rounded-sm bg-success" /> ok
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-2 w-2 rounded-sm bg-destructive" /> fail
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-2 w-2 rounded-sm bg-muted-foreground/60" /> other
          </span>
        </div>
      </div>
      <div className="flex h-16 items-end gap-0.5">
        {buckets.map((b, i) => {
          const total = b.ok + b.fail + b.other;
          const h = (total / peak) * 100;
          const okH = total > 0 ? (b.ok / total) * h : 0;
          const failH = total > 0 ? (b.fail / total) * h : 0;
          const otherH = total > 0 ? (b.other / total) * h : 0;
          return (
            <div
              key={i}
              className="flex-1 flex flex-col-reverse"
              title={`${total} runs · ok ${b.ok} · fail ${b.fail} · other ${b.other}`}
            >
              {b.ok > 0 ? <div style={{ height: `${okH}%` }} className="bg-success" /> : null}
              {b.fail > 0 ? (
                <div style={{ height: `${failH}%` }} className="bg-destructive" />
              ) : null}
              {b.other > 0 ? (
                <div style={{ height: `${otherH}%` }} className="bg-muted-foreground/60" />
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function RunsList({
  loading,
  error,
  rows,
  totalRaw,
  selectedId,
  onSelect,
  onRefresh,
}: {
  loading: boolean;
  error: Error | null;
  rows: AgentRunRichRow[];
  totalRaw: number;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onRefresh: () => void;
}) {
  return (
    <div className="rounded-lg border border-border/40 bg-card/40 overflow-hidden">
      <div className="flex items-center justify-between border-b border-border/40 px-3 py-2">
        <div className="text-xs">
          <span className="font-medium">Recent runs</span>
          <span className="text-muted-foreground">
            {" "}
            · {rows.length} of {totalRaw}
          </span>
        </div>
        <Button variant="ghost" size="sm" className="h-7 px-2 gap-1" onClick={onRefresh}>
          <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} /> Refresh
        </Button>
      </div>
      <div className="max-h-[60vh] overflow-y-auto">
        {error ? (
          <div className="p-4 text-xs text-destructive flex items-start gap-1">
            <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" /> {error.message}
          </div>
        ) : loading ? (
          <div className="p-4 flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" /> Loading runs…
          </div>
        ) : rows.length === 0 ? (
          <div className="p-4 text-xs text-muted-foreground">
            {totalRaw === 0
              ? "No runs recorded yet for this agent."
              : "No runs match the current filters."}
          </div>
        ) : (
          <ul className="divide-y divide-border/40">
            {rows.map((r) => (
              <li key={r.task_id}>
                <button
                  type="button"
                  onClick={() => onSelect(r.task_id)}
                  className={`w-full text-left px-3 py-2 hover:bg-muted/40 transition ${
                    selectedId === r.task_id ? "bg-muted/60" : ""
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-mono truncate">
                      {r.task_id.slice(0, 8)}…
                    </span>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded ${statusTone(r.status)}`}
                    >
                      {r.status}
                    </span>
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-0.5 truncate">
                    {r.type} · {fmtMs(r.latency_ms)} · {fmtUsd(r.cost_usd)}
                    {r.model ? ` · ${r.model}` : ""}
                  </div>
                  {r.held_for_review && !r.released_at ? (
                    <div className="text-[11px] text-warning flex items-center gap-1 mt-1">
                      <ShieldAlert className="h-3 w-3" /> awaiting release
                    </div>
                  ) : null}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function RunDetailPane({
  run,
  domain,
  onReplay,
}: {
  run: AgentRunRichRow | null;
  domain: string;
  onReplay: () => void;
}) {
  if (!run) {
    return (
      <div className="rounded-lg border border-dashed border-border/60 bg-card/40 p-8 text-center text-xs text-muted-foreground">
        Pick a run on the left to inspect prompt, response, tool DAG, and metrics.
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border/40 bg-card/40 overflow-hidden">
      <div className="flex items-center justify-between border-b border-border/40 px-3 py-2">
        <div className="text-xs">
          <span className="font-medium">Run</span>{" "}
          <code className="font-mono text-[11px]">{run.task_id.slice(0, 12)}…</code>{" "}
          <span className={`text-[10px] px-1.5 py-0.5 rounded ${statusTone(run.status)}`}>
            {run.status}
          </span>
        </div>
        <Button size="sm" variant="default" className="h-7 gap-1" onClick={onReplay}>
          <RefreshCw className="h-3 w-3" /> Replay
        </Button>
      </div>
      <div className="max-h-[60vh] overflow-y-auto p-3 space-y-3">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
          <Stat label="status" value={run.status} />
          <Stat label="risk" value={run.risk_level} />
          <Stat label="latency" value={fmtMs(run.latency_ms)} />
          <Stat label="cost" value={fmtUsd(run.cost_usd)} />
          {run.model ? <Stat label="model" value={run.model} /> : null}
          {run.provider ? <Stat label="provider" value={run.provider} /> : null}
          <Stat label="created" value={new Date(run.created_at).toLocaleString()} />
          <Stat label="domain" value={domain} />
        </div>

        {run.held_for_review ? (
          <div className="rounded border border-warning/40 bg-warning/5 p-3 space-y-2">
            <div className="flex items-center gap-2 text-warning text-sm font-medium">
              <ShieldAlert className="h-4 w-4" />
              Sensitive output — held for review
            </div>
            {run.held_reason ? (
              <p className="text-xs text-muted-foreground">Reason: {run.held_reason}</p>
            ) : null}
            <Link
              to={`/admin/approvals?taskId=${run.task_id}`}
              className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
            >
              Review in approvals inbox <ExternalLink className="h-3 w-3" />
            </Link>
          </div>
        ) : run.released_at ? (
          <div className="rounded border border-success/40 bg-success/5 p-3">
            <p className="text-xs flex items-center gap-1 text-success">
              <CheckCircle2 className="h-3 w-3" /> Decided at{" "}
              {new Date(run.released_at).toLocaleString()}
            </p>
          </div>
        ) : null}

        <Section title="Prompt" empty="no prompt captured" body={run.prompt} />
        <Section title="Response" empty="no response captured" body={run.response} />

        {run.purpose ? (
          <div className="rounded border bg-muted/30 px-3 py-2 text-xs">
            <span className="text-[10px] uppercase text-muted-foreground mr-2">Purpose</span>
            <code className="font-mono">{run.purpose}</code>
          </div>
        ) : null}

        {run.verification ? (
          <div className="rounded border bg-muted/20 px-3 py-2">
            <div className="text-[10px] uppercase text-muted-foreground mb-1">
              Verifier verdict
            </div>
            <JsonHighlight value={run.verification} />
          </div>
        ) : null}

        <ToolDag tools={run.tools_used} />

        {run.error ? (
          <div className="rounded border border-destructive/40 bg-destructive/5 p-3">
            <div className="text-destructive text-sm font-medium flex items-center gap-1">
              <XCircle className="h-4 w-4" /> Error
            </div>
            <pre className="text-xs whitespace-pre-wrap mt-1">{run.error}</pre>
          </div>
        ) : null}

        <div className="text-[10px] text-muted-foreground flex items-center gap-1">
          <Clock className="h-3 w-3" /> task id: <code>{run.task_id}</code>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border bg-muted/30 px-2 py-1">
      <div className="text-[10px] uppercase text-muted-foreground">{label}</div>
      <div className="font-mono truncate">{value}</div>
    </div>
  );
}

function Section({
  title,
  body,
  empty,
}: {
  title: string;
  body: string | null;
  empty: string;
}) {
  return (
    <div>
      <div className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-2">
        {title}
        {body ? (
          <Badge variant="outline" className="text-[10px] py-0 h-4">
            {body.length.toLocaleString()} chars
          </Badge>
        ) : null}
      </div>
      {body ? (
        <AutoHighlight source={body} />
      ) : (
        <div className="text-xs italic text-muted-foreground">{empty}</div>
      )}
    </div>
  );
}
