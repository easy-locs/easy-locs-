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

interface ComplianceCheck {
  id: string;
  category: "gdpr" | "identity" | "vehicle" | "insurance" | "background";
  label: string;
  status: "compliant" | "warning" | "non_compliant" | "pending";
  lastChecked: string;
  details: string;
  affectedCount?: number;
}

interface AuditLogEntry {
  id: string;
  timestamp: string;
  actor: string;
  action: string;
  target: string;
  severity: "info" | "warning" | "critical";
  ip?: string;
}

interface DriverVerification {
  id: string;
  name: string;
  idVerified: boolean;
  licenseVerified: boolean;
  insuranceVerified: boolean;
  backgroundCheck: "passed" | "pending" | "failed";
  lastVerified: string;
}

const MOCK_CHECKS: ComplianceCheck[] = [
  { id: "c1", category: "gdpr", label: "Consentement données personnelles", status: "compliant", lastChecked: "2026-03-15", details: "Tous les utilisateurs ont accepté la politique de confidentialité", affectedCount: 0 },
  { id: "c2", category: "gdpr", label: "Droit à l'oubli", status: "compliant", lastChecked: "2026-03-15", details: "3 demandes traitées ce mois, délai moyen 24h", affectedCount: 3 },
  { id: "c3", category: "gdpr", label: "Export de données", status: "compliant", lastChecked: "2026-03-14", details: "Fonctionnalité active et testée" },
  { id: "c4", category: "identity", label: "Vérification pièce d'identité", status: "warning", lastChecked: "2026-03-15", details: "2 chauffeurs en attente de vérification", affectedCount: 2 },
  { id: "c5", category: "vehicle", label: "Documents véhicules", status: "non_compliant", lastChecked: "2026-03-15", details: "1 carte grise expirée détectée", affectedCount: 1 },
  { id: "c6", category: "insurance", label: "Assurances professionnelles", status: "compliant", lastChecked: "2026-03-14", details: "Toutes les assurances sont à jour" },
  { id: "c7", category: "background", label: "Casier judiciaire", status: "pending", lastChecked: "2026-03-10", details: "1 vérification en cours", affectedCount: 1 },
];

const MOCK_AUDIT: AuditLogEntry[] = [
  { id: "a1", timestamp: "2026-03-16T10:30:00Z", actor: "Système", action: "Vérification auto identité", target: "Mohamed K.", severity: "info" },
  { id: "a2", timestamp: "2026-03-16T09:15:00Z", actor: "Admin", action: "Export données RGPD", target: "Client #4521", severity: "info" },
  { id: "a3", timestamp: "2026-03-15T22:00:00Z", actor: "Système", action: "Document véhicule expiré", target: "IJ-789-KL", severity: "warning" },
  { id: "a4", timestamp: "2026-03-15T18:30:00Z", actor: "Admin", action: "Désactivation chauffeur", target: "Lucas M.", severity: "critical", ip: "192.168.1.42" },
  { id: "a5", timestamp: "2026-03-15T14:00:00Z", actor: "Système", action: "Scan compliance quotidien", target: "Flotte complète", severity: "info" },
  { id: "a6", timestamp: "2026-03-14T11:45:00Z", actor: "Admin", action: "Validation identité", target: "Sophie L.", severity: "info" },
];

const MOCK_DRIVERS: DriverVerification[] = [
  { id: "d1", name: "Mohamed K.", idVerified: true, licenseVerified: true, insuranceVerified: true, backgroundCheck: "passed", lastVerified: "2026-03-10" },
  { id: "d2", name: "Sophie L.", idVerified: true, licenseVerified: true, insuranceVerified: true, backgroundCheck: "passed", lastVerified: "2026-03-14" },
  { id: "d3", name: "Ali B.", idVerified: true, licenseVerified: false, insuranceVerified: true, backgroundCheck: "pending", lastVerified: "2026-03-05" },
  { id: "d4", name: "Lucas M.", idVerified: false, licenseVerified: false, insuranceVerified: false, backgroundCheck: "failed", lastVerified: "2026-02-28" },
];

