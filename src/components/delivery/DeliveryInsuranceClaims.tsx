/**
 * DeliveryInsuranceClaims — BBB. Insurance claim system.
 * Incident declaration, evidence upload, status tracking, auto-refund.
 * PASS97-BBB
 */
import { useState } from "react";
import { motion } from "framer-motion";
import {
  Shield, AlertTriangle, Upload, Camera, CheckCircle2,
  Clock, FileText, Loader2, XCircle, ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { haptic } from "@/lib/haptics";

interface Claim {
  id: string;
  jobId: string;
  type: "damaged" | "lost" | "delayed" | "wrong_item" | "theft";
  status: "submitted" | "under_review" | "approved" | "rejected" | "refunded";
  description: string;
  amount: number;
  currency: string;
  evidenceCount: number;
  createdAt: Date;
  resolvedAt?: Date;
  refundAmount?: number;
}

const CLAIM_TYPES = [
  { id: "damaged" as const, label: "Colis endommagé", emoji: "📦💥", color: "--warning" },
  { id: "lost" as const, label: "Colis perdu", emoji: "❓", color: "--destructive" },
  { id: "delayed" as const, label: "Retard majeur", emoji: "⏰", color: "--warning" },
  { id: "wrong_item" as const, label: "Mauvais article", emoji: "🔄", color: "--info" },
  { id: "theft" as const, label: "Vol signalé", emoji: "🚨", color: "--destructive" },
];

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  submitted: { label: "Soumise", color: "--info", icon: Clock },
  under_review: { label: "En examen", color: "--warning", icon: FileText },
  approved: { label: "Approuvée", color: "--success", icon: CheckCircle2 },
  rejected: { label: "Rejetée", color: "--destructive", icon: XCircle },
  refunded: { label: "Remboursée", color: "--success", icon: CheckCircle2 },
};

const MOCK_CLAIMS: Claim[] = [
  { id: "c1", jobId: "j-001", type: "damaged", status: "under_review", description: "Emballage écrasé, contenu cassé", amount: 45, currency: "EUR", evidenceCount: 3, createdAt: new Date(Date.now() - 86400000) },
  { id: "c2", jobId: "j-002", type: "lost", status: "approved", description: "Colis jamais livré", amount: 120, currency: "EUR", evidenceCount: 1, createdAt: new Date(Date.now() - 172800000), resolvedAt: new Date(Date.now() - 43200000), refundAmount: 120 },
  { id: "c3", jobId: "j-003", type: "delayed", status: "refunded", description: "Livraison avec 3h de retard", amount: 15, currency: "EUR", evidenceCount: 2, createdAt: new Date(Date.now() - 259200000), resolvedAt: new Date(Date.now() - 86400000), refundAmount: 10 },
];

