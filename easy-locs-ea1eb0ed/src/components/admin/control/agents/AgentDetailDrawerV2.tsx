/**
 * AgentDetailDrawerV2 — cockpit drawer for /admin/control/agents (#865).
 *
 * Five tabs:
 *   • Overview      — identity, owner, version, lifecycle metadata.
 *   • Runs          — last 50 execution_tasks (lazy).
 *   • Logs live     — realtime tail of engine_run_logs for this agent.
 *   • Config        — quotas, SLA, policy, rate limits.
 *   • Dépendances   — registered capabilities + declared deps.
 *
 * Each tab fetches only when activated (React-Query `enabled` gate).
 * Reuses the existing `agentsRepo` surface — no new RPCs introduced.
 */
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Send, AlertTriangle, Network } from "lucide-react";
import { agentsRepo, type AgentRow } from "@/lib/admin/agents-repo";
import { getKindMeta } from "@/components/admin/agents/agent-kind";
import AgentActionsMenu from "@/components/admin/agents/AgentActionsMenu";
import AgentTriggerDialog from "@/components/admin/agents/AgentTriggerDialog";
import AgentLiveLogs from "./AgentLiveLogs";

interface Props {
  agent: AgentRow | null;
  open: boolean;
  initialTab?: TabKey;
  onOpenChange: (open: boolean) => void;
}

type TabKey = "overview" | "runs" | "logs" | "config" | "deps";

function relTime(iso: string | null): string {
  if (!iso) return "never";
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 60_000) return `${Math.round(ms / 1000)}s ago`;
  if (ms < 3_600_000) return `${Math.round(ms / 60_000)}m ago`;
  if (ms < 86_400_000) return `${Math.round(ms / 3_600_000)}h ago`;
  return `${Math.round(ms / 86_400_000)}d ago`;
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

