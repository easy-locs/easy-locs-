/**
 * AdminAgentRunsPage — LB1 (#815) Conversation Explorer
 *
 * Generic per-agent runs explorer at /admin/agents/:slug/runs. Reads the
 * `system.v_ai_runs` view for AI agents (joins execution_tasks ↔
 * ai_interactions) and falls back to `system.execution_tasks` for any
 * other domain. Surfaces prompt/response, model, cost, latency, sensitive
 * holds and the release control.
 *
 * The page is read-only. Sensitive holds are now decided through the
 * canonical approvals inbox at `/admin/approvals` via the shared
 * `system.decide_task_approval` RPC (LB1 follow-up #834); this page
 * deep-links there instead of carrying its own release controls.
 */
import { useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Loader2, ArrowLeft, ShieldAlert, CheckCircle2, XCircle, Clock, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { agentsRepo, type AgentRunRichRow } from "@/lib/admin/agents-repo";
import DevRunDetail from "@/components/admin/DevRunDetail";
import ReplayDialog from "@/pages/admin/control/runs/ReplayDialog";

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

export default function AdminAgentRunsPage() {
  const { slug = "" } = useParams<{ slug: string }>();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [replayOpen, setReplayOpen] = useState(false);

  const agentQuery = useQuery({
    queryKey: ["admin-agent", slug],
    queryFn: async () => {
      const all = await agentsRepo.listAgents();
      return all.find((a) => a.slug === slug) ?? null;
    },
    enabled: !!slug,
  });

  const agent = agentQuery.data;
  const domain = useMemo(() => {
    if (!agent) return "ai";
    const cap = agent.capabilities?.[0];
    return cap?.domain ?? "ai";
  }, [agent]);

  const runsQuery = useQuery({
    queryKey: ["admin-agent-runs-rich", agent?.id, domain],
    queryFn: () => agentsRepo.listAgentRunsRich(agent!.id, domain, 100),
    enabled: !!agent,
    refetchInterval: 15_000,
  });

  const selected = runsQuery.data?.find((r) => r.task_id === selectedId) ?? null;

  if (agentQuery.isLoading) {
    return (
      <div className="p-8 flex items-center gap-2 text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin" /> Loading agent…
      </div>
    );
  }
  if (!agent) {
    return (
      <div className="p-8 space-y-3">
        <Link to="/admin/agents" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-4 h-4" /> Back to agents
        </Link>
        <p className="text-destructive">Agent not found: {slug}</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4 max-w-[1400px] mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <Link
            to="/admin/agents"
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-3 h-3" /> Back to agents
          </Link>
          <h1 className="text-2xl font-semibold mt-1">{agent.display_name}</h1>
          <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
            <span>{agent.slug}</span>
            <span>·</span>
            <Badge variant="outline" className="text-xs">{agent.agent_kind}</Badge>
            <span>·</span>
            <span>domain: {domain}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-4">
        <Card className="col-span-12 lg:col-span-5">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Recent runs</CardTitle>
          </CardHeader>
          <CardContent className="p-0 max-h-[70vh] overflow-y-auto">
            {runsQuery.isLoading ? (
              <div className="p-4 flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="w-3 h-3 animate-spin" /> Loading runs…
              </div>
            ) : !runsQuery.data?.length ? (
              <div className="p-4 text-sm text-muted-foreground">No runs yet.</div>
            ) : (
              <ul className="divide-y">
                {runsQuery.data.map((r) => (
                  <li key={r.task_id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(r.task_id)}
                      className={`w-full text-left px-3 py-2 hover:bg-muted/40 transition ${
                        selectedId === r.task_id ? "bg-muted/60" : ""
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-mono truncate">{r.task_id.slice(0, 8)}…</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded ${statusTone(r.status)}`}>
                          {r.status}
                        </span>
                      </div>
                      <div className="text-[11px] text-muted-foreground mt-0.5 truncate">
                        {r.type} · {fmtMs(r.latency_ms)} · {fmtUsd(r.cost_usd)}
                      </div>
                      {r.held_for_review && !r.released_at ? (
                        <div className="text-[11px] text-warning flex items-center gap-1 mt-1">
                          <ShieldAlert className="w-3 h-3" /> awaiting release
                        </div>
                      ) : null}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="col-span-12 lg:col-span-7">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">
              {selected ? `Conversation · ${selected.task_id.slice(0, 8)}…` : "Select a run"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 max-h-[70vh] overflow-y-auto">
            {!selected ? (
              <div className="text-sm text-muted-foreground">
                Pick a run on the left to inspect prompt, response, cost, latency, and sensitive-output gates.
              </div>
            ) : domain === "code" ? (
              <DevRunDetail run={selected} onReplay={() => setReplayOpen(true)} />
            ) : (
              <RunDetail run={selected} />
            )}
          </CardContent>
        </Card>
      </div>

      <ReplayDialog
        open={replayOpen}
        onOpenChange={setReplayOpen}
        run={selected}
        domain={domain}
      />
    </div>
  );
}

function RunDetail({ run }: { run: AgentRunRichRow }) {
  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
        <Stat label="status" value={run.status} />
        <Stat label="risk" value={run.risk_level} />
        <Stat label="latency" value={fmtMs(run.latency_ms)} />
        <Stat label="cost" value={fmtUsd(run.cost_usd)} />
        {run.model ? <Stat label="model" value={run.model} /> : null}
        {run.provider ? <Stat label="provider" value={run.provider} /> : null}
        <Stat label="created" value={new Date(run.created_at).toLocaleString()} />
      </div>

      {run.held_for_review ? (
        <div className="rounded border border-warning/40 bg-warning/5 p-3 space-y-2">
          <div className="flex items-center gap-2 text-warning text-sm font-medium">
            <ShieldAlert className="w-4 h-4" />
            Sensitive output — held for review
          </div>
          {run.held_reason ? (
            <p className="text-xs text-muted-foreground">Reason: {run.held_reason}</p>
          ) : null}
          <Link
            to={`/admin/approvals?taskId=${run.task_id}`}
            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
          >
            Review in approvals inbox <ExternalLink className="w-3 h-3" />
          </Link>
        </div>
      ) : run.released_at ? (
        <div className="rounded border border-success/40 bg-success/5 p-3">
          <p className="text-xs flex items-center gap-1 text-success">
            <CheckCircle2 className="w-3 h-3" /> Decided at {new Date(run.released_at).toLocaleString()}
          </p>
        </div>
      ) : null}

      <Section title="Prompt" empty="no prompt captured">
        {run.prompt}
      </Section>
      <Section title="Response" empty="no response captured">
        {run.response}
      </Section>

      {run.purpose ? (
        <div className="rounded border bg-muted/30 px-3 py-2 text-xs">
          <span className="text-[10px] uppercase text-muted-foreground mr-2">Purpose</span>
          <code className="font-mono">{run.purpose}</code>
        </div>
      ) : null}

      {run.verification ? (
        <div className="rounded border bg-muted/20 px-3 py-2">
          <div className="text-[10px] uppercase text-muted-foreground mb-1">Verifier verdict</div>
          <pre className="text-xs whitespace-pre-wrap font-mono">
            {JSON.stringify(run.verification, null, 2)}
          </pre>
        </div>
      ) : null}

      {Array.isArray(run.tools_used) && run.tools_used.length > 0 ? (
        <div className="rounded border bg-muted/20 px-3 py-2">
          <div className="text-[10px] uppercase text-muted-foreground mb-1">
            Tools used ({run.tools_used.length})
          </div>
          <ul className="text-xs space-y-1">
            {(run.tools_used as Array<Record<string, unknown>>).map((t, i) => (
              <li key={i} className="font-mono">
                • {String(t.name ?? t.tool ?? `tool_${i}`)}
                {t.description ? (
                  <span className="text-muted-foreground"> — {String(t.description)}</span>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {run.error ? (
        <div className="rounded border border-destructive/40 bg-destructive/5 p-3">
          <div className="text-destructive text-sm font-medium flex items-center gap-1">
            <XCircle className="w-4 h-4" /> Error
          </div>
          <pre className="text-xs whitespace-pre-wrap mt-1">{run.error}</pre>
        </div>
      ) : null}

      <div className="text-[10px] text-muted-foreground flex items-center gap-1">
        <Clock className="w-3 h-3" /> task id: <code>{run.task_id}</code>
      </div>
    </>
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
  children,
  empty,
}: {
  title: string;
  children: string | null;
  empty: string;
}) {
  return (
    <div>
      <div className="text-xs font-medium text-muted-foreground mb-1">{title}</div>
      {children ? (
        <pre className="text-xs whitespace-pre-wrap rounded border bg-muted/20 p-3 max-h-64 overflow-y-auto">
          {children}
        </pre>
      ) : (
        <div className="text-xs italic text-muted-foreground">{empty}</div>
      )}
    </div>
  );
}