export default function DeliveryInsuranceClaims({ orgId, className }: { orgId: string; className?: string }) {
  const [claims, setClaims] = useState<Claim[]>(MOCK_CLAIMS);
  const [showNewClaim, setShowNewClaim] = useState(false);
  const [filter, setFilter] = useState<"all" | "active" | "resolved">("all");
  const [newClaim, setNewClaim] = useState({ type: "damaged" as Claim["type"], jobId: "", description: "", amount: 0 });
  const [submitting, setSubmitting] = useState(false);

  const filtered = claims.filter(c => {
    if (filter === "active") return ["submitted", "under_review"].includes(c.status);
    if (filter === "resolved") return ["approved", "rejected", "refunded"].includes(c.status);
    return true;
  });

  const totalPending = claims.filter(c => ["submitted", "under_review"].includes(c.status)).length;
  const totalRefunded = claims.filter(c => c.status === "refunded").reduce((s, c) => s + (c.refundAmount || 0), 0);

  const submitClaim = async () => {
    if (!newClaim.jobId || !newClaim.description) { toast.error("Remplissez tous les champs"); return; }
    setSubmitting(true);
    haptic("medium");
    await new Promise(r => setTimeout(r, 1200));
    const claim: Claim = {
      id: "c-" + Date.now(),
      jobId: newClaim.jobId,
      type: newClaim.type,
      status: "submitted",
      description: newClaim.description,
      amount: newClaim.amount,
      currency: "EUR",
      evidenceCount: 0,
      createdAt: new Date(),
    };
    setClaims(prev => [claim, ...prev]);
    setShowNewClaim(false);
    setNewClaim({ type: "damaged", jobId: "", description: "", amount: 0 });
    setSubmitting(false);
    toast.success("📋 Réclamation soumise — examen sous 24h");
  };

  return (
    <div className={`space-y-3 ${className || ""}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: "hsl(var(--foreground))" }}>
          <Shield className="h-4 w-4" style={{ color: "hsl(var(--primary))" }} />
          Assurance & Réclamations
        </h3>
        <Button size="sm" className="text-[10px] h-7" onClick={() => { setShowNewClaim(!showNewClaim); haptic("light"); }}
          style={{ background: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))" }}>
          + Nouvelle
        </Button>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: "En cours", value: totalPending, color: "--warning" },
          { label: "Total", value: claims.length, color: "--primary" },
          { label: "Remboursé", value: `${totalRefunded}€`, color: "--success" },
        ].map(k => (
          <div key={k.label} className="rounded-xl px-2 py-2 text-center"
            style={{ background: "hsl(var(--muted) / 0.3)", border: "1px solid hsl(var(--border) / 0.1)" }}>
            <p className="text-sm font-bold" style={{ color: `hsl(var(${k.color}))` }}>{k.value}</p>
            <p className="text-[8px]" style={{ color: "hsl(var(--muted-foreground))" }}>{k.label}</p>
          </div>
        ))}
      </div>

      {/* New Claim Form */}
      {showNewClaim && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-xl p-4 space-y-3" style={{ background: "hsl(var(--muted) / 0.2)", border: "1px solid hsl(var(--border) / 0.15)" }}>
          <p className="text-xs font-bold" style={{ color: "hsl(var(--foreground))" }}>Nouvelle réclamation</p>

          <div className="grid grid-cols-2 gap-2">
            {CLAIM_TYPES.map(t => (
              <button key={t.id} onClick={() => setNewClaim(p => ({ ...p, type: t.id }))}
                className="rounded-lg p-2 text-left transition-all"
                style={{
                  background: newClaim.type === t.id ? `hsl(var(${t.color}) / 0.1)` : "hsl(var(--background))",
                  border: `1px solid ${newClaim.type === t.id ? `hsl(var(${t.color}) / 0.3)` : "hsl(var(--border) / 0.1)"}`,
                }}>
                <span className="text-sm">{t.emoji}</span>
                <p className="text-[9px] font-semibold mt-1" style={{ color: newClaim.type === t.id ? `hsl(var(${t.color}))` : "hsl(var(--muted-foreground))" }}>
                  {t.label}
                </p>
              </button>
            ))}
          </div>

          <Input value={newClaim.jobId} onChange={e => setNewClaim(p => ({ ...p, jobId: e.target.value }))}
            placeholder="ID mission (ex: j-001)" className="h-8 text-xs"
            style={{ background: "hsl(var(--background))", borderColor: "hsl(var(--border) / 0.15)", color: "hsl(var(--foreground))" }} />

          <Textarea value={newClaim.description} onChange={e => setNewClaim(p => ({ ...p, description: e.target.value }))}
            placeholder="Décrivez l'incident…" rows={2} className="text-xs"
            style={{ background: "hsl(var(--background))", borderColor: "hsl(var(--border) / 0.15)", color: "hsl(var(--foreground))" }} />

          <Input type="number" value={newClaim.amount || ""} onChange={e => setNewClaim(p => ({ ...p, amount: +e.target.value }))}
            placeholder="Montant estimé (€)" className="h-8 text-xs"
            style={{ background: "hsl(var(--background))", borderColor: "hsl(var(--border) / 0.15)", color: "hsl(var(--foreground))" }} />

          <div className="flex gap-2">
            <Button size="sm" className="flex-1 text-xs h-8" disabled={submitting} onClick={submitClaim}
              style={{ background: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))" }}>
              {submitting ? <Loader2 className="h-3 w-3 animate-spin" /> : "Soumettre"}
            </Button>
            <Button size="sm" variant="outline" className="text-xs h-8" onClick={() => setShowNewClaim(false)}
              style={{ borderColor: "hsl(var(--border) / 0.2)", color: "hsl(var(--muted-foreground))" }}>
              Annuler
            </Button>
          </div>
        </motion.div>
      )}

      {/* Filter */}
      <div className="flex gap-1 p-1 rounded-xl" style={{ background: "hsl(var(--muted) / 0.3)" }}>
        {(["all", "active", "resolved"] as const).map(f => (
          <button key={f} onClick={() => { setFilter(f); haptic("selection"); }}
            className="flex-1 py-1.5 rounded-lg text-[10px] font-semibold"
            style={{
              background: filter === f ? "hsl(var(--primary) / 0.1)" : "transparent",
              color: filter === f ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))",
            }}>
            {f === "all" ? "Toutes" : f === "active" ? "En cours" : "Résolues"}
          </button>
        ))}
      </div>

      {/* Claims List */}
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="text-center py-8">
            <Shield className="h-8 w-8 mx-auto mb-2" style={{ color: "hsl(var(--success) / 0.3)" }} />
            <p className="text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>Aucune réclamation</p>
          </div>
        ) : filtered.map(c => {
          const cfg = STATUS_CONFIG[c.status];
          const typeInfo = CLAIM_TYPES.find(t => t.id === c.type)!;
          const Icon = cfg.icon;
          return (
            <div key={c.id} className="rounded-xl p-3 space-y-2"
              style={{ background: "hsl(var(--muted) / 0.2)", border: `1px solid hsl(var(${cfg.color}) / 0.15)` }}>
              <div className="flex items-start gap-3">
                <span className="text-lg">{typeInfo.emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-semibold" style={{ color: "hsl(var(--foreground))" }}>{typeInfo.label}</p>
                  <p className="text-[9px]" style={{ color: "hsl(var(--muted-foreground))" }}>
                    Mission {c.jobId} • {c.createdAt.toLocaleDateString("fr-FR")}
                  </p>
                  <p className="text-[10px] mt-1" style={{ color: "hsl(var(--muted-foreground) / 0.8)" }}>{c.description}</p>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full inline-flex items-center gap-1"
                    style={{ background: `hsl(var(${cfg.color}) / 0.1)`, color: `hsl(var(${cfg.color}))` }}>
                    <Icon className="h-2.5 w-2.5" /> {cfg.label}
                  </span>
                  <p className="text-[10px] font-bold mt-1" style={{ color: "hsl(var(--foreground))" }}>{c.amount} {c.currency}</p>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="flex items-center gap-1">
                {["submitted", "under_review", "approved", "refunded"].map((step, i) => {
                  const steps = ["submitted", "under_review", "approved", "refunded"];
                  const currentIdx = steps.indexOf(c.status);
                  const done = i <= currentIdx;
                  return (
                    <div key={step} className="flex-1 h-1 rounded-full"
                      style={{ background: done ? `hsl(var(${cfg.color}))` : "hsl(var(--muted) / 0.5)" }} />
                  );
                })}
              </div>

              {c.refundAmount && (
                <p className="text-[9px] font-semibold" style={{ color: "hsl(var(--success))" }}>
                  ✅ Remboursé : {c.refundAmount} {c.currency}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
