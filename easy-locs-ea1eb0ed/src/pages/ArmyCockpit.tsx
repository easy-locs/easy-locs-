/**
 * Dashboard · Army Cockpit
 *
 * Task #998 — Real-time command of the agent army.
 * Reads from the `army` schema (system_flags, command_orders, execution_tasks,
 * agent_instances, incident_log, v_general_state, v_army_dashboard) and calls
 * the orchestrator-dispatch / approve_task / reject_task / retry_task /
 * kill_agent / kill_army RPCs.
 */
import { useState, useCallback, useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Loader2, RefreshCw, ShieldAlert, Skull, Activity, AlertTriangle,
  CheckCircle2, XCircle, Clock, Users, Layers, Euro, Coins, Send, Flame,
} from "lucide-react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { AppCard, CardContent, CardHeader, CardTitle } from "@/components/ui/AppCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { db } from "@/services/db";
import { useAuth } from "@/contexts/AuthContext";

interface DashSnap {
  cost_eur_24h: number;
  cost_tokens_24h: number;
  active_agents: number;
  open_orders: number;
  pending_approvals: number;
  open_incidents: number;
  kill_switch_active: boolean;
}

interface GeneralState {
  role_code: string;
  name: string;
  domain: string;
  queue_depth: number;
  active_agents: number;
  open_incidents: number;
  health: "online" | "degraded" | "offline";
}

interface ArmyOrder {
  id: string;
  title: string;
  domain: string | null;
  risk: "low" | "normal" | "high" | "critical";
  status: string;
  issued_at: string;
}

interface ArmyTask {
  id: string;
  order_id: string;
  domain: string;
  type: string;
  risk: string;
  status: string;
  assigned_role: string | null;
  assigned_agent: string | null;
  attempts: number;
  cost_eur: number;
  cost_tokens: number;
  error: string | null;
  updated_at: string;
}

interface ArmyAgent {
  id: string;
  role_code: string;
  domain: string | null;
  status: string;
  ttl_at: string;
  spawned_at: string;
}

interface Incident {
  id: string;
  severity: string;
  kind: string;
  message: string;
  created_at: string;
  resolved_at: string | null;
}

const DOMAINS = ["product", "growth", "ops", "finance", "security", "data"] as const;
const FN_BASE = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;

function fmtAgo(iso: string): string {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  return h < 24 ? `${h}h` : `${Math.floor(h / 24)}d`;
}

function fmtTtl(iso: string): string {
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return "expired";
  const m = Math.floor(ms / 60000);
  return m < 60 ? `${m}m left` : `${Math.floor(m / 60)}h${m % 60}m left`;
}

function healthColor(h: string): string {
  return h === "online" ? "text-green-500"
    : h === "degraded" ? "text-yellow-500" : "text-red-500";
}

function statusBadge(s: string): "default" | "secondary" | "destructive" | "outline" {
  if (["completed", "approved"].includes(s)) return "default";
  if (["running", "planning", "dispatching"].includes(s)) return "secondary";
  if (["failed", "rejected", "cancelled"].includes(s)) return "destructive";
  return "outline";
}

async function callEdge(name: string, body: unknown): Promise<unknown> {
  const { data: { session } } = await db.auth.getSession();
  const res = await fetch(`${FN_BASE}/${name}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session?.access_token ?? ""}`,
      apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `${name} failed`);
  }
  return res.json();
}

