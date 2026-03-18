import { useState } from "react";
import { BackCard } from "@/components/ui/back-card";
import { useActiveWorkspace } from "@/hooks/useActiveWorkspace";
import { runMasterAudit } from "@/lib/audit/master-audit-engine";
import { useAuditReport } from "@/hooks/useAuditReport";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  ShieldCheck,
  AlertTriangle,
  XCircle,
  Info,
  CheckCircle2,
  Activity,
  Truck,
  CreditCard,
  MapPin,
  Lock,
  Radio,
  Rocket,
  BarChart3,
  Zap,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

/* ── Helpers ── */

function severityIcon(severity: string, size = "h-4 w-4") {
  if (severity === "critical") return <XCircle className={`${size} text-destructive shrink-0`} />;
  if (severity === "warning") return <AlertTriangle className={`${size} text-warning shrink-0`} />;
  return <CheckCircle2 className={`${size} text-success shrink-0`} />;
}

function gateIcon(key: string) {
  if (key.includes("payment")) return <CreditCard className="h-4 w-4" />;
  if (key.includes("dispatch")) return <Truck className="h-4 w-4" />;
  if (key.includes("tracking")) return <MapPin className="h-4 w-4" />;
  if (key.includes("rls")) return <Lock className="h-4 w-4" />;
  if (key.includes("otp")) return <Lock className="h-4 w-4" />;
  if (key.includes("launch")) return <Rocket className="h-4 w-4" />;
  return <Activity className="h-4 w-4" />;
}

function gateStatusBadge(status: string) {
  if (status === "pass")
    return <Badge className="bg-success/15 text-success border-success/30 text-[10px] font-bold uppercase tracking-wider">PASS</Badge>;
  if (status === "fail")
    return <Badge className="bg-destructive/15 text-destructive border-destructive/30 text-[10px] font-bold uppercase tracking-wider">FAIL</Badge>;
  if (status === "warning")
    return <Badge className="bg-warning/15 text-warning border-warning/30 text-[10px] font-bold uppercase tracking-wider">WARN</Badge>;
  return <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-wider">N/A</Badge>;
}

function scoreColor(score: number) {
  if (score >= 85) return "text-success";
  if (score >= 60) return "text-warning";
  return "text-destructive";
}

function statusLabel(status: string) {
  if (status === "passed") return { text: "Opérationnel", color: "text-success", bg: "bg-success/10" };
  if (status === "partial") return { text: "Attention requise", color: "text-warning", bg: "bg-warning/10" };
  if (status === "failed") return { text: "Blocage critique", color: "text-destructive", bg: "bg-destructive/10" };
  return { text: status, color: "text-muted-foreground", bg: "bg-muted" };
}

/* ── Animations ── */
const stagger = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

/* ── Page ── */

