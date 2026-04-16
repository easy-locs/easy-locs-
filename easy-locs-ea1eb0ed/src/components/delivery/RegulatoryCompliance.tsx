/**
 * RegulatoryCompliance — BBB2. Regulatory Compliance.
 * Transport licenses, vehicle inspections, driver certifications, authority reports, audit trail.
 * PASS103-BBB2
 */
import { useState } from "react";
import { motion } from "framer-motion";
import {
  Scale, FileText, BadgeCheck, AlertTriangle, Calendar,
  Shield, ClipboardCheck, Eye, Clock, Building,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { haptic } from "@/lib/haptics";

interface License {
  id: string;
  type: string;
  number: string;
  issuedBy: string;
  issuedAt: Date;
  expiresAt: Date;
  status: "valid" | "expiring" | "expired" | "suspended";
  holder: string;
}

interface Inspection {
  id: string;
  vehicleName: string;
  type: string;
  date: Date;
  nextDue: Date;
  result: "pass" | "fail" | "conditional";
  inspector: string;
  findings: string[];
}

interface Certification {
  id: string;
  driverName: string;
  certType: string;
  issuedAt: Date;
  expiresAt: Date;
  status: "valid" | "expiring" | "expired";
  score: number;
}

interface AuditEntry {
  id: string;
  date: Date;
  action: string;
  entity: string;
  result: string;
  officer: string;
}

const LICENSES: License[] = [];

const INSPECTIONS: Inspection[] = [];

const CERTIFICATIONS: Certification[] = [];

const AUDIT_TRAIL: AuditEntry[] = [];

export default function RegulatoryCompliance({ orgId, className }: { orgId: string; className?: string }) {
  const [view, setView] = useState<"licenses" | "inspections" | "certifications" | "audit">("licenses");

  const validLicenses = LICENSES.filter(l => l.status === "valid").length;
  const expiringItems = [...LICENSES.filter(l => l.status === "expiring"), ...CERTIFICATIONS.filter(c => c.status === "expiring")].length;
  const expiredItems = [...LICENSES.filter(l => l.status === "expired"), ...CERTIFICATIONS.filter(c => c.status === "expired")].length;
  const passRate = INSPECTIONS.length > 0 ? Math.round((INSPECTIONS.filter(i => i.result === "pass").length / INSPECTIONS.length) * 100) : 0;

  const statusCfg = (s: string) => ({
    valid: { label: "Valide", color: "--success" },
    expiring: { label: "Expire bientôt", color: "--warning" },
    expired: { label: "Expiré", color: "--destructive" },
    suspended: { label: "Suspendu", color: "--destructive" },
    pass: { label: "Conforme", color: "--success" },
    fail: { label: "Non conforme", color: "--destructive" },
    conditional: { label: "Sous réserve", color: "--warning" },
  }[s] || { label: s, color: "--muted-foreground" });

  return (
    <div className={`space-y-3 ${className || ""}`}>
      <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: "hsl(var(--foreground))" }}>
        <Scale className="h-4 w-4" style={{ color: "hsl(var(--primary))" }} />
        Conformité réglementaire
      </h3>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-1.5">
        {[
          { label: "Licences valides", value: validLicenses, color: "--success" },
          { label: "Expire bientôt", value: expiringItems, color: expiringItems > 0 ? "--warning" : "--success" },
          { label: "Expirés", value: expiredItems, color: expiredItems > 0 ? "--destructive" : "--success" },
          { label: "Taux conformité", value: `${passRate}%`, color: passRate >= 80 ? "--success" : "--warning" },
        ].map(k => (
          <div key={k.label} className="rounded-xl px-2 py-2 text-center"
            style={{ background: "hsl(var(--muted) / 0.3)", border: "1px solid hsl(var(--border) / 0.1)" }}>
            <p className="text-sm font-bold" style={{ color: `hsl(var(${k.color}))` }}>{k.value}</p>
            <p className="text-[0.625rem]" style={{ color: "hsl(var(--muted-foreground))" }}>{k.label}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-1 p-1 rounded-xl" style={{ background: "hsl(var(--muted) / 0.3)" }}>
        {(["licenses", "inspections", "certifications", "audit"] as const).map(v => (
          <button key={v} onClick={() => { setView(v); haptic("selection"); }}
            className="flex-1 py-1.5 rounded-lg text-[0.625rem] font-semibold"
            style={{ background: view === v ? "hsl(var(--primary) / 0.1)" : "transparent", color: view === v ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))" }}>
            {v === "licenses" ? "📜 Licences" : v === "inspections" ? "🔍 Inspections" : v === "certifications" ? "🎓 Certif." : "📋 Audit"}
          </button>
        ))}
      </div>

      {view === "licenses" && (
        <div className="space-y-2">
          {LICENSES.map(l => {
            const cfg = statusCfg(l.status);
            return (
              <div key={l.id} className="rounded-xl p-3"
                style={{ background: l.status === "expired" ? "hsl(var(--destructive) / 0.03)" : "hsl(var(--muted) / 0.2)", border: `1px solid ${l.status === "expired" ? "hsl(var(--destructive) / 0.15)" : "hsl(var(--border) / 0.08)"}` }}>
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 shrink-0" style={{ color: `hsl(var(${cfg.color}))` }} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-[0.625rem] font-semibold" style={{ color: "hsl(var(--foreground))" }}>{l.type}</p>
                      <span className="text-[0.625rem] font-bold px-1.5 py-0.5 rounded-full"
                        style={{ background: `hsl(var(${cfg.color}) / 0.1)`, color: `hsl(var(${cfg.color}))` }}>{cfg.label}</span>
                    </div>
                    <p className="text-[0.625rem]" style={{ color: "hsl(var(--muted-foreground))" }}>
                      🔖 {l.number} • 🏛️ {l.issuedBy}
                    </p>
                    <p className="text-[0.625rem]" style={{ color: "hsl(var(--muted-foreground))" }}>
                      📅 {l.issuedAt.toLocaleDateString("fr")} → {l.expiresAt.toLocaleDateString("fr")}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {view === "inspections" && (
        <div className="space-y-2">
          {INSPECTIONS.map(i => {
            const cfg = statusCfg(i.result);
            return (
              <div key={i.id} className="rounded-xl p-3"
                style={{ background: "hsl(var(--muted) / 0.2)", border: "1px solid hsl(var(--border) / 0.08)" }}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <ClipboardCheck className="h-3.5 w-3.5" style={{ color: `hsl(var(${cfg.color}))` }} />
                    <p className="text-[0.625rem] font-semibold" style={{ color: "hsl(var(--foreground))" }}>{i.vehicleName}</p>
                  </div>
                  <span className="text-[0.625rem] font-bold px-1.5 py-0.5 rounded-full"
                    style={{ background: `hsl(var(${cfg.color}) / 0.1)`, color: `hsl(var(${cfg.color}))` }}>{cfg.label}</span>
                </div>
                <p className="text-[0.625rem]" style={{ color: "hsl(var(--muted-foreground))" }}>
                  {i.type} • 🔍 {i.inspector} • 📅 {i.date.toLocaleDateString("fr")}
                </p>
                {i.findings.length > 0 && (
                  <div className="mt-1.5 space-y-0.5">
                    {i.findings.map((f, idx) => (
                      <p key={idx} className="text-[0.625rem] flex items-center gap-1" style={{ color: "hsl(var(--warning))" }}>
                        <AlertTriangle className="h-2.5 w-2.5 shrink-0" /> {f}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {view === "certifications" && (
        <div className="space-y-2">
          {CERTIFICATIONS.map(c => {
            const cfg = statusCfg(c.status);
            return (
              <div key={c.id} className="rounded-xl p-3"
                style={{ background: c.status === "expired" ? "hsl(var(--destructive) / 0.03)" : "hsl(var(--muted) / 0.2)", border: `1px solid ${c.status === "expired" ? "hsl(var(--destructive) / 0.15)" : "hsl(var(--border) / 0.08)"}` }}>
                <div className="flex items-center gap-2">
                  <BadgeCheck className="h-4 w-4 shrink-0" style={{ color: `hsl(var(${cfg.color}))` }} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-[0.625rem] font-semibold" style={{ color: "hsl(var(--foreground))" }}>{c.driverName}</p>
                      <span className="text-[0.625rem] font-bold px-1.5 py-0.5 rounded-full"
                        style={{ background: `hsl(var(${cfg.color}) / 0.1)`, color: `hsl(var(${cfg.color}))` }}>{cfg.label}</span>
                    </div>
                    <p className="text-[0.625rem]" style={{ color: "hsl(var(--muted-foreground))" }}>
                      🎓 {c.certType} • 📅 Expire: {c.expiresAt.toLocaleDateString("fr")}
                    </p>
                  </div>
                  <p className="text-[0.6875rem] font-bold shrink-0" style={{ color: c.score >= 90 ? "hsl(var(--success))" : "hsl(var(--warning))" }}>
                    {c.score}/100
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {view === "audit" && (
        <div className="space-y-2">
          {AUDIT_TRAIL.map(a => (
            <div key={a.id} className="rounded-xl p-3 flex items-center gap-3"
              style={{ background: "hsl(var(--muted) / 0.2)", border: "1px solid hsl(var(--border) / 0.08)" }}>
              <Eye className="h-4 w-4 shrink-0" style={{ color: "hsl(var(--info))" }} />
              <div className="flex-1 min-w-0">
                <p className="text-[0.625rem] font-semibold" style={{ color: "hsl(var(--foreground))" }}>{a.action}</p>
                <p className="text-[0.625rem]" style={{ color: "hsl(var(--muted-foreground))" }}>
                  📋 {a.entity} • 👤 {a.officer} • 📅 {a.date.toLocaleDateString("fr")}
                </p>
              </div>
              <span className="text-[0.625rem] font-bold shrink-0" style={{ color: a.result === "Approuvé" || a.result === "Validé" || a.result === "Soumis" ? "hsl(var(--success))" : "hsl(var(--warning))" }}>
                {a.result}
              </span>
            </div>
          ))}
          <Button size="sm" className="w-full text-[0.625rem] h-8" variant="outline"
            onClick={() => { haptic("medium"); toast.success("Rapport de conformité Q1-2026 généré"); }}
            style={{ borderColor: "hsl(var(--border) / 0.2)", color: "hsl(var(--primary))" }}>
            <FileText className="h-3 w-3 mr-1" /> Générer rapport autorités
          </Button>
        </div>
      )}
    </div>
  );
}
