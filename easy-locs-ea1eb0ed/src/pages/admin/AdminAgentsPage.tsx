/**
 * AdminAgentsPage — Sovereign Agent Control · L4 (#813)
 *
 * The cockpit. One screen to see, govern, and trigger every registered
 * platform agent — business adapters, AI router/tools, dev builders,
 * platform internals — without leaving the page.
 *
 * Design notes:
 *   • Kind-agnostic — we never branch logic on `agent_kind`; only the
 *     icon/badge presentation differs (see `agent-kind.ts`).
 *   • Reads live from `system.v_agents_overview` + `system.v_agent_health`
 *     (joined client-side, the queue is small).
 *   • Writes go through `system.set_agent_status` only — no direct
 *     UPDATEs on `system.agents` from the client.
 *   • Detail drawer is lazy: each tab fetches only when the user
 *     clicks it, keeping the table snappy when many agents exist.
 */
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Loader2,
  RefreshCcw,
  Search,
  ServerCog,
  AlertTriangle,
} from "lucide-react";
import SubPageShell from "@/components/layout/SubPageShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useUiEngine } from "@/hooks/useUiEngine";
import {
  agentsRepo,
  type AgentHealthStatus,
  type AgentLifecycleStatus,
  type AgentRow,
} from "@/lib/admin/agents-repo";
import {
  AGENT_KIND_META,
  KNOWN_AGENT_KINDS,
  getKindMeta,
} from "@/components/admin/agents/agent-kind";
import AgentDetailDrawer from "@/components/admin/agents/AgentDetailDrawer";
import AgentActionsMenu from "@/components/admin/agents/AgentActionsMenu";

function relTime(iso: string | null): string {
  if (!iso) return "never";
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 60_000) return `${Math.round(ms / 1000)}s`;
  if (ms < 3_600_000) return `${Math.round(ms / 60_000)}m`;
  if (ms < 86_400_000) return `${Math.round(ms / 3_600_000)}h`;
  return `${Math.round(ms / 86_400_000)}d`;
}

function HealthDot({ status }: { status: string | null | undefined }) {
  const tone =
    status === "healthy"
      ? "bg-success"
      : status === "degraded"
        ? "bg-warning"
        : status === "stale" || status === "down"
          ? "bg-destructive"
          : "bg-muted-foreground/40";
  return <span className={`inline-block w-2 h-2 rounded-full ${tone}`} />;
}

function StatusBadge({ row }: { row: AgentRow }) {
  const variant =
    row.status === "active"
      ? "default"
      : row.status === "disabled" || row.status === "deprecated"
        ? "destructive"
        : "secondary";
  return (
    <Badge variant={variant} className="text-[0.625rem]">
      {row.status}
      {row.status === "canary" && row.canary_pct != null
        ? ` ${row.canary_pct}%`
        : ""}
    </Badge>
  );
}