export default function AuditDebugPanelPage() {
  const { activeWorkspace } = useActiveWorkspace();
  const [reportId, setReportId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { report, findings, gates } = useAuditReport(reportId ?? undefined);

  const run = async () => {
    setLoading(true);
    try {
      const result = await runMasterAudit(activeWorkspace?.id);
      setReportId(result.id);
    } finally {
      setLoading(false);
    }
  };

  const critical = findings.filter((x) => x.severity === "critical");
  const warning = findings.filter((x) => x.severity === "warning");
  const info = findings.filter((x) => x.severity === "info");
  const sl = report ? statusLabel(report.status) : null;

  return (
    <div className="min-h-screen bg-background">
      {/* ── Hero Header ── */}
      <div
        className="relative overflow-hidden px-5 pt-5 pb-8"
        style={{ background: "var(--gradient-hero)" }}
      >
        <div className="absolute inset-0 opacity-[0.04]" style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, hsl(var(--primary-foreground)) 1px, transparent 0)`,
          backgroundSize: "24px 24px",
        }} />

        <div className="relative z-10 max-w-2xl mx-auto space-y-4">
          <BackCard label="Retour" />

          <div className="flex items-start gap-3 mt-2">
            <div className="h-11 w-11 rounded-xl bg-accent/20 flex items-center justify-center shrink-0">
              <ShieldCheck className="h-6 w-6 text-accent" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-primary-foreground tracking-tight">
                Easy-Locs System Audit
              </h1>
              <p className="text-xs text-primary-foreground/60 mt-0.5 leading-relaxed">
                Contrôle global des opérations en temps réel
                <br />
                Commandes · Livreurs · Paiements · Tracking
              </p>
            </div>
          </div>

          {/* CTA */}
          <Button
            onClick={run}
            disabled={loading}
            className="w-full h-12 bg-accent hover:bg-accent/90 text-accent-foreground font-semibold text-sm rounded-xl shadow-lg transition-all"
            style={{ boxShadow: "var(--shadow-gold)" }}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Analyse en cours…
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Zap className="h-4 w-4" />
                Lancer l'audit système
              </span>
            )}
          </Button>
        </div>
      </div>

      {/* ── Results ── */}
      <AnimatePresence>
        {!!report && (
          <motion.div
            initial="hidden"
            animate="show"
            variants={stagger}
            className="max-w-2xl mx-auto px-4 pb-8 -mt-3 space-y-4"
          >
            {/* ── Score Card ── */}
            <motion.div variants={fadeUp}>
              <Card className="border-0 shadow-lg overflow-hidden" style={{ boxShadow: "var(--shadow-elevated)" }}>
                <CardContent className="p-0">
                  {/* Score top bar */}
                  <div className="p-5 pb-4">
                    <div className="flex items-end justify-between mb-3">
                      <div>
                        <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold mb-1">
                          Score global
                        </p>
                        <div className="flex items-baseline gap-1.5">
                          <span className={`text-4xl font-extrabold tabular-nums ${scoreColor(report.total_score)}`}>
                            {report.total_score}
                          </span>
                          <span className="text-sm text-muted-foreground font-medium">/100</span>
                        </div>
                      </div>
                      {sl && (
                        <span className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider ${sl.color} ${sl.bg}`}>
                          {sl.text}
                        </span>
                      )}
                    </div>

                    <Progress value={report.total_score} className="h-2 rounded-full" />
                  </div>

                  {/* Stats bar */}
                  <div className="grid grid-cols-3 border-t border-border">
                    <div className="p-3 text-center border-r border-border">
                      <XCircle className="h-3.5 w-3.5 text-destructive mx-auto mb-1" />
                      <p className="text-lg font-bold text-foreground tabular-nums">{report.critical_count}</p>
                      <p className="text-[9px] text-muted-foreground uppercase tracking-wider font-medium">Critiques</p>
                    </div>
                    <div className="p-3 text-center border-r border-border">
                      <AlertTriangle className="h-3.5 w-3.5 text-warning mx-auto mb-1" />
                      <p className="text-lg font-bold text-foreground tabular-nums">{report.warning_count}</p>
                      <p className="text-[9px] text-muted-foreground uppercase tracking-wider font-medium">Alertes</p>
                    </div>
                    <div className="p-3 text-center">
                      <CheckCircle2 className="h-3.5 w-3.5 text-success mx-auto mb-1" />
                      <p className="text-lg font-bold text-foreground tabular-nums">{report.info_count}</p>
                      <p className="text-[9px] text-muted-foreground uppercase tracking-wider font-medium">Info</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* ── Launch Gates ── */}
            <motion.div variants={fadeUp}>
              <div className="flex items-center gap-2 mb-2.5">
                <BarChart3 className="h-4 w-4 text-accent" />
                <h2 className="text-xs font-bold text-foreground uppercase tracking-wider">
                  Portes de lancement
                </h2>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {gates.map((gate: any) => (
                  <Card key={gate.id} className="border border-border/60 hover:border-border transition-colors">
                    <CardContent className="p-3 flex items-center gap-2.5">
                      <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center shrink-0 text-muted-foreground">
                        {gateIcon(gate.gate_key)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] text-muted-foreground font-medium truncate">
                          {gate.gate_key.replace(/_/g, " ")}
                        </p>
                        {gateStatusBadge(gate.status)}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </motion.div>

            {/* ── Critical Findings ── */}
            {critical.length > 0 && (
              <motion.div variants={fadeUp}>
                <div className="flex items-center gap-2 mb-2.5">
                  <XCircle className="h-4 w-4 text-destructive" />
                  <h2 className="text-xs font-bold text-destructive uppercase tracking-wider">
                    Blocages critiques ({critical.length})
                  </h2>
                </div>
                <div className="space-y-2">
                  {critical.map((row: any) => (
                    <Card key={row.id} className="border-destructive/30 bg-destructive/[0.03]">
                      <CardContent className="p-3.5">
                        <div className="flex items-start gap-2.5">
                          {severityIcon("critical")}
                          <div className="min-w-0 flex-1 space-y-1">
                            <p className="text-xs font-semibold text-foreground leading-snug">{row.title}</p>
                            <p className="text-[10px] text-muted-foreground font-mono">{row.finding_key}</p>
                            {row.actual_state && (
                              <p className="text-[10px] text-muted-foreground">
                                <span className="font-medium">État :</span> {row.actual_state}
                              </p>
                            )}
                            {row.action_hint && (
                              <div className="flex items-start gap-1.5 mt-1.5 px-2.5 py-1.5 rounded-md bg-primary/5 border border-primary/10">
                                <Zap className="h-3 w-3 text-primary shrink-0 mt-0.5" />
                                <p className="text-[10px] text-primary font-medium leading-relaxed">
                                  {row.action_hint}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </motion.div>
            )}

            {/* ── Warnings ── */}
            {warning.length > 0 && (
              <motion.div variants={fadeUp}>
                <div className="flex items-center gap-2 mb-2.5">
                  <AlertTriangle className="h-4 w-4 text-warning" />
                  <h2 className="text-xs font-bold text-warning uppercase tracking-wider">
                    Alertes ({warning.length})
                  </h2>
                </div>
                <div className="space-y-2">
                  {warning.map((row: any) => (
                    <Card key={row.id} className="border-warning/20 bg-warning/[0.03]">
                      <CardContent className="p-3.5">
                        <div className="flex items-start gap-2.5">
                          {severityIcon("warning")}
                          <div className="min-w-0 flex-1 space-y-1">
                            <p className="text-xs font-semibold text-foreground leading-snug">{row.title}</p>
                            <p className="text-[10px] text-muted-foreground font-mono">{row.finding_key}</p>
                            {row.actual_state && (
                              <p className="text-[10px] text-muted-foreground">
                                <span className="font-medium">État :</span> {row.actual_state}
                              </p>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </motion.div>
            )}

            {/* ── Info ── */}
            {info.length > 0 && (
              <motion.div variants={fadeUp}>
                <div className="flex items-center gap-2 mb-2.5">
                  <CheckCircle2 className="h-4 w-4 text-success" />
                  <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    Validations ({info.length})
                  </h2>
                </div>
                <div className="space-y-1.5">
                  {info.map((row: any) => (
                    <div
                      key={row.id}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-muted/50 border border-border/40"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5 text-success/70 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-medium text-foreground truncate">{row.title}</p>
                        {row.actual_state && (
                          <p className="text-[10px] text-muted-foreground truncate">{row.actual_state}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* ── Footer ── */}
            <motion.div variants={fadeUp}>
              <p className="text-center text-[10px] text-muted-foreground/60 pt-2">
                Easy-Locs Platform Health Engine · v2.0
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Empty state ── */}
      {!report && !loading && (
        <div className="max-w-2xl mx-auto px-5 py-12 text-center space-y-3">
          <div className="h-14 w-14 rounded-2xl bg-muted flex items-center justify-center mx-auto">
            <Activity className="h-7 w-7 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground">
            Lancez l'audit pour analyser l'état de la plateforme
          </p>
          <p className="text-[10px] text-muted-foreground/60">
            Paiements · Dispatch · Tracking · Sécurité RLS · Business
          </p>
        </div>
      )}
    </div>
  );
}
