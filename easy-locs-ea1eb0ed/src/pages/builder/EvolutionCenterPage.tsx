import SubPageShell from "@/components/layout/SubPageShell";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppCard, CardContent, CardHeader, CardTitle } from "@/components/ui/AppCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft, GitBranch, Play, Pause, ShieldCheck, ShieldAlert,
  CheckCircle2, XCircle, Clock, Activity,
} from "lucide-react";
import {
  approve,
  reject,
  pause,
  resume,
  isPaused,
  getEvolutionConfig,
} from "@/devos/evolution";
import {
  runEvolutionCycleFromAuditEngine,
  getEvolutionDashboardSnapshot,
  makeSafePatchExecutor,
  wireEvolutionPersistence,
} from "@/devos/evolution/bridge";
import { makeRepairAgent } from "@/devos/evolution";

const repairAgent = makeRepairAgent(makeSafePatchExecutor());

export default function EvolutionCenterPage() {
  const navigate = useNavigate();
  const [snapshot, setSnapshot] = useState(getEvolutionDashboardSnapshot());
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    wireEvolutionPersistence();
    const t = setInterval(() => setSnapshot(getEvolutionDashboardSnapshot()), 2000);
    return () => clearInterval(t);
  }, []);

  const config = useMemo(() => getEvolutionConfig(), []);
  const paused = isPaused();
  const proposals = snapshot.proposals;
  const summary = snapshot.summary;

  const handleRunCycle = async () => {
    setBusy(true);
    try {
      await runEvolutionCycleFromAuditEngine();
    } finally {
      setSnapshot(getEvolutionDashboardSnapshot());
      setBusy(false);
    }
  };

  const handleApprove = (id: string) => {
    approve(id, { kind: "human", id: "operator/ui" });
    void repairAgent.run(id).then(() => setSnapshot(getEvolutionDashboardSnapshot()));
  };

  const handleReject = (id: string) => {
    reject(id, "human-rejected", "Rejected from evolution center", { kind: "human", id: "operator/ui" });
    setSnapshot(getEvolutionDashboardSnapshot());
  };

  const handleRollback = (id: string) => {
    void repairAgent.rollback(id).then(() => setSnapshot(getEvolutionDashboardSnapshot()));
  };

  const togglePause = () => {
    if (paused) resume({ kind: "human", id: "operator/ui" });
    else pause("manual pause from UI");
    setSnapshot(getEvolutionDashboardSnapshot());
  };

  return (
    <SubPageShell noContentPad className="bg-gray-950 text-white p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate("/builder")} className="text-gray-400 hover:text-white">
              <ArrowLeft className="w-6 h-6" />
            </button>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <GitBranch className="w-6 h-6 text-cyan-400" />
                Evolution Center
              </h1>
              <p className="text-gray-400 text-sm">
                Controlled self-evolution — Level C
                {config.LEVEL_D_ENABLED ? (
                  <Badge className="ml-2 bg-amber-900 text-amber-300">LEVEL D ENABLED</Badge>
                ) : (
                  <Badge className="ml-2 bg-emerald-900 text-emerald-300">Level D OFF</Badge>
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={handleRunCycle} disabled={busy || paused} className="bg-cyan-700 hover:bg-cyan-600">
              <Play className="w-4 h-4 mr-2" />
              {busy ? "Running…" : "Run cycle"}
            </Button>
            <Button onClick={togglePause} variant={paused ? "default" : "secondary"}>
              {paused ? <Play className="w-4 h-4 mr-2" /> : <Pause className="w-4 h-4 mr-2" />}
              {paused ? "Resume" : "Pause"}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <AppCard className="bg-gray-900 border-gray-800">
            <CardHeader><CardTitle className="text-sm text-gray-400">Suggested</CardTitle></CardHeader>
            <CardContent className="text-2xl font-bold text-cyan-300">{summary.proposalsSuggested}</CardContent>
          </AppCard>
          <AppCard className="bg-gray-900 border-gray-800">
            <CardHeader><CardTitle className="text-sm text-gray-400">Approved</CardTitle></CardHeader>
            <CardContent className="text-2xl font-bold text-emerald-300">{summary.proposalsApproved}</CardContent>
          </AppCard>
          <AppCard className="bg-gray-900 border-gray-800">
            <CardHeader><CardTitle className="text-sm text-gray-400">Rejected</CardTitle></CardHeader>
            <CardContent className="text-2xl font-bold text-red-300">{summary.proposalsRejected}</CardContent>
          </AppCard>
          <AppCard className="bg-gray-900 border-gray-800">
            <CardHeader><CardTitle className="text-sm text-gray-400">Completed</CardTitle></CardHeader>
            <CardContent className="text-2xl font-bold text-violet-300">{summary.proposalsCompleted}</CardContent>
          </AppCard>
        </div>

        <AppCard className="bg-gray-900 border-gray-800">
          <CardHeader><CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-cyan-400" />
            Pending proposals ({proposals.filter(p => p.status === "suggested").length})
          </CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {proposals.filter(p => p.status === "suggested").length === 0 && (
              <p className="text-gray-500 text-sm">No pending proposals. Run a cycle to generate suggestions.</p>
            )}
            {proposals.filter(p => p.status === "suggested").map(p => (
              <div key={p.id} className="flex items-start justify-between gap-3 p-3 rounded border border-gray-800 bg-gray-950">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-amber-950 text-amber-300">{p.domain}</Badge>
                    <span className="text-sm text-gray-200 truncate">{p.intent}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1 truncate">files: {p.files.join(", ")} · rollback: {p.rollbackPlan}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button size="sm" onClick={() => handleApprove(p.id)} className="bg-emerald-700 hover:bg-emerald-600">
                    <CheckCircle2 className="w-4 h-4 mr-1" /> Approve
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => handleReject(p.id)}>
                    <XCircle className="w-4 h-4 mr-1" /> Reject
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </AppCard>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <AppCard className="bg-gray-900 border-gray-800">
            <CardHeader><CardTitle className="flex items-center gap-2">
              {paused ? <ShieldAlert className="w-5 h-5 text-amber-400" /> : <ShieldCheck className="w-5 h-5 text-emerald-400" />}
              Pipeline status
            </CardTitle></CardHeader>
            <CardContent className="text-sm space-y-1 text-gray-300">
              <p>Status: <strong>{paused ? "PAUSED" : "RUNNING"}</strong></p>
              <p>Rejection streak: {summary.rejectionStreak} / {config.REJECTION_ESCALATION_THRESHOLD}</p>
              <p>Safeguard trips: {summary.safeguardTrips}</p>
              <p>Max concurrent: {config.MAX_CONCURRENT_TASKS}</p>
              <p>Cooldown: {config.CYCLE_COOLDOWN_MS / 1000}s</p>
            </CardContent>
          </AppCard>
          <AppCard className="bg-gray-900 border-gray-800">
            <CardHeader><CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-cyan-400" />
              Recent rejection reasons
            </CardTitle></CardHeader>
            <CardContent className="text-sm text-gray-400 space-y-1">
              {summary.recentRejectionReasons.length === 0 && <p className="text-gray-500">No rejections yet.</p>}
              {summary.recentRejectionReasons.map((r, i) => (
                <p key={i}>· {r}</p>
              ))}
            </CardContent>
          </AppCard>
        </div>

        <AppCard className="bg-gray-900 border-gray-800">
          <CardHeader><CardTitle>Recently completed / rolled-back</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {proposals.filter(p => p.status === "completed" || p.status === "rolled-back" || p.status === "failed").slice(-10).reverse().map(p => (
              <div key={p.id} className="flex items-center justify-between gap-3 p-2 rounded border border-gray-800">
                <div className="min-w-0">
                  <Badge className={
                    p.status === "completed" ? "bg-emerald-950 text-emerald-300" :
                    p.status === "rolled-back" ? "bg-amber-950 text-amber-300" :
                    "bg-red-950 text-red-300"
                  }>{p.status}</Badge>
                  <span className="text-sm text-gray-300 ml-2 truncate">{p.intent}</span>
                </div>
                {p.status === "completed" && (
                  <Button size="sm" variant="outline" onClick={() => handleRollback(p.id)}>Rollback</Button>
                )}
              </div>
            ))}
            {proposals.filter(p => p.status === "completed" || p.status === "rolled-back" || p.status === "failed").length === 0 && (
              <p className="text-gray-500 text-sm">Nothing executed yet.</p>
            )}
          </CardContent>
        </AppCard>
      </div>
    </SubPageShell>
  );
}
