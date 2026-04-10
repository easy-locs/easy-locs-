import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { generateExecutionProof, type ExecutionProofReport, type FlowProof, type FlowStep } from "@/lib/runtime/execution-proof";
import { ArrowLeft, Shield, CheckCircle, AlertTriangle, XCircle, Activity, Zap, Database, Radio, Layers } from "lucide-react";

const STATUS_COLORS = {
  proven: "text-emerald-400",
  partial: "text-amber-400",
  broken: "text-red-400",
  connected: "text-emerald-400",
  disconnected: "text-red-400",
} as const;

const STATUS_ICONS = {
  proven: CheckCircle,
  partial: AlertTriangle,
  broken: XCircle,
  connected: CheckCircle,
  disconnected: XCircle,
};

const LAYER_ICONS: Record<string, typeof Activity> = {
  ui: Layers,
  store: Database,
  service: Zap,
  repository: Database,
  edge_function: Shield,
  db: Database,
  event: Activity,
  realtime: Radio,
  bridge: Zap,
};

function StepRow({ step }: { step: FlowStep }) {
  const Icon = STATUS_ICONS[step.status] || AlertTriangle;
  const LayerIcon = LAYER_ICONS[step.layer] || Activity;
  return (
    <div className="flex items-start gap-3 py-2 border-b border-border/10 last:border-0">
      <div className="mt-0.5">
        <Icon className={`w-4 h-4 ${STATUS_COLORS[step.status]}`} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <LayerIcon className="w-3 h-3 text-muted-foreground" />
          <span className="text-xs font-semibold text-foreground">{step.name}</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{step.layer}</span>
        </div>
        <p className="text-[11px] text-muted-foreground mt-0.5">{step.detail}</p>
        {step.file && <p className="text-[10px] text-muted-foreground/50 font-mono mt-0.5">{step.file}</p>}
      </div>
    </div>
  );
}

function FlowCard({ flow }: { flow: FlowProof }) {
  const [expanded, setExpanded] = useState(flow.status !== "proven");
  const Icon = STATUS_ICONS[flow.status];
  return (
    <div className="rounded-2xl border border-border/20 bg-card overflow-hidden">
      <button onClick={() => setExpanded(!expanded)} className="w-full flex items-center gap-3 p-4 text-left">
        <Icon className={`w-5 h-5 ${STATUS_COLORS[flow.status]}`} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-foreground">{flow.flow}</p>
          <p className="text-[10px] text-muted-foreground">{flow.domain} · {flow.steps.length} steps</p>
        </div>
        <span className={`text-xs font-bold uppercase ${STATUS_COLORS[flow.status]}`}>{flow.status}</span>
      </button>
      {expanded && (
        <div className="px-4 pb-4 border-t border-border/10">
          {flow.steps.map((step, i) => (
            <StepRow key={i} step={step} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function ExecutionProofPage() {
  const navigate = useNavigate();
  const [report, setReport] = useState<ExecutionProofReport | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const r = generateExecutionProof();
      setReport(r);
    } catch (err) {
      console.error("[ExecutionProof] generation failed", err);
    } finally {
      setLoading(false);
    }
  }, []);

  if (loading) {
    return (
      <div className="app-mobile-page app-mobile-content bg-background flex items-center justify-center">
        <div className="text-center">
          <Activity className="w-8 h-8 animate-spin text-primary mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Running execution proofs…</p>
        </div>
      </div>
    );
  }

  if (!report) return null;

  const proven = report.flows.filter(f => f.status === "proven").length;
  const totalSteps = report.flows.reduce((sum, f) => sum + f.steps.length, 0);
  const connectedSteps = report.flows.reduce((sum, f) => sum + f.steps.filter(s => s.status === "connected").length, 0);

  return (
    <div className="app-mobile-page app-mobile-content bg-background">
      <header className="flex items-center gap-3 px-4 pt-6 pb-4">
        <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center active:scale-95">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="text-lg font-bold text-foreground">Execution Proof</h1>
          <p className="text-xs text-muted-foreground">{report.timestamp}</p>
        </div>
      </header>

      <div className="px-4 space-y-4 pb-24">
        <div className={`rounded-2xl p-4 border ${
          report.systemStatus === "production_ready"
            ? "border-emerald-500/30 bg-emerald-500/5"
            : report.systemStatus === "partial"
            ? "border-amber-500/30 bg-amber-500/5"
            : "border-red-500/30 bg-red-500/5"
        }`}>
          <div className="flex items-center gap-3">
            <Shield className={`w-6 h-6 ${
              report.systemStatus === "production_ready" ? "text-emerald-400" : report.systemStatus === "partial" ? "text-amber-400" : "text-red-400"
            }`} />
            <div>
              <p className="text-sm font-bold text-foreground uppercase">{report.systemStatus.replace("_", " ")}</p>
              <p className="text-[11px] text-muted-foreground">
                {proven}/{report.flows.length} flows proven · {connectedSteps}/{totalSteps} steps connected
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-xl bg-card border border-border/20 p-3">
            <p className="text-[10px] text-muted-foreground font-semibold">ARCH GUARD</p>
            <p className="text-lg font-bold text-foreground">{report.archGuard.passed}✓ {report.archGuard.warnings}⚠ {report.archGuard.failed}✗</p>
          </div>
          <div className="rounded-xl bg-card border border-border/20 p-3">
            <p className="text-[10px] text-muted-foreground font-semibold">EVENT HANDLERS</p>
            <p className="text-lg font-bold text-foreground">{report.eventIntegrity.totalHandlers}</p>
          </div>
          <div className="rounded-xl bg-card border border-border/20 p-3">
            <p className="text-[10px] text-muted-foreground font-semibold">DEAD EVENTS</p>
            <p className="text-lg font-bold text-foreground">{report.eventIntegrity.deadEvents}</p>
          </div>
          <div className="rounded-xl bg-card border border-border/20 p-3">
            <p className="text-[10px] text-muted-foreground font-semibold">ANOMALIES</p>
            <p className="text-lg font-bold text-foreground">{report.anomalies.total} ({report.anomalies.critical} crit)</p>
          </div>
        </div>

        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-3">FLOW PROOFS</p>
          <div className="space-y-3">
            {report.flows.map((flow, i) => (
              <FlowCard key={i} flow={flow} />
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-border/20 bg-card p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">RAW SUMMARY</p>
          <p className="text-[11px] text-muted-foreground font-mono leading-relaxed">{report.summary}</p>
        </div>
      </div>
    </div>
  );
}