export default function ComplianceDashboard({ orgId }: { orgId: string }) {
  const [tab, setTab] = useState<"overview" | "drivers" | "audit">("overview");
  const [auditSearch, setAuditSearch] = useState("");

  const score = useMemo(() => {
    const total = MOCK_CHECKS.length;
    const compliant = MOCK_CHECKS.filter(c => c.status === "compliant").length;
    return Math.round((compliant / total) * 100);
  }, []);

  const statusCfg: Record<string, { color: string; label: string; emoji: string }> = {
    compliant: { color: "hsl(var(--success))", label: "Conforme", emoji: "✅" },
    warning: { color: "hsl(var(--warning))", label: "Attention", emoji: "⚠️" },
    non_compliant: { color: "hsl(var(--destructive))", label: "Non conforme", emoji: "❌" },
    pending: { color: "hsl(var(--info))", label: "En cours", emoji: "⏳" },
  };

  const filteredAudit = MOCK_AUDIT.filter(a =>
    a.action.toLowerCase().includes(auditSearch.toLowerCase()) ||
    a.target.toLowerCase().includes(auditSearch.toLowerCase())
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Shield className="h-4 w-4" style={{ color: "hsl(var(--success))" }} />
        <h3 className="text-sm font-bold" style={{ color: "hsl(var(--hud-text))" }}>Compliance</h3>
        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{
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
              <p className="text-3xl font-black" style={{ color: score >= 80 ? "hsl(var(--success))" : "hsl(var(--warning))" }}>{score}%</p>
              <p className="text-[10px]" style={{ color: "hsl(var(--hud-text-dim) / 0.5)" }}>Score de conformité global</p>
            </div>

            {/* Checks */}
            {MOCK_CHECKS.map(c => {
              const cfg = statusCfg[c.status];
              return (
                <div key={c.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
                  style={{ background: "hsl(var(--hud-surface))", border: `1px solid ${cfg.color}15` }}>
                  <span className="text-sm">{cfg.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-semibold" style={{ color: "hsl(var(--hud-text))" }}>{c.label}</p>
                    <p className="text-[8px]" style={{ color: "hsl(var(--hud-text-dim) / 0.5)" }}>{c.details}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-[9px] font-semibold" style={{ color: cfg.color }}>{cfg.label}</span>
                    {c.affectedCount != null && c.affectedCount > 0 && (
                      <p className="text-[8px]" style={{ color: cfg.color }}>{c.affectedCount} concerné{c.affectedCount > 1 ? "s" : ""}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </motion.div>
        )}

        {tab === "drivers" && (
          <motion.div key="drivers" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-2">
            {MOCK_DRIVERS.map(d => {
              const checks = [d.idVerified, d.licenseVerified, d.insuranceVerified, d.backgroundCheck === "passed"];
              const passed = checks.filter(Boolean).length;
              const total = checks.length;
              const allGood = passed === total;
              return (
                <div key={d.id} className="rounded-xl p-3 space-y-2" style={{ background: "hsl(var(--hud-surface))", border: `1px solid ${allGood ? "hsl(var(--success) / 0.12)" : "hsl(var(--warning) / 0.12)"}` }}>
                  <div className="flex items-center gap-3">
                    <UserCheck className="h-4 w-4" style={{ color: allGood ? "hsl(var(--success))" : "hsl(var(--warning))" }} />
                    <div className="flex-1">
                      <p className="text-[11px] font-bold" style={{ color: "hsl(var(--hud-text))" }}>{d.name}</p>
                      <p className="text-[9px]" style={{ color: "hsl(var(--hud-text-dim) / 0.5)" }}>Dernière vérif: {d.lastVerified}</p>
                    </div>
                    <span className="text-[10px] font-bold" style={{ color: allGood ? "hsl(var(--success))" : "hsl(var(--warning))" }}>
                      {passed}/{total}
                    </span>
                  </div>
                  <div className="grid grid-cols-4 gap-1">
                    {[
                      { label: "ID", ok: d.idVerified },
                      { label: "Permis", ok: d.licenseVerified },
                      { label: "Assurance", ok: d.insuranceVerified },
                      { label: "Casier", ok: d.backgroundCheck === "passed" },
                    ].map(item => (
                      <div key={item.label} className="text-center py-1 rounded-md" style={{ background: "hsl(var(--hud-bg))" }}>
                        <p className="text-[9px]">{item.ok ? "✅" : d.backgroundCheck === "pending" && item.label === "Casier" ? "⏳" : "❌"}</p>
                        <p className="text-[8px]" style={{ color: "hsl(var(--hud-text-dim) / 0.5)" }}>{item.label}</p>
                      </div>
                    ))}
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
            {filteredAudit.map(a => {
              const sevCfg: Record<string, { color: string; bg: string }> = {
                info: { color: "hsl(var(--info))", bg: "hsl(var(--info) / 0.06)" },
                warning: { color: "hsl(var(--warning))", bg: "hsl(var(--warning) / 0.06)" },
                critical: { color: "hsl(var(--destructive))", bg: "hsl(var(--destructive) / 0.06)" },
              };
              const cfg = sevCfg[a.severity];
              return (
                <div key={a.id} className="px-3 py-2 rounded-xl" style={{ background: cfg.bg, border: `1px solid ${cfg.color}15` }}>
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-mono" style={{ color: "hsl(var(--hud-text-dim) / 0.4)" }}>
                      {new Date(a.timestamp).toLocaleString("fr-FR", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" })}
                    </span>
                    <span className="text-[9px] font-semibold" style={{ color: cfg.color }}>{a.actor}</span>
                  </div>
                  <p className="text-[10px] font-semibold mt-0.5" style={{ color: "hsl(var(--hud-text))" }}>{a.action}</p>
                  <p className="text-[9px]" style={{ color: "hsl(var(--hud-text-dim) / 0.5)" }}>Cible: {a.target}</p>
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
