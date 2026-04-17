/**
 * AgentDetailDrawer — L4 cockpit (#813)
 *
 * Side sheet showing everything the operator needs about a single
 * registered agent without leaving the cockpit:
 *   • Overview     — identity, status, version, owner, policy
 *   • Capabilities — registered (domain, task_type) edges
 *   • Runs         — last 50 execution_tasks (lazy)
 *   • Health       — current heartbeat snapshot + lag
 *   • Events       — recent canonical events from engine_run_logs
 *
 * Layout is intentionally dense and scannable — the cockpit is for
 * day-to-day governance, not for marketing. No tab is loaded until the
 * user clicks it (React-Query `enabled` gate keyed on the active tab).
 */
import { useState } from "react";
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
import { agentsRepo, type AgentRow } from "@/lib/admin/agents-repo";
import { getKindMeta } from "./agent-kind";
import AgentActionsMenu from "./AgentActionsMenu";
import AgentTriggerDialog from "./AgentTriggerDialog";
import { ExecutionTaskPanel } from "@/components/admin/ExecutionTaskPanel";
import { Loader2, Send, Activity, AlertTriangle } from "lucide-react";

interface Props {
  agent: AgentRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

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

export default function AgentDetailDrawer({ agent, open, onOpenChange }: Props) {
  const [tab, setTab] = useState("overview");
  const [triggerOpen, setTriggerOpen] = useState(false);

  const runsQuery = useQuery({
    queryKey: ["admin-agents", "runs", agent?.id],
    queryFn: () => agentsRepo.listAgentRuns(agent!.id, 50),
    enabled: open && !!agent && tab === "runs",
  });
  const eventsQuery = useQuery({
    queryKey: ["admin-agents", "events", agent?.id],
    queryFn: () => agentsRepo.listAgentEvents(agent!.id, 50),
    enabled: open && !!agent && tab === "events",
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

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-2xl overflow-y-auto"
          data-testid="agent-detail-drawer"
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

          <Tabs value={tab} onValueChange={setTab} className="mt-4">
            <TabsList className="grid grid-cols-5 w-full">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="capabilities">Capabilities</TabsTrigger>
              <TabsTrigger value="runs">Runs</TabsTrigger>
              <TabsTrigger value="health">Health</TabsTrigger>
              <TabsTrigger value="events">Events</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="mt-3 space-y-3 text-xs">
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
                label="Max runs/min"
                value={
                  agent.max_runs_per_min != null
                    ? String(agent.max_runs_per_min)
                    : "—"
                }
              />
              <Field
                label="Max runs/day"
                value={
                  agent.max_runs_per_day != null
                    ? String(agent.max_runs_per_day)
                    : "—"
                }
              />
              <Field
                label="SLA target"
                value={
                  agent.sla_target_ms != null
                    ? `${agent.sla_target_ms}ms`
                    : "—"
                }
              />
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

            <TabsContent value="capabilities" className="mt-3">
              {!agent.capabilities || agent.capabilities.length === 0 ? (
                <Empty msg="No capabilities registered." />
              ) : (
                <ul className="space-y-1">
                  {agent.capabilities.map((c) => (
                    <li
                      key={`${c.domain}:${c.task_type}`}
                      className="text-xs px-2 py-1.5 bg-muted/40 border border-border/40 rounded font-mono"
                    >
                      <span className="text-muted-foreground">{c.domain}</span>
                      <span className="text-muted-foreground/60 mx-1.5">·</span>
                      <span className="text-foreground">{c.task_type}</span>
                    </li>
                  ))}
                </ul>
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
              <div className="mt-4 pt-3 border-t border-border/40">
                <p className="text-[0.625rem] uppercase tracking-wide text-muted-foreground mb-2">
                  Live execution tasks · platform-wide
                </p>
                <ExecutionTaskPanel />
              </div>
            </TabsContent>

            <TabsContent value="health" className="mt-3 space-y-2 text-xs">
              {!agent.health ? (
                <Empty msg="No heartbeat recorded for this agent yet." />
              ) : (
                <>
                  <Field
                    label="Status"
                    value={`${agent.health.health_status}${
                      agent.health.health_reason
                        ? ` · ${agent.health.health_reason}`
                        : ""
                    }`}
                  />
                  <Field
                    label="Last seen"
                    value={relTime(agent.health.last_seen_at)}
                  />
                  <Field
                    label="Lag"
                    value={
                      agent.health.lag_ms != null
                        ? `${agent.health.lag_ms}ms`
                        : "—"
                    }
                  />
                  <Field
                    label="In flight"
                    value={String(agent.health.in_flight ?? 0)}
                  />
                  <Field
                    label="Queue depth"
                    value={String(agent.health.queue_depth ?? 0)}
                  />
                  <Field
                    label="Workers"
                    value={String(agent.health.worker_count ?? 0)}
                  />
                </>
              )}
            </TabsContent>

            <TabsContent value="events" className="mt-3">
              {eventsQuery.isLoading ? (
                <Spinner />
              ) : eventsQuery.error ? (
                <ErrorBox msg={(eventsQuery.error as Error).message} />
              ) : (eventsQuery.data ?? []).length === 0 ? (
                <Empty msg="No canonical events recorded for this agent." />
              ) : (
                <ul className="space-y-1.5" data-testid="agent-events-list">
                  {(eventsQuery.data ?? []).map((e) => (
                    <li
                      key={e.id}
                      className="text-xs px-2 py-1.5 bg-muted/40 border border-border/40 rounded"
                    >
                      <div className="flex items-center gap-2">
                        <Activity className="w-3 h-3 text-muted-foreground" />
                        <span className="font-mono text-foreground">
                          {e.category}
                        </span>
                        <Badge
                          variant={
                            e.status === "ok" ? "secondary" : "destructive"
                          }
                          className="text-[0.5625rem] ml-auto"
                        >
                          {e.status}
                        </Badge>
                      </div>
                      {e.message && (
                        <p className="mt-0.5 text-muted-foreground break-words">
                          {e.message}
                        </p>
                      )}
                      <p className="text-[0.5625rem] text-muted-foreground mt-0.5 tabular-nums">
                        {relTime(e.created_at)}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
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