export default function AdminAgentsPage() {
  useUiEngine("admin-adminagentspage");
  const [q, setQ] = useState("");
  const [kind, setKind] = useState<string>("");
  const [status, setStatus] = useState<AgentLifecycleStatus | "">("");
  const [health, setHealth] = useState<AgentHealthStatus | "">("");
  const [team, setTeam] = useState<string>("");
  const [sortBy, setSortBy] = useState<"name" | "lastRun">("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [selected, setSelected] = useState<AgentRow | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const listQuery = useQuery({
    queryKey: ["admin-agents", "list"],
    queryFn: () => agentsRepo.listAgents(),
    refetchInterval: 30_000,
  });

  const teamOptions = useMemo<string[]>(() => {
    const set = new Set<string>();
    for (const r of listQuery.data ?? []) {
      if (r.owner_team) set.add(r.owner_team);
    }
    return Array.from(set).sort();
  }, [listQuery.data]);

  const rows = useMemo<AgentRow[]>(() => {
    const all = listQuery.data ?? [];
    const filtered = all.filter((r) => {
      if (kind && r.agent_kind !== kind) return false;
      if (status && r.status !== status) return false;
      if (health && (r.health?.health_status ?? "unknown") !== health)
        return false;
      if (team && r.owner_team !== team) return false;
      if (q) {
        const needle = q.trim().toLowerCase();
        if (!needle) return true;
        const hay = `${r.slug} ${r.display_name} ${r.agent_kind} ${
          r.owner_team ?? ""
        }`.toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      return true;
    });
    const sorted = [...filtered].sort((a, b) => {
      let cmp = 0;
      if (sortBy === "name") {
        cmp = a.display_name.localeCompare(b.display_name);
      } else {
        // lastRun — nulls last, regardless of direction.
        const av = a.last_run_at ? new Date(a.last_run_at).getTime() : null;
        const bv = b.last_run_at ? new Date(b.last_run_at).getTime() : null;
        if (av === null && bv === null) cmp = 0;
        else if (av === null) return 1;
        else if (bv === null) return -1;
        else cmp = av - bv;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
    return sorted;
  }, [listQuery.data, q, kind, status, health, team, sortBy, sortDir]);

  const toggleSort = (col: "name" | "lastRun") => {
    if (sortBy === col) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(col);
      setSortDir(col === "name" ? "asc" : "desc");
    }
  };

  const openRow = (row: AgentRow) => {
    setSelected(row);
    setDrawerOpen(true);
  };

  return (
    <SubPageShell title="Agents Cockpit" subtitle="Sovereign control plane · L4">
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by slug, name, team…"
              className="pl-8 h-9 text-sm"
              data-testid="agents-search"
            />
          </div>
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value)}
            className="h-9 px-3 rounded-xl bg-muted border border-border/40 text-xs text-foreground"
            data-testid="agents-filter-kind"
          >
            <option value="">All kinds</option>
            {KNOWN_AGENT_KINDS.map((k) => (
              <option key={k} value={k}>
                {AGENT_KIND_META[k]?.label ?? k}
              </option>
            ))}
          </select>
          <select
            value={status}
            onChange={(e) =>
              setStatus(e.target.value as AgentLifecycleStatus | "")
            }
            className="h-9 px-3 rounded-xl bg-muted border border-border/40 text-xs text-foreground"
            data-testid="agents-filter-status"
          >
            <option value="">All statuses</option>
            <option value="active">active</option>
            <option value="canary">canary</option>
            <option value="disabled">disabled</option>
            <option value="deprecated">deprecated</option>
          </select>
          <select
            value={health}
            onChange={(e) =>
              setHealth(e.target.value as AgentHealthStatus | "")
            }
            className="h-9 px-3 rounded-xl bg-muted border border-border/40 text-xs text-foreground"
            data-testid="agents-filter-health"
          >
            <option value="">All health</option>
            <option value="healthy">healthy</option>
            <option value="degraded">degraded</option>
            <option value="stale">stale</option>
            <option value="down">down</option>
            <option value="unknown">unknown</option>
          </select>
          {teamOptions.length > 0 && (
            <select
              value={team}
              onChange={(e) => setTeam(e.target.value)}
              className="h-9 px-3 rounded-xl bg-muted border border-border/40 text-xs text-foreground"
              data-testid="agents-filter-team"
            >
              <option value="">All teams</option>
              {teamOptions.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          )}
          <div className="ml-auto flex items-center gap-2">
            <span className="text-[0.625rem] uppercase tracking-wide text-muted-foreground tabular-nums">
              {rows.length} / {listQuery.data?.length ?? 0}
            </span>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => listQuery.refetch()}
              disabled={listQuery.isFetching}
              data-testid="agents-refresh"
            >
              {listQuery.isFetching ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <RefreshCcw className="w-3.5 h-3.5" />
              )}
            </Button>
          </div>
        </div>

        {listQuery.error && (
          <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive flex items-start gap-2">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <span>{(listQuery.error as Error).message}</span>
          </div>
        )}

        <div className="rounded-2xl border border-border/40 bg-card overflow-hidden">
          {listQuery.isLoading ? (
            <div className="py-12 flex items-center justify-center">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : rows.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground flex flex-col items-center gap-2">
              <ServerCog className="w-6 h-6 opacity-50" />
              {(listQuery.data?.length ?? 0) === 0
                ? "No agents registered yet."
                : "No agents match the current filters."}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-[0.625rem] uppercase tracking-wide">
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 hover:text-foreground"
                      onClick={() => toggleSort("name")}
                      data-testid="agents-sort-name"
                      aria-label={`Sort by name (${
                        sortBy === "name" ? sortDir : "asc"
                      })`}
                    >
                      Agent
                      {sortBy === "name" && (
                        <span aria-hidden>
                          {sortDir === "asc" ? "↑" : "↓"}
                        </span>
                      )}
                    </button>
                  </TableHead>
                  <TableHead className="text-[0.625rem] uppercase tracking-wide">
                    Type
                  </TableHead>
                  <TableHead className="text-[0.625rem] uppercase tracking-wide">
                    Status
                  </TableHead>
                  <TableHead className="text-[0.625rem] uppercase tracking-wide">
                    Health
                  </TableHead>
                  <TableHead className="text-[0.625rem] uppercase tracking-wide">
                    Owner
                  </TableHead>
                  <TableHead className="text-[0.625rem] uppercase tracking-wide text-right">
                    In-flight
                  </TableHead>
                  <TableHead className="text-[0.625rem] uppercase tracking-wide">
                    Domains
                  </TableHead>
                  <TableHead className="text-[0.625rem] uppercase tracking-wide">
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 hover:text-foreground"
                      onClick={() => toggleSort("lastRun")}
                      data-testid="agents-sort-last-run"
                      aria-label={`Sort by last run (${
                        sortBy === "lastRun" ? sortDir : "desc"
                      })`}
                    >
                      Last run
                      {sortBy === "lastRun" && (
                        <span aria-hidden>
                          {sortDir === "asc" ? "↑" : "↓"}
                        </span>
                      )}
                    </button>
                  </TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => {
                  const meta = getKindMeta(r.agent_kind);
                  const KindIcon = meta.Icon;
                  const domains = Array.from(
                    new Set((r.capabilities ?? []).map((c) => c.domain)),
                  );
                  return (
                    <TableRow
                      key={r.id}
                      className="cursor-pointer hover:bg-muted/40"
                      onClick={() => openRow(r)}
                      data-testid={`agent-row-${r.slug}`}
                    >
                      <TableCell className="py-2">
                        <div className="flex items-center gap-2">
                          <KindIcon className="w-4 h-4 text-primary shrink-0" />
                          <div className="min-w-0">
                            <div className="text-sm font-medium text-foreground truncate">
                              {r.display_name}
                            </div>
                            <div className="font-mono text-[0.625rem] text-muted-foreground truncate">
                              {r.slug}
                              {r.current_version
                                ? ` · v${r.current_version}`
                                : ""}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="py-2">
                        <Badge variant={meta.tone} className="text-[0.625rem]">
                          {meta.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-2">
                        <StatusBadge row={r} />
                      </TableCell>
                      <TableCell className="py-2">
                        <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                          <HealthDot status={r.health?.health_status} />
                          {r.health?.health_status ?? "—"}
                        </span>
                      </TableCell>
                      <TableCell
                        className="py-2 text-xs text-muted-foreground"
                        data-testid={`agent-row-${r.slug}-owner`}
                      >
                        {r.owner_team ?? "—"}
                      </TableCell>
                      <TableCell
                        className="py-2 text-xs text-right tabular-nums"
                        data-testid={`agent-row-${r.slug}-inflight`}
                      >
                        {r.health?.in_flight ?? 0}
                      </TableCell>
                      <TableCell className="py-2">
                        <div className="flex flex-wrap gap-1 max-w-[180px]">
                          {domains.length === 0 ? (
                            <span className="text-[0.625rem] text-muted-foreground">
                              —
                            </span>
                          ) : (
                            domains.slice(0, 3).map((d) => (
                              <span
                                key={d}
                                className="text-[0.5625rem] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-mono"
                              >
                                {d}
                              </span>
                            ))
                          )}
                          {domains.length > 3 && (
                            <span className="text-[0.5625rem] text-muted-foreground">
                              +{domains.length - 3}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="py-2 text-xs text-muted-foreground tabular-nums">
                        {relTime(r.last_run_at)}
                      </TableCell>
                      <TableCell
                        className="py-2 text-right"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <AgentActionsMenu agent={r} />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>
      </div>

      <AgentDetailDrawer
        agent={selected}
        open={drawerOpen}
        onOpenChange={(open) => {
          setDrawerOpen(open);
          if (!open) setSelected(null);
        }}
      />
    </SubPageShell>
  );
}
