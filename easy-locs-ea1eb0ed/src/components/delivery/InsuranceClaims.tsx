/**
 * InsuranceClaims — ZZZ. Insurance & Claims.
 * Auto-subscription, claims filing, reimbursement workflow, insurer partners.
 * PASS103-ZZZ
 */
import { useState } from "react";
import { motion } from "framer-motion";
import {
  Shield, FileText, AlertTriangle, CheckCircle2, Clock,
  DollarSign, Upload, RefreshCw, Users, Umbrella,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { haptic } from "@/lib/haptics";

interface Policy {
  id: string;
  name: string;
  provider: string;
  coverage: string;
  maxAmount: number;
  premium: number;
  currency: string;
  status: "active" | "expired" | "pending";
  autoRenew: boolean;
  coveredItems: string[];
}

interface Claim {
  id: string;
  policyId: string;
  type: string;
  description: string;
  amount: number;
  currency: string;
  status: "filed" | "under_review" | "approved" | "rejected" | "paid";
  filedAt: Date;
  resolvedAt: Date | null;
  evidence: string[];
  jobId: string;
}

interface Insurer {
  name: string;
  rating: number;
  claimSpeed: number;
  approvalRate: number;
  activePolicies: number;
}

const POLICIES: Policy[] = [];

const CLAIMS: Claim[] = [];

const INSURERS: Insurer[] = [];

export default function InsuranceClaims({ orgId, className }: { orgId: string; className?: string }) {
  const [view, setView] = useState<"policies" | "claims" | "insurers">("policies");

  const activePolicies = POLICIES.filter(p => p.status === "active").length;
  const pendingClaims = CLAIMS.filter(c => ["filed", "under_review"].includes(c.status)).length;
  const totalClaimed = CLAIMS.reduce((s, c) => s + c.amount, 0);
  const totalPremium = POLICIES.filter(p => p.status === "active").reduce((s, p) => s + p.premium, 0);
  const fmt = (n: number) => n >= 1000000 ? `${(n / 1000000).toFixed(1)}M` : `${(n / 1000).toFixed(0)}k`;

  const claimStatusCfg = (s: string) => ({
    filed: { label: "Déposée", color: "--info", icon: "📋" },
    under_review: { label: "En examen", color: "--warning", icon: "🔍" },
    approved: { label: "Approuvée", color: "--success", icon: "✅" },
    rejected: { label: "Rejetée", color: "--destructive", icon: "❌" },
    paid: { label: "Remboursée", color: "--success", icon: "💰" },
  }[s] || { label: s, color: "--muted-foreground", icon: "❓" });

  return (
    <div className={`space-y-3 ${className || ""}`}>
      <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: "hsl(var(--foreground))" }}>
        <Umbrella className="h-4 w-4" style={{ color: "hsl(var(--warning))" }} />
        Assurance & Réclamations
      </h3>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-1.5">
        {[
          { label: "Polices actives", value: activePolicies, color: "--success" },
          { label: "Réclamations", value: pendingClaims, color: pendingClaims > 0 ? "--warning" : "--success" },
          { label: "Montant réclamé", value: `${fmt(totalClaimed)} F`, color: "--info" },
          { label: "Primes/mois", value: `${fmt(totalPremium)} F`, color: "--primary" },
        ].map(k => (
          <div key={k.label} className="rounded-xl px-2 py-2 text-center"
            style={{ background: "hsl(var(--muted) / 0.3)", border: "1px solid hsl(var(--border) / 0.1)" }}>
            <p className="text-sm font-bold" style={{ color: `hsl(var(${k.color}))` }}>{k.value}</p>
            <p className="text-[0.625rem]" style={{ color: "hsl(var(--muted-foreground))" }}>{k.label}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-1 p-1 rounded-xl" style={{ background: "hsl(var(--muted) / 0.3)" }}>
        {(["policies", "claims", "insurers"] as const).map(v => (
          <button key={v} onClick={() => { setView(v); haptic("selection"); }}
            className="flex-1 py-1.5 rounded-lg text-[0.625rem] font-semibold"
            style={{ background: view === v ? "hsl(var(--primary) / 0.1)" : "transparent", color: view === v ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))" }}>
            {v === "policies" ? "🛡️ Polices" : v === "claims" ? "📋 Réclamations" : "🏢 Assureurs"}
          </button>
        ))}
      </div>

      {view === "policies" && (
        <div className="space-y-2">
          {POLICIES.map(p => (
            <div key={p.id} className="rounded-xl p-3"
              style={{ background: "hsl(var(--muted) / 0.2)", border: "1px solid hsl(var(--border) / 0.08)" }}>
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 shrink-0" style={{ color: p.status === "active" ? "hsl(var(--success))" : "hsl(var(--warning))" }} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-[0.625rem] font-semibold" style={{ color: "hsl(var(--foreground))" }}>{p.name}</p>
                    <span className="text-[0.625rem] font-bold px-1.5 py-0.5 rounded-full"
                      style={{ background: p.status === "active" ? "hsl(var(--success) / 0.1)" : "hsl(var(--warning) / 0.1)", color: p.status === "active" ? "hsl(var(--success))" : "hsl(var(--warning))" }}>
                      {p.status === "active" ? "Actif" : p.status === "pending" ? "En attente" : "Expiré"}
                    </span>
                  </div>
                  <p className="text-[0.625rem]" style={{ color: "hsl(var(--muted-foreground))" }}>
                    🏢 {p.provider} • 💰 Max {fmt(p.maxAmount)} F • 🔄 {p.autoRenew ? "Auto-renouvellement" : "Manuel"}
                  </p>
                  <p className="text-[0.625rem] mt-0.5" style={{ color: "hsl(var(--muted-foreground))" }}>
                    📋 {p.coveredItems.join(", ")}
                  </p>
                </div>
                <p className="text-[0.625rem] font-bold shrink-0" style={{ color: "hsl(var(--primary))" }}>{fmt(p.premium)} F/m</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {view === "claims" && (
        <div className="space-y-2">
          {CLAIMS.map(c => {
            const cfg = claimStatusCfg(c.status);
            return (
              <div key={c.id} className="rounded-xl p-3"
                style={{ background: c.status === "rejected" ? "hsl(var(--destructive) / 0.03)" : "hsl(var(--muted) / 0.2)", border: `1px solid ${c.status === "rejected" ? "hsl(var(--destructive) / 0.15)" : "hsl(var(--border) / 0.08)"}` }}>
                <div className="flex items-start gap-2">
                  <span className="text-base">{cfg.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-[0.625rem] font-semibold" style={{ color: "hsl(var(--foreground))" }}>{c.type}</p>
                      <span className="text-[0.625rem] font-bold px-1.5 py-0.5 rounded-full"
                        style={{ background: `hsl(var(${cfg.color}) / 0.1)`, color: `hsl(var(${cfg.color}))` }}>{cfg.label}</span>
                    </div>
                    <p className="text-[0.625rem]" style={{ color: "hsl(var(--muted-foreground))" }}>{c.description}</p>
                    <p className="text-[0.625rem] mt-0.5" style={{ color: "hsl(var(--muted-foreground))" }}>
                      📎 {c.evidence.length} pièce(s) • 🔖 {c.jobId}
                    </p>
                  </div>
                  <p className="text-[0.625rem] font-bold shrink-0" style={{ color: `hsl(var(${cfg.color}))` }}>{c.amount.toLocaleString()} F</p>
                </div>
              </div>
            );
          })}
          <Button size="sm" className="w-full text-[0.625rem] h-8" variant="outline"
            onClick={() => { haptic("medium"); toast("Formulaire de réclamation ouvert"); }}
            style={{ borderColor: "hsl(var(--border) / 0.2)", color: "hsl(var(--warning))" }}>
            <Upload className="h-3 w-3 mr-1" /> Déposer une réclamation
          </Button>
        </div>
      )}

      {view === "insurers" && (
        <div className="space-y-2">
          {INSURERS.map(i => (
            <div key={i.name} className="rounded-xl p-3" style={{ background: "hsl(var(--muted) / 0.2)", border: "1px solid hsl(var(--border) / 0.08)" }}>
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-[0.625rem] font-semibold" style={{ color: "hsl(var(--foreground))" }}>{i.name}</p>
                <span className="text-[0.625rem] font-bold" style={{ color: "hsl(var(--warning))" }}>⭐ {i.rating}</span>
              </div>
              <p className="text-[0.625rem]" style={{ color: "hsl(var(--muted-foreground))" }}>
                ⏱️ ~{i.claimSpeed}j traitement • ✅ {i.approvalRate}% approbation • 📋 {i.activePolicies} police(s)
              </p>
              <div className="h-1.5 rounded-full mt-1.5 overflow-hidden" style={{ background: "hsl(var(--muted) / 0.5)" }}>
                <motion.div initial={{ width: 0 }} animate={{ width: `${i.approvalRate}%` }}
                  className="h-full rounded-full" style={{ background: i.approvalRate >= 85 ? "hsl(var(--success))" : "hsl(var(--warning))" }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
