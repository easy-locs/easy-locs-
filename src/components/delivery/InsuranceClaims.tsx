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

const POLICIES: Policy[] = [
  { id: "p1", name: "Protection Colis Standard", provider: "AXA Assurance", coverage: "Dommage, perte, vol", maxAmount: 500000, premium: 15000, currency: "XOF", status: "active", autoRenew: true, coveredItems: ["Colis < 20kg", "Fragile", "Électronique"] },
  { id: "p2", name: "Assurance Flotte", provider: "Allianz Sénégal", coverage: "Accident véhicule, tiers", maxAmount: 5000000, premium: 85000, currency: "XOF", status: "active", autoRenew: true, coveredItems: ["Scooters", "Vélos cargo", "Vans"] },
  { id: "p3", name: "Responsabilité Civile Pro", provider: "NSIA Assurance", coverage: "RC professionnelle", maxAmount: 10000000, premium: 120000, currency: "XOF", status: "active", autoRenew: false, coveredItems: ["Blessure tiers", "Dommage propriété"] },
  { id: "p4", name: "Protection Premium", provider: "AXA Assurance", coverage: "Tous risques", maxAmount: 2000000, premium: 45000, currency: "XOF", status: "pending", autoRenew: true, coveredItems: ["Haute valeur", "International", "Express"] },
];

const CLAIMS: Claim[] = [
  { id: "c1", policyId: "p1", type: "Dommage colis", description: "Colis électronique endommagé pendant transport", amount: 125000, currency: "XOF", status: "approved", filedAt: new Date(Date.now() - 604800000), resolvedAt: new Date(Date.now() - 172800000), evidence: ["photo_damage.jpg", "receipt.pdf"], jobId: "job-847" },
  { id: "c2", policyId: "p2", type: "Accident véhicule", description: "Scooter EV-01 collision mineure", amount: 350000, currency: "XOF", status: "under_review", filedAt: new Date(Date.now() - 259200000), resolvedAt: null, evidence: ["photo_scooter.jpg", "police_report.pdf"], jobId: "job-839" },
  { id: "c3", policyId: "p1", type: "Perte colis", description: "Colis non livré — introuvable", amount: 78000, currency: "XOF", status: "paid", filedAt: new Date(Date.now() - 1209600000), resolvedAt: new Date(Date.now() - 864000000), evidence: ["tracking_log.pdf"], jobId: "job-812" },
  { id: "c4", policyId: "p3", type: "Dommage tiers", description: "Chute produit sur client", amount: 50000, currency: "XOF", status: "rejected", filedAt: new Date(Date.now() - 1814400000), resolvedAt: new Date(Date.now() - 1728000000), evidence: ["photo.jpg"], jobId: "job-798" },
];

const INSURERS: Insurer[] = [
  { name: "AXA Assurance", rating: 4.5, claimSpeed: 5, approvalRate: 87, activePolicies: 2 },
  { name: "Allianz Sénégal", rating: 4.2, claimSpeed: 7, approvalRate: 82, activePolicies: 1 },
  { name: "NSIA Assurance", rating: 4.0, claimSpeed: 10, approvalRate: 78, activePolicies: 1 },
];

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

      <div className="grid grid-cols-4 gap-1.5">
        {[
          { label: "Polices actives", value: activePolicies, color: "--success" },
          { label: "Réclamations", value: pendingClaims, color: pendingClaims > 0 ? "--warning" : "--success" },
          { label: "Montant réclamé", value: `${fmt(totalClaimed)} F`, color: "--info" },
          { label: "Primes/mois", value: `${fmt(totalPremium)} F`, color: "--primary" },
        ].map(k => (
          <div key={k.label} className="rounded-xl px-2 py-2 text-center"
            style={{ background: "hsl(var(--muted) / 0.3)", border: "1px solid hsl(var(--border) / 0.1)" }}>
            <p className="text-sm font-bold" style={{ color: `hsl(var(${k.color}))` }}>{k.value}</p>
            <p className="text-[7px]" style={{ color: "hsl(var(--muted-foreground))" }}>{k.label}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-1 p-1 rounded-xl" style={{ background: "hsl(var(--muted) / 0.3)" }}>
        {(["policies", "claims", "insurers"] as const).map(v => (
          <button key={v} onClick={() => { setView(v); haptic("selection"); }}
            className="flex-1 py-1.5 rounded-lg text-[9px] font-semibold"
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
                    <p className="text-[10px] font-semibold" style={{ color: "hsl(var(--foreground))" }}>{p.name}</p>
                    <span className="text-[7px] font-bold px-1.5 py-0.5 rounded-full"
                      style={{ background: p.status === "active" ? "hsl(var(--success) / 0.1)" : "hsl(var(--warning) / 0.1)", color: p.status === "active" ? "hsl(var(--success))" : "hsl(var(--warning))" }}>
                      {p.status === "active" ? "Actif" : p.status === "pending" ? "En attente" : "Expiré"}
                    </span>
                  </div>
                  <p className="text-[8px]" style={{ color: "hsl(var(--muted-foreground))" }}>
                    🏢 {p.provider} • 💰 Max {fmt(p.maxAmount)} F • 🔄 {p.autoRenew ? "Auto-renouvellement" : "Manuel"}
                  </p>
                  <p className="text-[7px] mt-0.5" style={{ color: "hsl(var(--muted-foreground))" }}>
                    📋 {p.coveredItems.join(", ")}
                  </p>
                </div>
                <p className="text-[10px] font-bold shrink-0" style={{ color: "hsl(var(--primary))" }}>{fmt(p.premium)} F/m</p>
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
                      <p className="text-[10px] font-semibold" style={{ color: "hsl(var(--foreground))" }}>{c.type}</p>
                      <span className="text-[7px] font-bold px-1.5 py-0.5 rounded-full"
                        style={{ background: `hsl(var(${cfg.color}) / 0.1)`, color: `hsl(var(${cfg.color}))` }}>{cfg.label}</span>
                    </div>
                    <p className="text-[8px]" style={{ color: "hsl(var(--muted-foreground))" }}>{c.description}</p>
                    <p className="text-[7px] mt-0.5" style={{ color: "hsl(var(--muted-foreground))" }}>
                      📎 {c.evidence.length} pièce(s) • 🔖 {c.jobId}
                    </p>
                  </div>
                  <p className="text-[10px] font-bold shrink-0" style={{ color: `hsl(var(${cfg.color}))` }}>{c.amount.toLocaleString()} F</p>
                </div>
              </div>
            );
          })}
          <Button size="sm" className="w-full text-[10px] h-8" variant="outline"
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
                <p className="text-[10px] font-semibold" style={{ color: "hsl(var(--foreground))" }}>{i.name}</p>
                <span className="text-[9px] font-bold" style={{ color: "hsl(var(--warning))" }}>⭐ {i.rating}</span>
              </div>
              <p className="text-[8px]" style={{ color: "hsl(var(--muted-foreground))" }}>
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