export default function ArmyCockpit() {
  const qc = useQueryClient();
  const { user } = useAuth();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [domain, setDomain] = useState<string>("product");
  const [risk, setRisk] = useState<"low" | "normal" | "high" | "critical">("normal");
  const [submitting, setSubmitting] = useState(false);
  const [killing, setKilling] = useState(false);

  const army = db.schema("army" as never);
  const cmd = db.schema("command" as never) as unknown as {
    rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: { ok: boolean; error?: string } | null; error: { message: string } | null }>;
  };

  const { data: snap } = useQuery<DashSnap>({
    queryKey: ["army-dashboard"],
    queryFn: async () => {
      const { data, error } = await army.from("v_army_dashboard").select("*").maybeSingle();
      if (error) throw error;
      return (data ?? {
        cost_eur_24h: 0, cost_tokens_24h: 0, active_agents: 0,
        open_orders: 0, pending_approvals: 0, open_incidents: 0,
        kill_switch_active: false,
      }) as DashSnap;
    },
    refetchInterval: 4000,
  });

  const { data: generals = [] } = useQuery<GeneralState[]>({
    queryKey: ["army-generals"],
    queryFn: async () => {
      const { data, error } = await army.from("v_general_state").select("*");
      if (error) throw error;
      return (data ?? []) as GeneralState[];
    },
    refetchInterval: 5000,
  });

  const { data: orders = [] } = useQuery<ArmyOrder[]>({
    queryKey: ["army-orders"],
    queryFn: async () => {
      const { data, error } = await army.from("command_orders")
        .select("id, title, domain, risk, status, issued_at")
        .order("issued_at", { ascending: false }).limit(20);
      if (error) throw error;
      return (data ?? []) as ArmyOrder[];
    },
    refetchInterval: 4000,
  });

  const { data: tasks = [] } = useQuery<ArmyTask[]>({
    queryKey: ["army-tasks"],
    queryFn: async () => {
      const { data, error } = await army.from("execution_tasks")
        .select("id, order_id, domain, type, risk, status, assigned_role, assigned_agent, attempts, cost_eur, cost_tokens, error, updated_at")
        .order("updated_at", { ascending: false }).limit(60);
      if (error) throw error;
      return (data ?? []) as ArmyTask[];
    },
    refetchInterval: 3000,
  });

  const { data: agents = [] } = useQuery<ArmyAgent[]>({
    queryKey: ["army-agents"],
    queryFn: async () => {
      const { data, error } = await army.from("agent_instances")
        .select("id, role_code, domain, status, ttl_at, spawned_at")
        .in("status", ["spawning", "active", "idle"])
        .order("spawned_at", { ascending: false }).limit(40);
      if (error) throw error;
      return (data ?? []) as ArmyAgent[];
    },
    refetchInterval: 5000,
  });

  const { data: incidents = [] } = useQuery<Incident[]>({
    queryKey: ["army-incidents"],
    queryFn: async () => {
      const { data, error } = await army.from("incident_log")
        .select("id, severity, kind, message, created_at, resolved_at")
        .is("resolved_at", null)
        .order("created_at", { ascending: false }).limit(20);
      if (error) throw error;
      return (data ?? []) as Incident[];
    },
    refetchInterval: 5000,
  });

  // Realtime subscription — invalidate queries on writes.
  useEffect(() => {
    const ch = db.channel("army-cockpit")
      .on("postgres_changes", { event: "*", schema: "army", table: "command_orders" },
          () => qc.invalidateQueries({ queryKey: ["army-orders"] }))
      .on("postgres_changes", { event: "*", schema: "army", table: "execution_tasks" },
          () => qc.invalidateQueries({ queryKey: ["army-tasks"] }))
      .on("postgres_changes", { event: "*", schema: "army", table: "agent_instances" },
          () => qc.invalidateQueries({ queryKey: ["army-agents"] }))
      .on("postgres_changes", { event: "*", schema: "army", table: "incident_log" },
          () => qc.invalidateQueries({ queryKey: ["army-incidents"] }))
      .on("postgres_changes", { event: "*", schema: "army", table: "system_flags" },
          () => qc.invalidateQueries({ queryKey: ["army-dashboard"] }))
      .subscribe();
    return () => { db.removeChannel(ch); };
  }, [qc]);

  const tasksByOrder = useMemo(() => {
    const m = new Map<string, ArmyTask[]>();
    for (const t of tasks) {
      if (!m.has(t.order_id)) m.set(t.order_id, []);
      m.get(t.order_id)!.push(t);
    }
    return m;
  }, [tasks]);

  const issueOrder = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setSubmitting(true);
    try {
      const { data, error } = await army.from("command_orders").insert({
        title: title.trim(),
        description: description.trim() || null,
        domain, risk,
        issued_by: user?.id ?? null,
      }).select().single();
      if (error) throw error;
      toast.success(`Order ${data.id.slice(0, 8)} issued`);
      // Fire-and-forget orchestrator dispatch
      callEdge("orchestrator-dispatch", { order_id: data.id }).catch((err) => {
        toast.error(`dispatch failed: ${err.message}`);
      });
      setTitle(""); setDescription("");
      qc.invalidateQueries({ queryKey: ["army-orders"] });
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }, [title, description, domain, risk, user?.id, army, qc]);

  const approve = useCallback(async (taskId: string) => {
    const { data, error } = await cmd.rpc("execute_command", {
      p_command_type: "approve_task",
      p_input: { task_id: taskId },
    });
    if (error || data?.ok === false) toast.error(error?.message ?? data?.error ?? "approve failed");
    else toast.success("approved");
    qc.invalidateQueries({ queryKey: ["army-tasks"] });
  }, [cmd, qc]);

  const reject = useCallback(async (taskId: string) => {
    const reason = window.prompt("Rejection reason?") ?? "no_reason";
    const { data, error } = await cmd.rpc("execute_command", {
      p_command_type: "reject_task",
      p_input: { task_id: taskId, reason },
    });
    if (error || data?.ok === false) toast.error(error?.message ?? data?.error ?? "reject failed");
    else toast.success("rejected");
    qc.invalidateQueries({ queryKey: ["army-tasks"] });
  }, [cmd, qc]);

  const retry = useCallback(async (taskId: string) => {
    const { data, error } = await cmd.rpc("execute_command", {
      p_command_type: "retry_task",
      p_input: { task_id: taskId },
    });
    if (error || data?.ok === false) toast.error(error?.message ?? data?.error ?? "retry failed");
    else toast.success("retrying");
    qc.invalidateQueries({ queryKey: ["army-tasks"] });
  }, [cmd, qc]);

  const killAgent = useCallback(async (agentId: string) => {
    if (!window.confirm("Kill this agent?")) return;
    const { data, error } = await cmd.rpc("execute_command", {
      p_command_type: "kill_agent",
      p_input: { agent_id: agentId, reason: "manual" },
    });
    if (error || data?.ok === false) toast.error(error?.message ?? data?.error ?? "kill agent failed");
    else toast.success("agent killed");
    qc.invalidateQueries({ queryKey: ["army-agents"] });
  }, [cmd, qc]);

  const killArmy = useCallback(async () => {
    if (!window.confirm("KILL ARMY: stop ALL agents, drain queues, cancel tasks. Continue?")) return;
    if (!window.confirm("Final confirmation — type-equivalent. Proceed?")) return;
    setKilling(true);
    try {
      const reason = window.prompt("Kill reason (logged):") ?? "manual";
      const { data, error } = await cmd.rpc("execute_command", {
        p_command_type: "kill_army",
        p_input: { reason },
      });
      if (error) throw new Error(error.message);
      if (data?.ok === false) throw new Error(data.error ?? "kill army failed");
      toast.error("Army killed.");
      qc.invalidateQueries();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setKilling(false);
    }
  }, [cmd, qc]);

  const reviveArmy = useCallback(async () => {
    const { data, error } = await cmd.rpc("execute_command", {
      p_command_type: "revive_army",
      p_input: {},
    });
    if (error || data?.ok === false) toast.error(error?.message ?? data?.error ?? "revive failed");
    else toast.success("Army revived");
    qc.invalidateQueries();
  }, [cmd, qc]);

  return (
    <DashboardLayout>
      <div className="px-4 pt-6 pb-10 max-w-7xl mx-auto space-y-6">
        {/* Header + KILL switch */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <ShieldAlert className="w-6 h-6 text-primary" /> Army Cockpit
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Supreme Commander console — issue orders, monitor the chain of command,
              approve critical actions, kill the army instantly.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => qc.invalidateQueries()}>
              <RefreshCw className="w-4 h-4" />
            </Button>
            {snap?.kill_switch_active ? (
              <Button variant="outline" onClick={reviveArmy} className="gap-2">
                <Activity className="w-4 h-4" /> Revive Army
              </Button>
            ) : (
              <Button variant="destructive" onClick={killArmy} disabled={killing} className="gap-2">
                {killing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Skull className="w-4 h-4" />}
                KILL ARMY
              </Button>
            )}
          </div>
        </div>

        {snap?.kill_switch_active && (
          <div className="rounded-md border border-destructive bg-destructive/10 p-3 text-sm text-destructive flex items-center gap-2">
            <Flame className="w-4 h-4" />
            Army kill switch is ACTIVE. All execution is blocked until revived.
          </div>
        )}

        {/* Top-line KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          <KPI icon={<Layers className="w-4 h-4" />} label="Open orders" value={snap?.open_orders ?? 0} />
          <KPI icon={<Users className="w-4 h-4" />} label="Active agents" value={snap?.active_agents ?? 0} />
          <KPI icon={<Clock className="w-4 h-4" />} label="Awaiting approval" value={snap?.pending_approvals ?? 0} accent={snap?.pending_approvals ? "warn" : undefined} />
          <KPI icon={<AlertTriangle className="w-4 h-4" />} label="Open incidents" value={snap?.open_incidents ?? 0} accent={snap?.open_incidents ? "danger" : undefined} />
          <KPI icon={<Euro className="w-4 h-4" />} label="Cost 24h (€)" value={(snap?.cost_eur_24h ?? 0).toFixed(2)} />
          <KPI icon={<Coins className="w-4 h-4" />} label="Tokens 24h" value={snap?.cost_tokens_24h ?? 0} />
        </div>

        {/* Generals */}
        <AppCard>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="w-4 h-4 text-primary" /> Generals
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {generals.map((g) => (
                <div key={g.role_code} className="rounded-md border border-border/60 p-3 bg-muted/20">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium">{g.name}</span>
                    <span className={`text-xs font-mono ${healthColor(g.health)}`}>● {g.health}</span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1.5 flex gap-3">
                    <span>queue {g.queue_depth}</span>
                    <span>agents {g.active_agents}</span>
                    <span>incidents {g.open_incidents}</span>
                  </div>
                </div>
              ))}
              {generals.length === 0 && (
                <div className="text-xs text-muted-foreground col-span-3 py-4 text-center">
                  No generals registered yet — run the migration.
                </div>
              )}
            </div>
          </CardContent>
        </AppCard>

        {/* Issue order */}
        <AppCard>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Send className="w-4 h-4 text-primary" /> Issue Command Order
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={issueOrder} className="space-y-3">
              <Input
                placeholder='e.g. "audit security headers across marketplace"'
                value={title} onChange={(e) => setTitle(e.target.value)}
                maxLength={200} disabled={submitting}
              />
              <Textarea
                placeholder="Optional context, success criteria, constraints…"
                value={description} onChange={(e) => setDescription(e.target.value)}
                rows={2} maxLength={4000} disabled={submitting}
              />
              <div className="flex items-center gap-2 flex-wrap">
                <Select value={domain} onValueChange={setDomain}>
                  <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DOMAINS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={risk} onValueChange={(v) => setRisk(v as typeof risk)}>
                  <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(["low", "normal", "high", "critical"] as const).map((r) =>
                      <SelectItem key={r} value={r}>risk: {r}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Button type="submit" disabled={submitting || !title.trim()} className="gap-2">
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  Dispatch
                </Button>
                {risk === "critical" && (
                  <span className="text-[11px] text-yellow-500">
                    Critical orders pause for Supreme approval before execution.
                  </span>
                )}
              </div>
            </form>
          </CardContent>
        </AppCard>

        {/* Orders + tasks */}
        <AppCard>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Layers className="w-4 h-4 text-primary" /> Orders & Tasks
            </CardTitle>
          </CardHeader>
          <CardContent>
            {orders.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No orders yet.</p>
            ) : (
              <div className="divide-y divide-border">
                {orders.map((o) => {
                  const ts = tasksByOrder.get(o.id) ?? [];
                  return (
                    <div key={o.id} className="py-3 space-y-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-[10px] text-muted-foreground">{o.id.slice(0, 8)}</span>
                        <span className="text-sm font-medium">{o.title}</span>
                        <Badge variant={statusBadge(o.status)} className="text-[10px] h-5 px-1.5">{o.status}</Badge>
                        {o.domain && <Badge variant="outline" className="text-[10px] h-5 px-1.5">{o.domain}</Badge>}
                        <Badge variant={o.risk === "critical" ? "destructive" : "outline"} className="text-[10px] h-5 px-1.5">
                          risk:{o.risk}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground">{fmtAgo(o.issued_at)}</span>
                      </div>
                      {ts.length > 0 && (
                        <div className="ml-3 pl-3 border-l border-border/60 space-y-1">
                          {ts.map((t) => (
                            <div key={t.id} className="flex items-center gap-2 flex-wrap text-xs">
                              <StatusIcon status={t.status} />
                              <span className="font-mono text-[10px] text-muted-foreground">{t.id.slice(0, 8)}</span>
                              <span className="text-foreground">{t.type}</span>
                              <span className="text-muted-foreground">→ {t.assigned_role ?? "—"}</span>
                              {t.attempts > 1 && <span className="text-yellow-500">×{t.attempts}</span>}
                              {t.cost_eur > 0 && <span className="text-muted-foreground">€{t.cost_eur}</span>}
                              {t.error && <span className="text-destructive truncate max-w-[200px]" title={t.error}>{t.error}</span>}
                              <div className="ml-auto flex gap-1">
                                {t.status === "awaiting_approval" && (
                                  <>
                                    <Button size="sm" variant="default" className="h-6 px-2 text-[10px]"
                                            onClick={() => approve(t.id)}>Approve</Button>
                                    <Button size="sm" variant="destructive" className="h-6 px-2 text-[10px]"
                                            onClick={() => reject(t.id)}>Reject</Button>
                                  </>
                                )}
                                {(t.status === "failed" || t.status === "cancelled") && (
                                  <Button size="sm" variant="outline" className="h-6 px-2 text-[10px]"
                                          onClick={() => retry(t.id)}>Retry</Button>
                                )}
                                {t.assigned_agent && t.status === "running" && (
                                  <Button size="sm" variant="ghost" className="h-6 px-2 text-[10px]"
                                          onClick={() => killAgent(t.assigned_agent!)}>Kill</Button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </AppCard>

        {/* Active agents */}
        <AppCard>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="w-4 h-4 text-primary" /> Active Agents ({agents.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {agents.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No live agents.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {agents.map((a) => (
                  <div key={a.id} className="flex items-center justify-between text-xs border border-border/50 rounded-md px-3 py-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-mono text-[10px] text-muted-foreground">{a.id.slice(0, 8)}</span>
                      <span className="font-medium truncate">{a.role_code}</span>
                      {a.domain && <Badge variant="outline" className="text-[10px] h-5 px-1.5">{a.domain}</Badge>}
                      <span className="text-muted-foreground">{a.status}</span>
                      <span className="text-muted-foreground/70">· {fmtTtl(a.ttl_at)}</span>
                    </div>
                    <Button size="sm" variant="ghost" className="h-6 px-2 text-[10px]"
                            onClick={() => killAgent(a.id)}>Kill</Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </AppCard>

        {/* Incidents */}
        <AppCard>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="w-4 h-4 text-primary" /> Open Incidents ({incidents.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {incidents.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">All clear.</p>
            ) : (
              <div className="divide-y divide-border">
                {incidents.map((i) => (
                  <div key={i.id} className="py-2 text-xs flex items-start gap-2">
                    <Badge variant={i.severity === "critical" ? "destructive"
                                  : i.severity === "error" ? "destructive"
                                  : i.severity === "warn" ? "secondary" : "outline"}
                           className="text-[10px] h-5 px-1.5">{i.severity}</Badge>
                    <span className="font-mono text-[10px] text-muted-foreground">{i.kind}</span>
                    <span className="flex-1">{i.message}</span>
                    <span className="text-muted-foreground/70">{fmtAgo(i.created_at)}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </AppCard>
      </div>
    </DashboardLayout>
  );
}

function KPI({ icon, label, value, accent }: {
  icon: React.ReactNode; label: string; value: string | number;
  accent?: "warn" | "danger";
}) {
  const c = accent === "danger" ? "border-destructive/40 bg-destructive/5"
          : accent === "warn"   ? "border-yellow-500/40 bg-yellow-500/5"
                                : "border-border/60 bg-muted/20";
  return (
    <div className={`rounded-md border ${c} p-3`}>
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground flex items-center gap-1">
        {icon} {label}
      </div>
      <div className="mt-1 text-xl font-semibold tabular-nums">{value}</div>
    </div>
  );
}

function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case "completed": return <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />;
    case "running":
    case "planning":
    case "dispatching": return <Loader2 className="w-3.5 h-3.5 text-blue-500 animate-spin" />;
    case "failed":
    case "rejected":
    case "cancelled": return <XCircle className="w-3.5 h-3.5 text-red-500" />;
    case "awaiting_approval": return <ShieldAlert className="w-3.5 h-3.5 text-yellow-500" />;
    default: return <Clock className="w-3.5 h-3.5 text-muted-foreground" />;
  }
}
