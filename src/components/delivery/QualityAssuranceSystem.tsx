/**
 * QualityAssuranceSystem — SSS. Quality Assurance System.
 * Field audits, quality scoring, delivery checklists, compliance reports, corrective actions.
 * PASS101-SSS
 */
import { useState } from "react";
import { motion } from "framer-motion";
import {
  Shield, CheckCircle2, XCircle, ClipboardCheck, Star,
  AlertTriangle, TrendingUp, User, FileText, Award,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { haptic } from "@/lib/haptics";

interface DriverQuality {
  driver: string;
  score: number;
  grade: string;
  completedAudits: number;
  failedChecks: number;
  lastAudit: Date;
  correctiveActions: number;
}

interface AuditItem {
  id: string;
  driver: string;
  date: Date;
  type: string;
  score: number;
  passed: boolean;
  issues: string[];
}

interface ChecklistItem {
  id: string;
  label: string;
  category: string;
  checked: boolean;
}

const DRIVER_QUALITY: DriverQuality[] = [
  { driver: "Ousmane B.", score: 92, grade: "A+", completedAudits: 24, failedChecks: 1, lastAudit: new Date(Date.now() - 86400000), correctiveActions: 0 },
  { driver: "Ibrahima S.", score: 85, grade: "A", completedAudits: 18, failedChecks: 3, lastAudit: new Date(Date.now() - 172800000), correctiveActions: 1 },
  { driver: "Aïcha M.", score: 78, grade: "B+", completedAudits: 15, failedChecks: 4, lastAudit: new Date(Date.now() - 259200000), correctiveActions: 2 },
  { driver: "Mamadou K.", score: 65, grade: "B", completedAudits: 12, failedChecks: 6, lastAudit: new Date(Date.now() - 345600000), correctiveActions: 3 },
  { driver: "Fatou D.", score: 55, grade: "C", completedAudits: 8, failedChecks: 8, lastAudit: new Date(Date.now() - 432000000), correctiveActions: 4 },
];

const RECENT_AUDITS: AuditItem[] = [
  { id: "a1", driver: "Ousmane B.", date: new Date(Date.now() - 86400000), type: "Terrain", score: 95, passed: true, issues: [] },
  { id: "a2", driver: "Ibrahima S.", date: new Date(Date.now() - 172800000), type: "Photo preuve", score: 78, passed: true, issues: ["Photo floue"] },
  { id: "a3", driver: "Mamadou K.", date: new Date(Date.now() - 259200000), type: "Ponctualité", score: 52, passed: false, issues: ["Retard 20min", "Pas de notification client"] },
  { id: "a4", driver: "Fatou D.", date: new Date(Date.now() - 345600000), type: "Véhicule", score: 45, passed: false, issues: ["Véhicule sale", "Pneu usé", "Manque gilet"] },
];

const DEFAULT_CHECKLIST: ChecklistItem[] = [
  { id: "c1", label: "Véhicule propre et en état", category: "Véhicule", checked: false },
  { id: "c2", label: "Gilet de sécurité porté", category: "Sécurité", checked: false },
  { id: "c3", label: "Colis intact et bien emballé", category: "Colis", checked: false },
  { id: "c4", label: "Photo preuve de livraison prise", category: "Preuve", checked: false },
  { id: "c5", label: "Signature ou code client obtenu", category: "Preuve", checked: false },
  { id: "c6", label: "Délai de livraison respecté", category: "SLA", checked: false },
  { id: "c7", label: "Client notifié avant arrivée", category: "Communication", checked: false },
  { id: "c8", label: "Application GPS active pendant mission", category: "Tracking", checked: false },
];

export default function QualityAssuranceSystem({ orgId, className }: { orgId: string; className?: string }) {
  const [view, setView] = useState<"scores" | "audits" | "checklist" | "compliance">("scores");
  const [checklist, setChecklist] = useState(DEFAULT_CHECKLIST);

  const avgScore = Math.round(DRIVER_QUALITY.reduce((s, d) => s + d.score, 0) / DRIVER_QUALITY.length);
  const passRate = Math.round(RECENT_AUDITS.filter(a => a.passed).length / RECENT_AUDITS.length * 100);
  const pendingActions = DRIVER_QUALITY.reduce((s, d) => s + d.correctiveActions, 0);
  const checklistProgress = Math.round(checklist.filter(c => c.checked).length / checklist.length * 100);

  const gradeColor = (g: string) => {
    if (g.startsWith("A")) return "--success";
    if (g.startsWith("B")) return "--warning";
    return "--destructive";
  };

  const toggleCheck = (id: string) => {
    haptic("selection");
    setChecklist(prev => prev.map(c => c.id === id ? { ...c, checked: !c.checked } : c));
  };

  const submitChecklist = () => {
    haptic("medium");
    const passed = checklist.filter(c => c.checked).length;
    const total = checklist.length;
    const score = Math.round((passed / total) * 100);
    toast.success(`✅ Audit soumis — Score: ${score}% (${passed}/${total})`);
    setChecklist(DEFAULT_CHECKLIST);
  };

  return (
    <div className={`space-y-3 ${className || ""}`}>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: "hsl(var(--foreground))" }}>
          <Shield className="h-4 w-4" style={{ color: "hsl(var(--success))" }} />
          Assurance qualité
        </h3>
      </div>

      <div className="grid grid-cols-4 gap-1.5">
        {[
          { label: "Score moy.", value: `${avgScore}%`, color: avgScore >= 80 ? "--success" : "--warning" },
          { label: "Taux réussite", value: `${passRate}%`, color: passRate >= 75 ? "--success" : "--destructive" },
          { label: "Actions", value: pendingActions, color: pendingActions > 5 ? "--destructive" : "--warning" },
          { label: "Checklist", value: `${checklistProgress}%`, color: "--info" },
        ].map(k => (
          <div key={k.label} className="rounded-xl px-2 py-2 text-center"
            style={{ background: "hsl(var(--muted) / 0.3)", border: "1px solid hsl(var(--border) / 0.1)" }}>
            <p className="text-sm font-bold" style={{ color: `hsl(var(${k.color}))` }}>{k.value}</p>
            <p className="text-[7px]" style={{ color: "hsl(var(--muted-foreground))" }}>{k.label}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-1 p-1 rounded-xl" style={{ background: "hsl(var(--muted) / 0.3)" }}>
        {(["scores", "audits", "checklist", "compliance"] as const).map(v => (
          <button key={v} onClick={() => { setView(v); haptic("selection"); }}
            className="flex-1 py-1.5 rounded-lg text-[9px] font-semibold"
            style={{
              background: view === v ? "hsl(var(--primary) / 0.1)" : "transparent",
              color: view === v ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))",
            }}>
            {v === "scores" ? "⭐ Scores" : v === "audits" ? "📋 Audits" : v === "checklist" ? "✅ Checklist" : "📊 Conformité"}
          </button>
        ))}
      </div>

      {view === "scores" && (
        <div className="space-y-2">
          {DRIVER_QUALITY.map(d => (
            <div key={d.driver} className="rounded-xl p-3"
              style={{ background: "hsl(var(--muted) / 0.2)", border: "1px solid hsl(var(--border) / 0.08)" }}>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full flex items-center justify-center"
                  style={{ background: `hsl(var(${gradeColor(d.grade)}) / 0.1)` }}>
                  <span className="text-xs font-bold" style={{ color: `hsl(var(${gradeColor(d.grade)}))` }}>{d.grade}</span>
                </div>
                <div className="flex-1">
                  <p className="text-[10px] font-semibold" style={{ color: "hsl(var(--foreground))" }}>{d.driver}</p>
                  <p className="text-[8px]" style={{ color: "hsl(var(--muted-foreground))" }}>
                    {d.completedAudits} audits • {d.failedChecks} échecs • {d.correctiveActions} actions
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[11px] font-bold" style={{ color: `hsl(var(${gradeColor(d.grade)}))` }}>{d.score}%</p>
                </div>
              </div>
              <div className="h-1.5 rounded-full mt-2 overflow-hidden" style={{ background: "hsl(var(--muted) / 0.5)" }}>
                <motion.div initial={{ width: 0 }} animate={{ width: `${d.score}%` }}
                  className="h-full rounded-full" style={{ background: `hsl(var(${gradeColor(d.grade)}))` }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {view === "audits" && (
        <div className="space-y-2">
          {RECENT_AUDITS.map(a => (
            <div key={a.id} className="rounded-xl p-3"
              style={{
                background: a.passed ? "hsl(var(--muted) / 0.2)" : "hsl(var(--destructive) / 0.03)",
                border: `1px solid ${a.passed ? "hsl(var(--border) / 0.08)" : "hsl(var(--destructive) / 0.15)"}`,
              }}>
              <div className="flex items-start gap-2">
                {a.passed ? <CheckCircle2 className="h-4 w-4 shrink-0" style={{ color: "hsl(var(--success))" }} />
                  : <XCircle className="h-4 w-4 shrink-0" style={{ color: "hsl(var(--destructive))" }} />}
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-[10px] font-semibold" style={{ color: "hsl(var(--foreground))" }}>{a.type}</p>
                    <span className="text-[8px] font-bold" style={{ color: a.passed ? "hsl(var(--success))" : "hsl(var(--destructive))" }}>
                      {a.score}%
                    </span>
                  </div>
                  <p className="text-[8px]" style={{ color: "hsl(var(--muted-foreground))" }}>
                    👤 {a.driver} • {a.date.toLocaleDateString("fr-FR")}
                  </p>
                  {a.issues.length > 0 && (
                    <div className="mt-1 space-y-0.5">
                      {a.issues.map((issue, i) => (
                        <p key={i} className="text-[8px]" style={{ color: "hsl(var(--destructive))" }}>⚠️ {issue}</p>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {view === "checklist" && (
        <div className="space-y-2">
          <p className="text-[10px] font-semibold" style={{ color: "hsl(var(--foreground))" }}>
            Checklist livraison — {checklist.filter(c => c.checked).length}/{checklist.length}
          </p>
          {[...new Set(checklist.map(c => c.category))].map(cat => (
            <div key={cat}>
              <p className="text-[8px] font-bold mb-1" style={{ color: "hsl(var(--primary))" }}>{cat}</p>
              {checklist.filter(c => c.category === cat).map(c => (
                <button key={c.id} onClick={() => toggleCheck(c.id)}
                  className="w-full flex items-center gap-2 py-1.5 px-2 rounded-lg mb-1"
                  style={{ background: c.checked ? "hsl(var(--success) / 0.05)" : "hsl(var(--muted) / 0.15)" }}>
                  {c.checked ? <CheckCircle2 className="h-3.5 w-3.5 shrink-0" style={{ color: "hsl(var(--success))" }} />
                    : <div className="w-3.5 h-3.5 rounded-full border shrink-0" style={{ borderColor: "hsl(var(--muted-foreground) / 0.3)" }} />}
                  <span className="text-[9px] text-left" style={{
                    color: c.checked ? "hsl(var(--success))" : "hsl(var(--foreground))",
                    textDecoration: c.checked ? "line-through" : "none",
                  }}>{c.label}</span>
                </button>
              ))}
            </div>
          ))}
          <Button className="w-full text-xs h-9 mt-2" onClick={submitChecklist}
            disabled={checklist.filter(c => c.checked).length === 0}
            style={{ background: "hsl(var(--success))", color: "#fff" }}>
            <ClipboardCheck className="h-3 w-3 mr-1" /> Soumettre l'audit
          </Button>
        </div>
      )}

      {view === "compliance" && (
        <div className="space-y-3">
          <p className="text-[10px] font-semibold" style={{ color: "hsl(var(--foreground))" }}>Rapport conformité</p>
          {[
            { label: "Photo preuve obligatoire", compliance: 94, target: 100 },
            { label: "Délai SLA respecté", compliance: 82, target: 90 },
            { label: "Code confirmation validé", compliance: 88, target: 95 },
            { label: "Véhicule conforme", compliance: 76, target: 85 },
            { label: "Communication client", compliance: 71, target: 80 },
          ].map(r => (
            <div key={r.label} className="rounded-xl p-3"
              style={{ background: "hsl(var(--muted) / 0.2)", border: "1px solid hsl(var(--border) / 0.08)" }}>
              <div className="flex justify-between mb-1">
                <span className="text-[10px] font-medium" style={{ color: "hsl(var(--foreground))" }}>{r.label}</span>
                <span className="text-[10px] font-bold" style={{
                  color: r.compliance >= r.target ? "hsl(var(--success))" : "hsl(var(--destructive))",
                }}>{r.compliance}% <span className="font-normal text-[8px]">/ {r.target}%</span></span>
              </div>
              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "hsl(var(--muted) / 0.5)" }}>
                <motion.div initial={{ width: 0 }} animate={{ width: `${r.compliance}%` }}
                  className="h-full rounded-full" style={{
                    background: r.compliance >= r.target ? "hsl(var(--success))" : r.compliance >= r.target * 0.9 ? "hsl(var(--warning))" : "hsl(var(--destructive))",
                  }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
