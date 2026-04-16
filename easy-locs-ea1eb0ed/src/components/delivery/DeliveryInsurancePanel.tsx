/**
 * DeliveryInsurancePanel — Delivery insurance system.
 * Value declaration, coverage tiers, claims management.
 * PASS87-OO: Delivery Insurance
 */
import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Shield, AlertTriangle, FileText, CheckCircle2, Clock, DollarSign, Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { haptic } from "@/lib/haptics";
import { toast } from "sonner";
import { useMobilityJobsDashboard, type MobilityJobRow } from "@/hooks/useDeliveryData";

interface InsuranceTier {
  id: string;
  name: string;
  emoji: string;
  maxCoverage: number;
  premiumPercent: number;
  deductible: number;
  features: string[];
}

interface InsuranceClaim {
  id: string;
  jobId: string;
  tier: string;
  declaredValue: number;
  claimAmount: number;
  reason: string;
  description: string;
  status: "pending" | "reviewing" | "approved" | "rejected" | "paid";
  createdAt: string;
}

const TIERS: InsuranceTier[] = [
  { id: "basic", name: "Basique", emoji: "🛡️", maxCoverage: 50000, premiumPercent: 2, deductible: 2000, features: ["Colis < 50 000 FCFA", "Délai 48h", "Support email"] },
  { id: "standard", name: "Standard", emoji: "🔰", maxCoverage: 200000, premiumPercent: 3.5, deductible: 5000, features: ["Colis < 200 000 FCFA", "Délai 24h", "Support chat", "Photo preuve"] },
  { id: "premium", name: "Premium", emoji: "💎", maxCoverage: 1000000, premiumPercent: 5, deductible: 10000, features: ["Colis < 1 000 000 FCFA", "Délai 12h", "Support prioritaire", "Suivi GPS", "Remboursement express"] },
  { id: "enterprise", name: "Entreprise", emoji: "🏢", maxCoverage: 5000000, premiumPercent: 4, deductible: 25000, features: ["Colis < 5 000 000 FCFA", "Délai 6h", "Conciergerie dédiée", "Assurance multi-colis", "Audit mensuel", "SLA garanti"] },
];

