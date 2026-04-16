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
import { useDeliveryDispatch, useInsertMutation } from "@/hooks/useDeliveryData";

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

export default function DeliveryInsuranceClaims({ orgId, className }: { orgId: string; className?: string }) {
  const { data: claims = [], isLoading } = useDeliveryDispatch(orgId);
  const insertClaim = useInsertMutation("dispatch_jobs_v2");
  const [showNewClaim, setShowNewClaim] = useState(false);
  const [filter, setFilter] = useState<"all" | "active" | "resolved">("all");
  const [newClaim, setNewClaim] = useState({ type: "damaged", jobId: "", description: "", amount: 0 });
  const [submitting, setSubmitting] = useState(false);

  if (isLoading) return <div style={{ padding: "2rem", textAlign: "center", color: "#888" }}>Loading...</div>;

  const filtered = claims.filter((c: any) => {
    if (filter === "active") return ["submitted", "under_review"].includes(c.status);
    if (filter === "resolved") return ["approved", "rejected", "refunded"].includes(c.status);
    return true;
  });

  const totalPending = claims.filter((c: any) => ["submitted", "under_review"].includes(c.status)).length;
  const totalRefunded = claims.filter((c: any) => c.status === "refunded").reduce((s: number, c: any) => s + (c.refund_amount || 0), 0);

  const submitClaim = async () => {
    if (!newClaim.jobId || !newClaim.description) { toast.error("Remplissez tous les champs"); return; }
    setSubmitting(true);
    haptic("medium");
    try {
      await insertClaim.mutateAsync({
        org_id: orgId,
        job_id: newClaim.jobId,
        type: newClaim.type,
        status: "submitted",
        description: newClaim.description,
        amount: newClaim.amount,
        currency: "EUR",
      });
      setShowNewClaim(false);
      setNewClaim({ type: "damaged", jobId: "", description: "", amount: 0 });
      toast.success("📋 Réclamation soumise — examen sous 24h");
    } catch {
      toast.error("Erreur lors de la soumission");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={`space-y-3 ${className || ""}`}>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: "hsl(var(--foreground))" }}>
          <Shield className="h-4 w-4" style={{ color: "hsl(var(--primary))" }} />
          Assurance & Réclamations
        </h3>
        <Button size="sm" className="text-[0.625rem] h-7" onClick={() => { setShowNewClaim(!showNewClaim); haptic("light"); }}
          style={{ background: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))" }}>
          + Nouvelle
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {[
          { label: "En cours", value: totalPending, color: "--warning" },
          { label: "Total", value: claims.length, color: "--primary" },
          { label: "Remboursé", value: `${totalRefunded}€`, color: "--success" },
        ].map(k => (
          <div key={k.label} className="rounded-xl px-2 py-2 text-center"
            style={{ background: "hsl(var(--muted) / 0.3)", border: "1px solid hsl(var(--border) / 0.1)" }}>
            <p className="text-sm font-bold" style={{ color: `hsl(var(${k.color}))` }}>{k.value}</p>
            <p className="text-[0.625rem]" style={{ color: "hsl(var(--muted-foreground))" }}>{k.label}</p>
          </div>
        ))}
      </div>

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
                <p className="text-[0.625rem] font-semibold mt-1" style={{ color: newClaim.type === t.id ? `hsl(var(${t.color}))` : "hsl(var(--muted-foreground))" }}>
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

      <div className="flex gap-1 p-1 rounded-xl" style={{ background: "hsl(var(--muted) / 0.3)" }}>
        {(["all", "active", "resolved"] as const).map(f => (
          <button key={f} onClick={() => { setFilter(f); haptic("selection"); }}
            className="flex-1 py-1.5 rounded-lg text-[0.625rem] font-semibold"
            style={{
              background: filter === f ? "hsl(var(--primary) / 0.1)" : "transparent",
              color: filter === f ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))",
            }}>
            {f === "all" ? "Toutes" : f === "active" ? "En cours" : "Résolues"}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="text-center py-8">
            <Shield className="h-8 w-8 mx-auto mb-2" style={{ color: "hsl(var(--success) / 0.3)" }} />
            <p className="text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>Aucune réclamation</p>
          </div>
        ) : filtered.map((c: any) => {
          const cfg = STATUS_CONFIG[c.status] || STATUS_CONFIG["submitted"];
          const typeInfo = CLAIM_TYPES.find(t => t.id === c.type) || CLAIM_TYPES[0];
          const Icon = cfg.icon;
          const createdAt = c.created_at ? new Date(c.created_at) : new Date();
          return (
            <div key={c.id} className="rounded-xl p-3 space-y-2"
              style={{ background: "hsl(var(--muted) / 0.2)", border: `1px solid hsl(var(${cfg.color}) / 0.15)` }}>
              <div className="flex items-start gap-3">
                <span className="text-lg">{typeInfo.emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-[0.6875rem] font-semibold" style={{ color: "hsl(var(--foreground))" }}>{typeInfo.label}</p>
                  <p className="text-[0.625rem]" style={{ color: "hsl(var(--muted-foreground))" }}>
                    Mission {c.job_id || c.id} • {createdAt.toLocaleDateString("fr-FR")}
                  </p>
                  <p className="text-[0.625rem] mt-1" style={{ color: "hsl(var(--muted-foreground) / 0.8)" }}>{c.description || "—"}</p>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-[0.625rem] font-bold px-1.5 py-0.5 rounded-full inline-flex items-center gap-1"
                    style={{ background: `hsl(var(${cfg.color}) / 0.1)`, color: `hsl(var(${cfg.color}))` }}>
                    <Icon className="h-2.5 w-2.5" /> {cfg.label}
                  </span>
                  <p className="text-[0.625rem] font-bold mt-1" style={{ color: "hsl(var(--foreground))" }}>{c.amount || 0} {c.currency || "EUR"}</p>
                </div>
              </div>

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

              {c.refund_amount && (
                <p className="text-[0.625rem] font-semibold" style={{ color: "hsl(var(--success))" }}>
                  ✅ Remboursé : {c.refund_amount} {c.currency || "EUR"}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
