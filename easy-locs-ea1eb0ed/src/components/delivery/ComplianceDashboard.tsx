/**
 * ComplianceDashboard — AAA. Compliance Dashboard
 * GDPR, driver identity verification, audit logs.
 * PASS90-AAA
 */
import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, FileCheck, AlertTriangle, CheckCircle2, Clock, Eye, UserCheck, Download, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useComplianceCases, useDriverSessions } from "@/hooks/useDeliveryData";

export default function ComplianceDashboard({ orgId }: { orgId: string }) {
  const { data: complianceCases = [], isLoading: loadingCases } = useComplianceCases(orgId);
  const { data: driverSessions = [], isLoading: loadingDrivers } = useDriverSessions(orgId);
  const [tab, setTab] = useState<"overview" | "drivers" | "audit">("overview");
  const [auditSearch, setAuditSearch] = useState("");

  if (loadingCases || loadingDrivers) return <div style={{ padding: "2rem", textAlign: "center", color: "#888" }}>Loading...</div>;

  const score = useMemo(() => {
    if (complianceCases.length === 0) return 100;
    const compliant = complianceCases.filter((c: any) => c.status === "compliant" || c.status === "resolved").length;
    return Math.round((compliant / complianceCases.length) * 100);
  }, [complianceCases]);

  const statusCfg: Record<string, { color: string; label: string; emoji: string }> = {
    compliant: { color: "hsl(var(--success))", label: "Conforme", emoji: "✅" },
    resolved: { color: "hsl(var(--success))", label: "Résolu", emoji: "✅" },
    warning: { color: "hsl(var(--warning))", label: "Attention", emoji: "⚠️" },
    non_compliant: { color: "hsl(var(--destructive))", label: "Non conforme", emoji: "❌" },
    open: { color: "hsl(var(--warning))", label: "Ouvert", emoji: "⚠️" },
    pending: { color: "hsl(var(--info))", label: "En cours", emoji: "⏳" },
  };

  const filteredCases = complianceCases.filter((a: any) => {
    if (!auditSearch) return true;
    const search = auditSearch.toLowerCase();
    return (a.title || a.label || "").toLowerCase().includes(search) ||
      (a.description || a.details || "").toLowerCase().includes(search);
  });

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Shield className="h-4 w-4" style={{ color: "hsl(var(--success))" }} />
        <h3 className="text-sm font-bold" style={{ color: "hsl(var(--hud-text))" }}>Compliance</h3>
        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{
          background: score >= 80 ? "hsl(var(--success) / 0.12)" : "hsl(var(--warning) / 0.12)",
          color: score >= 80 ? "hsl(var(--success))" : "hsl(var(--warning))",
        }}>{score}%</span>
      </div>

      <div className="flex gap-1 p-1 rounded-lg" style={{ background: "hsl(var(--hud-surface))" }}>
        {([
          { id: "overview" as const, label: "🛡️ Vue d'ensemble" },
          { id: "drivers" as const, label: "👤 Chauffeurs" },
          { id: "audit" as const, label: "📋 Audit" },
        ]).map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className="flex-1 py-1.5 px-2 rounded-md text-[10px] font-semibold transition-all"
            style={{
              background: tab === t.id ? "hsl(var(--success) / 0.12)" : "transparent",
              color: tab === t.id ? "hsl(var(--success))" : "hsl(var(--hud-text-dim) / 0.5)",
            }}>
            {t.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {tab === "overview" && (
          <motion.div key="overview" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-2">
            {/* Score */}
            <div className="text-center py-3 rounded-xl" style={{ background: "linear-gradient(135deg, hsl(var(--success) / 0.06), hsl(var(--hud-surface)))", border: "1px solid hsl(var(--success) / 0.12)" }}>
              <p className="text-3xl font-extrabold tabular-nums" style={{ color: score >= 80 ? "hsl(var(--success))" : "hsl(var(--warning))" }}>{score}%</p>
              <p className="text-[10px]" style={{ color: "hsl(var(--hud-text-dim) / 0.5)" }}>Score de conformité global</p>
            </div>

            {complianceCases.length === 0 && <div style={{ padding: "1rem", textAlign: "center", color: "#888" }}>Aucun cas de conformité</div>}
            {complianceCases.map((c: any) => {
              const status = c.status || "pending";
              const cfg = statusCfg[status] || statusCfg.pending;
              return (
                <div key={c.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
                  style={{ background: "hsl(var(--hud-surface))", border: `1px solid ${cfg.color}15` }}>
                  <span className="text-sm">{cfg.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-semibold" style={{ color: "hsl(var(--hud-text))" }}>{c.title || c.label || c.category || "Case"}</p>
                    <p className="text-[10px]" style={{ color: "hsl(var(--hud-text-dim) / 0.5)" }}>{c.description || c.details || ""}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-[10px] font-semibold" style={{ color: cfg.color }}>{cfg.label}</span>
                  </div>
                </div>
              );
            })}
          </motion.div>
        )}

        {tab === "drivers" && (
          <motion.div key="drivers" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-2">
            {driverSessions.length === 0 && <div style={{ padding: "1rem", textAlign: "center", color: "#888" }}>Aucun chauffeur</div>}
            {driverSessions.map((d: any) => {
              const isOnline = d.status === "online" || d.status === "active";
              return (
                <div key={d.id} className="rounded-xl p-3 space-y-2" style={{ background: "hsl(var(--hud-surface))", border: `1px solid ${isOnline ? "hsl(var(--success) / 0.12)" : "hsl(var(--warning) / 0.12)"}` }}>
                  <div className="flex items-center gap-3">
                    <UserCheck className="h-4 w-4" style={{ color: isOnline ? "hsl(var(--success))" : "hsl(var(--warning))" }} />
                    <div className="flex-1">
                      <p className="text-[11px] font-bold" style={{ color: "hsl(var(--hud-text))" }}>{d.driver_name || d.name || `Driver ${String(d.id).slice(0, 6)}`}</p>
                      <p className="text-[10px]" style={{ color: "hsl(var(--hud-text-dim) / 0.5)" }}>
                        {d.last_heartbeat_at ? `Dernière activité: ${new Date(d.last_heartbeat_at).toLocaleDateString("fr-FR")}` : ""}
                      </p>
                    </div>
                    <span className="text-[10px] font-bold" style={{ color: isOnline ? "hsl(var(--success))" : "hsl(var(--warning))" }}>
                      {isOnline ? "En ligne" : d.status || "Hors ligne"}
                    </span>
                  </div>
                </div>
              );
            })}
          </motion.div>
        )}

        {tab === "audit" && (
          <motion.div key="audit" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-2">
            <Input placeholder="Rechercher dans les logs…" value={auditSearch} onChange={e => setAuditSearch(e.target.value)}
              className="h-8 text-xs" style={{ background: "hsl(var(--hud-bg))", borderColor: "hsl(var(--hud-border) / 0.12)", color: "hsl(var(--hud-text))" }} />
            {filteredCases.length === 0 && <div style={{ padding: "1rem", textAlign: "center", color: "#888" }}>Aucun log</div>}
            {filteredCases.map((a: any) => {
              const severity = a.severity || a.priority || "info";
              const sevCfg: Record<string, { color: string; bg: string }> = {
                info: { color: "hsl(var(--info))", bg: "hsl(var(--info) / 0.06)" },
                low: { color: "hsl(var(--info))", bg: "hsl(var(--info) / 0.06)" },
                warning: { color: "hsl(var(--warning))", bg: "hsl(var(--warning) / 0.06)" },
                medium: { color: "hsl(var(--warning))", bg: "hsl(var(--warning) / 0.06)" },
                critical: { color: "hsl(var(--destructive))", bg: "hsl(var(--destructive) / 0.06)" },
                high: { color: "hsl(var(--destructive))", bg: "hsl(var(--destructive) / 0.06)" },
              };
              const cfg = sevCfg[severity] || sevCfg.info;
              return (
                <div key={a.id} className="px-3 py-2 rounded-xl" style={{ background: cfg.bg, border: `1px solid ${cfg.color}15` }}>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono" style={{ color: "hsl(var(--hud-text-dim) / 0.4)" }}>
                      {a.created_at ? new Date(a.created_at).toLocaleString("fr-FR", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" }) : ""}
                    </span>
                    <span className="text-[10px] font-semibold" style={{ color: cfg.color }}>{a.actor || "Système"}</span>
                  </div>
                  <p className="text-[10px] font-semibold mt-0.5" style={{ color: "hsl(var(--hud-text))" }}>{a.title || a.action || a.label || ""}</p>
                  <p className="text-[10px]" style={{ color: "hsl(var(--hud-text-dim) / 0.5)" }}>{a.description || a.details || ""}</p>
                </div>
              );
            })}
            <Button size="sm" className="w-full text-xs h-8" variant="outline"
              style={{ borderColor: "hsl(var(--hud-border) / 0.15)", color: "hsl(var(--hud-text-dim))" }}>
              <Download className="h-3 w-3 mr-1" /> Exporter les logs
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