export default function AgentDetailDrawerV2({
  agent,
  open,
  initialTab = "overview",
  onOpenChange,
}: Props) {
  const [tab, setTab] = useState<TabKey>(initialTab);
  const [triggerOpen, setTriggerOpen] = useState(false);

  // Re-sync the active tab whenever the caller opens a different agent
  // or explicitly requests a different starting tab. Keying on agent.id
  // ensures opening the same agent twice with the same target tab is a
  // no-op (won't yank the user out of a tab they navigated to).
  useEffect(() => {
    if (open && agent) setTab(initialTab);
  }, [open, agent?.id, initialTab]);

  const runsQuery = useQuery({
    queryKey: ["admin-agents", "runs", agent?.id],
    queryFn: () => agentsRepo.listAgentRuns(agent!.id, 50),
    enabled: open && !!agent && tab === "runs",
  });

  if (!agent) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-full sm:max-w-2xl">
          <SheetHeader>
            <SheetTitle>Agent</SheetTitle>
          </SheetHeader>
          <div className="py-12 text-center text-sm text-muted-foreground">
            No agent selected.
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  const meta = getKindMeta(agent.agent_kind);
  const KindIcon = meta.Icon;
  const declaredDeps = extractDependencies(agent);

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-2xl overflow-y-auto"
          data-testid="agent-detail-drawer-v2"
        >
          <SheetHeader>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <SheetTitle className="flex items-center gap-2">
                  <KindIcon className="w-4 h-4 text-primary" />
                  {agent.display_name}
                </SheetTitle>
                <SheetDescription className="font-mono text-[0.625rem] mt-1">
                  {agent.slug}
                </SheetDescription>
              </div>
              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setTriggerOpen(true)}
                  className="gap-1.5"
                  data-testid="agent-trigger-button"
                >
                  <Send className="w-3.5 h-3.5" />
                  Trigger
                </Button>
                <AgentActionsMenu agent={agent} />
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 pt-2 text-xs">
              <Badge variant={meta.tone}>{meta.label}</Badge>
              <Badge
                variant={
                  agent.status === "active"
                    ? "default"
                    : agent.status === "disabled" || agent.status === "deprecated"
                      ? "destructive"
                      : "secondary"
                }
              >
                {agent.status}
                {agent.status === "canary" && agent.canary_pct != null
                  ? ` ${agent.canary_pct}%`
                  : ""}
              </Badge>
              <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                <HealthDot status={agent.health?.health_status} />
                {agent.health?.health_status ?? "no heartbeat"}
              </span>
              {agent.current_version && (
                <span className="text-muted-foreground font-mono">
                  v{agent.current_version}
                </span>
              )}
            </div>
          </SheetHeader>

          <Tabs
            value={tab}
            onValueChange={(v) => setTab(v as TabKey)}
            className="mt-4"
          >
            <TabsList className="grid grid-cols-5 w-full">
              <TabsTrigger value="overview" data-testid="agent-tab-overview">
                Overview
              </TabsTrigger>
              <TabsTrigger value="runs" data-testid="agent-tab-runs">
                Runs
              </TabsTrigger>
              <TabsTrigger value="logs" data-testid="agent-tab-logs">
                Logs live
              </TabsTrigger>
              <TabsTrigger value="config" data-testid="agent-tab-config">
                Config
              </TabsTrigger>
              <TabsTrigger value="deps" data-testid="agent-tab-deps">
                Dépendances
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="mt-3 space-y-1.5 text-xs">
              <Field label="Owner team" value={agent.owner_team ?? "—"} />
              <Field
                label="Policy profile"
                value={agent.policy_profile_slug ?? "—"}
              />
              <Field
                label="Approval required"
                value={agent.approval_required ? "yes" : "no"}
              />
              <Field label="Risk floor" value={agent.risk_floor ?? "—"} />
              <Field
                label="Last execution"
                value={relTime(agent.last_run_at)}
              />
              <Field
                label="Health checked"
                value={relTime(agent.health?.last_seen_at ?? null)}
              />
              {agent.health?.in_flight != null && (
                <Field
                  label="In flight"
                  value={`${agent.health.in_flight} (queue ${agent.health.queue_depth ?? 0})`}
                />
              )}
              {agent.health?.health_reason && (
                <div className="rounded-lg border border-warning/40 bg-warning/10 p-2 text-[0.6875rem] text-foreground flex items-start gap-2">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-warning" />
                  {agent.health.health_reason}
                </div>
              )}
            </TabsContent>

            <TabsContent value="runs" className="mt-3">
              {runsQuery.isLoading ? (
                <Spinner />
              ) : runsQuery.error ? (
                <ErrorBox msg={(runsQuery.error as Error).message} />
              ) : (runsQuery.data ?? []).length === 0 ? (
                <Empty msg="No runs recorded for this agent yet." />
              ) : (
                <ul className="space-y-1.5" data-testid="agent-runs-list">
                  {(runsQuery.data ?? []).map((r) => (
                    <li
                      key={r.id}
                      className="text-xs px-2 py-1.5 bg-muted/40 border border-border/40 rounded flex items-center gap-2"
                    >
                      <Badge
                        variant={
                          r.status === "succeeded"
                            ? "default"
                            : r.status === "failed" ||
                                r.status === "blocked" ||
                                r.status === "rejected"
                              ? "destructive"
                              : "secondary"
                        }
                        className="text-[0.5625rem]"
                      >
                        {r.status}
                      </Badge>
                      <span className="font-mono truncate flex-1" title={r.type}>
                        {r.type}
                      </span>
                      <span className="text-muted-foreground tabular-nums">
                        {relTime(r.created_at)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </TabsContent>

            <TabsContent value="logs" className="mt-3">
              {tab === "logs" && <AgentLiveLogs agentId={agent.id} />}
            </TabsContent>

            <TabsContent value="config" className="mt-3 space-y-1.5 text-xs">
              <Field
                label="Max runs/min"
                value={agent.max_runs_per_min != null ? String(agent.max_runs_per_min) : "—"}
              />
              <Field
                label="Max runs/day"
                value={agent.max_runs_per_day != null ? String(agent.max_runs_per_day) : "—"}
              />
              <Field
                label="SLA target"
                value={agent.sla_target_ms != null ? `${agent.sla_target_ms}ms` : "—"}
              />
              <Field
                label="Canary %"
                value={agent.canary_pct != null ? `${agent.canary_pct}%` : "—"}
              />
              <div className="pt-2">
                <p className="text-[0.625rem] uppercase tracking-wide text-muted-foreground mb-1">
                  Quotas
                </p>
                <pre
                  className="text-[0.625rem] font-mono bg-muted/40 border border-border/40 rounded p-2 max-h-40 overflow-auto"
                  data-testid="agent-config-quotas"
                >
                  {JSON.stringify(agent.quotas ?? {}, null, 2)}
                </pre>
              </div>
              <div className="pt-2">
                <p className="text-[0.625rem] uppercase tracking-wide text-muted-foreground mb-1">
                  Metadata
                </p>
                <pre
                  className="text-[0.625rem] font-mono bg-muted/40 border border-border/40 rounded p-2 max-h-40 overflow-auto"
                  data-testid="agent-config-metadata"
                >
                  {JSON.stringify(agent.metadata ?? {}, null, 2)}
                </pre>
              </div>
            </TabsContent>

            <TabsContent value="deps" className="mt-3 space-y-3">
              <div>
                <p className="text-[0.625rem] uppercase tracking-wide text-muted-foreground mb-1.5">
                  Capabilities ({agent.capabilities?.length ?? 0})
                </p>
                {!agent.capabilities || agent.capabilities.length === 0 ? (
                  <Empty msg="No capabilities registered." />
                ) : (
                  <ul className="space-y-1" data-testid="agent-deps-capabilities">
                    {agent.capabilities.map((c) => (
                      <li
                        key={`${c.domain}:${c.task_type}`}
                        className="text-xs px-2 py-1.5 bg-muted/40 border border-border/40 rounded font-mono flex items-center gap-2"
                      >
                        <Network className="w-3 h-3 text-muted-foreground" />
                        <span className="text-muted-foreground">{c.domain}</span>
                        <span className="text-muted-foreground/60">·</span>
                        <span className="text-foreground">{c.task_type}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div>
                <p className="text-[0.625rem] uppercase tracking-wide text-muted-foreground mb-1.5">
                  Declared dependencies ({declaredDeps.length})
                </p>
                {declaredDeps.length === 0 ? (
                  <Empty msg="No upstream dependencies declared in metadata." />
                ) : (
                  <ul className="flex flex-wrap gap-1.5" data-testid="agent-deps-declared">
                    {declaredDeps.map((d) => (
                      <li
                        key={d}
                        className="text-[0.6875rem] font-mono px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/30"
                      >
                        {d}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </SheetContent>
      </Sheet>

      <AgentTriggerDialog
        agent={agent}
        open={triggerOpen}
        onOpenChange={setTriggerOpen}
      />
    </>
  );
}

function extractDependencies(agent: AgentRow): string[] {
  const md = (agent.metadata ?? {}) as Record<string, unknown>;
  const raw = md.dependencies ?? md.deps ?? md.upstream_agents;
  if (Array.isArray(raw)) {
    return raw
      .map((v) => (typeof v === "string" ? v : null))
      .filter((v): v is string => !!v);
  }
  return [];
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 px-2 py-1.5 bg-muted/30 rounded">
      <span className="text-[0.625rem] uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <span className="text-foreground tabular-nums">{value}</span>
    </div>
  );
}

function Spinner() {
  return (
    <div className="flex items-center justify-center py-6">
      <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
    </div>
  );
}

function Empty({ msg }: { msg: string }) {
  return (
    <p className="text-xs italic text-muted-foreground py-4 text-center">
      {msg}
    </p>
  );
}

function ErrorBox({ msg }: { msg: string }) {
  return (
    <div className="text-xs text-destructive bg-destructive/10 border border-destructive/30 rounded-lg px-3 py-2">
      {msg}
    </div>
  );
}