export default function DeliveryInsurancePanel({ orgId }: { orgId: string }) {
  const { data: jobs = [], isLoading } = useMobilityJobsDashboard(orgId);
  const [selectedTier, setSelectedTier] = useState<string | null>(null);
  const [declaredValue, setDeclaredValue] = useState(0);
  const [showClaimForm, setShowClaimForm] = useState(false);
  const [claims, setClaims] = useState<InsuranceClaim[]>([]);
  const [claimForm, setClaimForm] = useState({ jobId: "", reason: "damaged", description: "", amount: 0 });

  const recentJobs = useMemo(() =>
    jobs.filter((j: MobilityJobRow) => j.status === "completed" || j.status === "cancelled").slice(0, 20),
    [jobs]
  );

  const tier = TIERS.find(t => t.id === selectedTier);
  const premium = tier ? (declaredValue * tier.premiumPercent) / 100 : 0;
  const maxPayout = tier ? Math.min(declaredValue, tier.maxCoverage) - tier.deductible : 0;

  const stats = useMemo(() => ({
    total: claims.length,
    pending: claims.filter(c => c.status === "pending" || c.status === "reviewing").length,
    approved: claims.filter(c => c.status === "approved" || c.status === "paid").length,
    totalClaimed: claims.reduce((s, c) => s + c.claimAmount, 0),
  }), [claims]);

  const submitClaim = () => {
    if (!claimForm.jobId || !claimForm.description) { toast.error("Remplissez tous les champs"); return; }
    haptic("medium");
    setClaims(prev => [{
      id: `c-${Date.now()}`, jobId: claimForm.jobId, tier: selectedTier || "basic",
      declaredValue: claimForm.amount, claimAmount: claimForm.amount,
      reason: claimForm.reason, description: claimForm.description,
      status: "pending", createdAt: new Date().toISOString(),
    }, ...prev]);
    setShowClaimForm(false);
    setClaimForm({ jobId: "", reason: "damaged", description: "", amount: 0 });
    toast.success("Réclamation soumise");
  };

  const statusConfig: Record<string, { label: string; color: string; emoji: string }> = {
    pending: { label: "En attente", color: "hsl(var(--warning))", emoji: "⏳" },
    reviewing: { label: "En examen", color: "hsl(var(--info))", emoji: "🔍" },
    approved: { label: "Approuvée", color: "hsl(var(--success))", emoji: "✅" },
    rejected: { label: "Refusée", color: "hsl(var(--destructive))", emoji: "❌" },
    paid: { label: "Payée", color: "hsl(var(--hud-cyan))", emoji: "💰" },
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin" style={{ color: "hsl(var(--hud-cyan))" }} />
        <span className="ml-2 text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>Chargement assurance…</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Shield className="w-4 h-4" style={{ color: "hsl(var(--hud-cyan))" }} />
        <h3 className="text-sm font-bold" style={{ color: "hsl(var(--hud-text))" }}>Assurance livraison</h3>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {[
          { label: "Réclamations", value: stats.total, color: "--info" },
          { label: "En cours", value: stats.pending, color: "--warning" },
          { label: "Approuvées", value: stats.approved, color: "--success" },
          { label: "Total réclamé", value: `${stats.totalClaimed} F`, color: "--hud-cyan" },
        ].map(s => (
          <div key={s.label} className="rounded-xl px-2 py-2 text-center"
            style={{ background: "hsl(var(--hud-surface))", border: "1px solid hsl(var(--hud-border) / 0.08)" }}>
            <p className="text-sm font-bold" style={{ color: `hsl(var(${s.color}))` }}>{s.value}</p>
            <p className="text-[10px]" style={{ color: "hsl(var(--hud-text-dim) / 0.4)" }}>{s.label}</p>
          </div>
        ))}
      </div>

      <div className="space-y-2">
        <p className="text-[10px] font-semibold" style={{ color: "hsl(var(--hud-text-dim))" }}>Niveaux de couverture</p>
        {TIERS.map((t, i) => (
          <motion.button key={t.id}
            initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            onClick={() => { setSelectedTier(selectedTier === t.id ? null : t.id); haptic("selection"); }}
            className="w-full text-left rounded-xl p-3 transition-all"
            style={{
              background: selectedTier === t.id ? "hsl(var(--hud-cyan) / 0.06)" : "hsl(var(--hud-surface))",
              border: `1px solid ${selectedTier === t.id ? "hsl(var(--hud-cyan) / 0.2)" : "hsl(var(--hud-border) / 0.08)"}`,
            }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-base">{t.emoji}</span>
                <div>
                  <p className="text-xs font-bold" style={{ color: "hsl(var(--hud-text))" }}>{t.name}</p>
                  <p className="text-[10px]" style={{ color: "hsl(var(--hud-text-dim))" }}>
                    Max {t.maxCoverage.toLocaleString()} F • {t.premiumPercent}% prime • {t.deductible.toLocaleString()} F franchise
                  </p>
                </div>
              </div>
              <div className="w-4 h-4 rounded-full border-2 flex items-center justify-center"
                style={{ borderColor: selectedTier === t.id ? "hsl(var(--hud-cyan))" : "hsl(var(--hud-border) / 0.2)" }}>
                {selectedTier === t.id && <div className="w-2 h-2 rounded-full" style={{ background: "hsl(var(--hud-cyan))" }} />}
              </div>
            </div>
            <div className="flex flex-wrap gap-1 mt-2">
              {t.features.map(f => (
                <span key={f} className="text-[10px] px-1.5 py-0.5 rounded-full"
                  style={{ background: "hsl(var(--hud-bg))", color: "hsl(var(--hud-text-dim))" }}>{f}</span>
              ))}
            </div>
          </motion.button>
        ))}
      </div>

      {selectedTier && tier && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-xl p-3 space-y-2" style={{ background: "hsl(var(--hud-surface))", border: "1px solid hsl(var(--hud-cyan) / 0.1)" }}>
          <p className="text-[10px] font-semibold" style={{ color: "hsl(var(--hud-text-dim))" }}>Calculateur de prime</p>
          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <Label className="text-[10px]" style={{ color: "hsl(var(--hud-text-dim))" }}>Valeur déclarée (FCFA)</Label>
              <Input type="number" value={declaredValue} onChange={e => setDeclaredValue(+e.target.value)}
                className="h-8 text-xs" style={{ background: "hsl(var(--hud-bg))", color: "hsl(var(--hud-text))", borderColor: "hsl(var(--hud-border) / 0.15)" }} />
            </div>
            <div className="text-right pb-1">
              <p className="text-[10px]" style={{ color: "hsl(var(--hud-text-dim))" }}>Prime</p>
              <p className="text-sm font-bold" style={{ color: "hsl(var(--hud-cyan))" }}>{premium.toFixed(0)} F</p>
            </div>
          </div>
          {declaredValue > 0 && (
            <div className="flex justify-between text-[10px] pt-1" style={{ borderTop: "1px solid hsl(var(--hud-border) / 0.08)" }}>
              <span style={{ color: "hsl(var(--hud-text-dim))" }}>Payout max (après franchise)</span>
              <span className="font-bold" style={{ color: "hsl(var(--success))" }}>{Math.max(0, maxPayout).toLocaleString()} F</span>
            </div>
          )}
        </motion.div>
      )}

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-semibold" style={{ color: "hsl(var(--hud-text-dim))" }}>Réclamations</p>
          <Button size="sm" className="text-[10px] h-6 px-2" onClick={() => setShowClaimForm(!showClaimForm)}
            style={{ background: "hsl(var(--warning) / 0.1)", color: "hsl(var(--warning))" }}>
            <Plus className="w-2.5 h-2.5 mr-0.5" /> Déclarer
          </Button>
        </div>

        {showClaimForm && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            className="rounded-xl p-3 space-y-2" style={{ background: "hsl(var(--hud-surface))", border: "1px solid hsl(var(--warning) / 0.15)" }}>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-[10px]" style={{ color: "hsl(var(--hud-text-dim))" }}>ID Mission</Label>
                {recentJobs.length > 0 ? (
                  <select value={claimForm.jobId} onChange={e => setClaimForm(p => ({ ...p, jobId: e.target.value }))}
                    className="w-full h-7 text-[10px] rounded-md px-2" style={{ background: "hsl(var(--hud-bg))", color: "hsl(var(--hud-text))", border: "1px solid hsl(var(--hud-border) / 0.15)" }}>
                    <option value="">Sélectionner…</option>
                    {recentJobs.map((j: MobilityJobRow) => (
                      <option key={j.id} value={j.id}>{String(j.id).slice(0, 8)} — {j.status}</option>
                    ))}
                  </select>
                ) : (
                  <Input value={claimForm.jobId} onChange={e => setClaimForm(p => ({ ...p, jobId: e.target.value }))}
                    className="h-7 text-[10px]" style={{ background: "hsl(var(--hud-bg))", color: "hsl(var(--hud-text))", borderColor: "hsl(var(--hud-border) / 0.15)" }} />
                )}
              </div>
              <div>
                <Label className="text-[10px]" style={{ color: "hsl(var(--hud-text-dim))" }}>Montant (FCFA)</Label>
                <Input type="number" value={claimForm.amount} onChange={e => setClaimForm(p => ({ ...p, amount: +e.target.value }))}
                  className="h-7 text-[10px]" style={{ background: "hsl(var(--hud-bg))", color: "hsl(var(--hud-text))", borderColor: "hsl(var(--hud-border) / 0.15)" }} />
              </div>
            </div>
            <div>
              <Label className="text-[10px]" style={{ color: "hsl(var(--hud-text-dim))" }}>Raison</Label>
              <select value={claimForm.reason} onChange={e => setClaimForm(p => ({ ...p, reason: e.target.value }))}
                className="w-full h-7 text-[10px] rounded-md px-2" style={{ background: "hsl(var(--hud-bg))", color: "hsl(var(--hud-text))", border: "1px solid hsl(var(--hud-border) / 0.15)" }}>
                <option value="damaged">Endommagé</option>
                <option value="lost">Perdu</option>
                <option value="stolen">Volé</option>
                <option value="delayed">Retard excessif</option>
              </select>
            </div>
            <div>
              <Label className="text-[10px]" style={{ color: "hsl(var(--hud-text-dim))" }}>Description</Label>
              <Textarea value={claimForm.description} onChange={e => setClaimForm(p => ({ ...p, description: e.target.value }))}
                rows={2} className="text-[10px]" style={{ background: "hsl(var(--hud-bg))", color: "hsl(var(--hud-text))", borderColor: "hsl(var(--hud-border) / 0.15)" }} />
            </div>
            <div className="flex gap-2">
              <Button size="sm" className="flex-1 text-[10px] h-7" onClick={submitClaim}
                style={{ background: "hsl(var(--warning))", color: "#fff" }}>Soumettre</Button>
              <Button size="sm" variant="outline" className="text-[10px] h-7" onClick={() => setShowClaimForm(false)}
                style={{ borderColor: "hsl(var(--hud-border) / 0.2)", color: "hsl(var(--hud-text-dim))" }}>Annuler</Button>
            </div>
          </motion.div>
        )}

        {claims.length === 0 && !showClaimForm && (
          <p className="text-center py-6 text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>Aucune réclamation en cours</p>
        )}

        {claims.map((claim, i) => {
          const cfg = statusConfig[claim.status];
          return (
            <motion.div key={claim.id}
              initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
              className="rounded-xl p-3" style={{ background: "hsl(var(--hud-surface))", border: `1px solid ${cfg.color}20` }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs">{cfg.emoji}</span>
                  <div>
                    <p className="text-[10px] font-semibold" style={{ color: "hsl(var(--hud-text))" }}>Mission {String(claim.jobId).slice(0, 8)}</p>
                    <p className="text-[10px]" style={{ color: "hsl(var(--hud-text-dim))" }}>{claim.description}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold" style={{ color: cfg.color }}>{claim.claimAmount.toLocaleString()} F</p>
                  <p className="text-[10px]" style={{ color: cfg.color }}>{cfg.label}</p>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
