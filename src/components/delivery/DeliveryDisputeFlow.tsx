/**
 * DeliveryDisputeFlow — Raise, track, and resolve delivery disputes
 * PASS77-H: Delivery Disputes Flow
 */
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, Plus, CheckCircle2, ArrowUpCircle, MessageSquare, X, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { haptic } from "@/lib/haptics";
import { useDeliveryDisputes, type RaiseDisputePayload } from "@/hooks/useDeliveryDisputes";

const DISPUTE_REASONS = [
  { value: "not_delivered", label: "Colis non livré" },
  { value: "damaged", label: "Colis endommagé" },
  { value: "wrong_item", label: "Mauvais colis" },
  { value: "late_delivery", label: "Livraison en retard" },
  { value: "driver_no_show", label: "Livreur absent" },
  { value: "overcharged", label: "Surfacturation" },
  { value: "other", label: "Autre" },
];

const STATUS_CONFIG: Record<string, { label: string; emoji: string; color: string }> = {
  open: { label: "Ouvert", emoji: "🔴", color: "hsl(var(--destructive))" },
  escalated: { label: "Escaladé", emoji: "🟠", color: "hsl(var(--warning))" },
  resolved: { label: "Résolu", emoji: "🟢", color: "hsl(var(--success))" },
};

interface Props {
  orgId: string;
  jobId?: string;
  onClose?: () => void;
}

function RaiseDisputeForm({ orgId, jobId, onSubmit, onCancel }: {
  orgId: string; jobId: string;
  onSubmit: (p: RaiseDisputePayload) => Promise<void>;
  onCancel: () => void;
}) {
  const [reason, setReason] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!reason) { toast.error("Sélectionnez un motif"); return; }
    setSubmitting(true);
    try {
      await onSubmit({
        job_id: jobId,
        org_id: orgId,
        reason,
        description: description || undefined,
        raised_by_role: "seller",
      });
      haptic("medium");
      toast.success("Litige créé !");
      onCancel();
    } catch (e: any) {
      toast.error(e.message || "Erreur");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}
      className="rounded-xl p-4 space-y-3"
      style={{ background: "hsl(var(--hud-surface))", border: "1px solid hsl(var(--destructive) / 0.2)" }}
    >
      <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: "hsl(var(--hud-text))" }}>
        <AlertTriangle className="h-4 w-4" style={{ color: "hsl(var(--destructive))" }} />
        Ouvrir un litige
      </h3>

      <div>
        <Label className="text-[10px] font-semibold" style={{ color: "hsl(var(--hud-text-dim))" }}>Motif *</Label>
        <select value={reason} onChange={e => setReason(e.target.value)}
          className="w-full h-9 text-xs mt-1 rounded-md px-2"
          style={{ background: "hsl(var(--hud-bg))", border: "1px solid hsl(var(--hud-border) / 0.15)", color: "hsl(var(--hud-text))" }}>
          <option value="">Sélectionnez un motif…</option>
          {DISPUTE_REASONS.map(r => (
            <option key={r.value} value={r.value}>{r.label}</option>
          ))}
        </select>
      </div>

      <div>
        <Label className="text-[10px] font-semibold" style={{ color: "hsl(var(--hud-text-dim))" }}>Description</Label>
        <Textarea value={description} onChange={e => setDescription(e.target.value)}
          placeholder="Décrivez le problème en détail…" rows={3}
          className="text-xs mt-1"
          style={{ background: "hsl(var(--hud-bg))", border: "1px solid hsl(var(--hud-border) / 0.15)", color: "hsl(var(--hud-text))" }} />
      </div>

      <div className="flex gap-2 pt-1">
        <Button size="sm" className="flex-1 text-xs h-9" onClick={handleSubmit} disabled={submitting}
          style={{ background: "hsl(var(--destructive))", color: "#fff" }}>
          <AlertTriangle className="h-3.5 w-3.5 mr-1" />
          {submitting ? "Envoi…" : "Soumettre le litige"}
        </Button>
        <Button size="sm" variant="outline" className="text-xs h-9" onClick={onCancel}
          style={{ borderColor: "hsl(var(--hud-border) / 0.2)", color: "hsl(var(--hud-text-dim))" }}>
          Annuler
        </Button>
      </div>
    </motion.div>
  );
}

export default function DeliveryDisputeFlow({ orgId, jobId, onClose }: Props) {
  const { disputes, loading, stats, raiseDispute, resolveDispute, escalateDispute, getDisputesByJob } = useDeliveryDisputes(orgId);
  const [showRaise, setShowRaise] = useState(false);
  const [raiseJobId, setRaiseJobId] = useState(jobId || "");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [resolutionText, setResolutionText] = useState("");

  const displayedDisputes = jobId ? getDisputesByJob(jobId) : disputes;

  const handleResolve = async (disputeId: string) => {
    if (!resolutionText.trim()) { toast.error("Entrez une résolution"); return; }
    try {
      await resolveDispute(disputeId, resolutionText);
      haptic("medium");
      toast.success("Litige résolu !");
      setExpandedId(null);
      setResolutionText("");
    } catch { toast.error("Erreur"); }
  };

  const handleEscalate = async (disputeId: string) => {
    haptic("warning");
    try {
      await escalateDispute(disputeId);
      toast("Litige escaladé au support");
    } catch { toast.error("Erreur"); }
  };

  return (
    <div className="space-y-3">
      {/* Stats bar */}
      <div className="flex gap-2">
        {[
          { label: "Ouverts", value: stats.open, color: "--destructive" },
          { label: "Escaladés", value: stats.escalated, color: "--warning" },
          { label: "Résolus", value: stats.resolved, color: "--success" },
        ].map(s => (
          <div key={s.label} className="flex-1 rounded-lg px-2 py-2 text-center"
            style={{ background: "hsl(var(--hud-surface))", border: "1px solid hsl(var(--hud-border) / 0.08)" }}>
            <p className="text-sm font-bold" style={{ color: `hsl(var(${s.color}))` }}>{s.value}</p>
            <p className="text-[8px]" style={{ color: "hsl(var(--hud-text-dim) / 0.4)" }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Raise button / form */}
      <AnimatePresence mode="wait">
        {showRaise && raiseJobId ? (
          <RaiseDisputeForm
            key="form"
            orgId={orgId}
            jobId={raiseJobId}
            onSubmit={raiseDispute}
            onCancel={() => setShowRaise(false)}
          />
        ) : jobId ? (
          <motion.div key="btn">
            <Button className="w-full text-xs h-9 font-semibold" size="sm"
              onClick={() => { setShowRaise(true); setRaiseJobId(jobId); haptic("light"); }}
              style={{ background: "hsl(var(--destructive) / 0.12)", color: "hsl(var(--destructive))" }}>
              <AlertTriangle className="h-3.5 w-3.5 mr-1" /> Signaler un problème
            </Button>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* Disputes list */}
      <div className="space-y-2">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <AlertTriangle className="h-5 w-5 animate-pulse" style={{ color: "hsl(var(--hud-text-dim) / 0.2)" }} />
          </div>
        ) : displayedDisputes.length === 0 ? (
          <div className="text-center py-8">
            <CheckCircle2 className="h-6 w-6 mx-auto mb-1" style={{ color: "hsl(var(--success) / 0.3)" }} />
            <p className="text-[10px]" style={{ color: "hsl(var(--hud-text-dim) / 0.4)" }}>Aucun litige</p>
          </div>
        ) : (
          displayedDisputes.map(d => {
            const cfg = STATUS_CONFIG[d.status] || STATUS_CONFIG.open;
            const isExpanded = expandedId === d.id;
            const reasonLabel = DISPUTE_REASONS.find(r => r.value === d.reason)?.label || d.reason;

            return (
              <div key={d.id} className="rounded-xl overflow-hidden"
                style={{ background: "hsl(var(--hud-surface))", border: `1px solid ${cfg.color}20` }}>
                <button
                  className="w-full flex items-center gap-3 px-4 py-3 text-left"
                  onClick={() => setExpandedId(isExpanded ? null : d.id)}
                >
                  <span className="text-sm">{cfg.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold truncate" style={{ color: "hsl(var(--hud-text))" }}>
                      {reasonLabel}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] font-medium" style={{ color: cfg.color }}>{cfg.label}</span>
                      <span className="text-[9px]" style={{ color: "hsl(var(--hud-text-dim) / 0.3)" }}>
                        {d.created_at ? new Date(d.created_at).toLocaleDateString("fr") : ""}
                      </span>
                    </div>
                  </div>
                  {isExpanded ? (
                    <ChevronUp className="h-3.5 w-3.5 shrink-0" style={{ color: "hsl(var(--hud-text-dim) / 0.3)" }} />
                  ) : (
                    <ChevronDown className="h-3.5 w-3.5 shrink-0" style={{ color: "hsl(var(--hud-text-dim) / 0.3)" }} />
                  )}
                </button>

                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="px-4 pb-3 space-y-2">
                        {d.description && (
                          <p className="text-[11px] leading-relaxed" style={{ color: "hsl(var(--hud-text-dim))" }}>
                            {d.description}
                          </p>
                        )}

                        {d.resolution && (
                          <div className="rounded-lg px-3 py-2" style={{ background: "hsl(var(--success) / 0.06)" }}>
                            <p className="text-[9px] font-semibold mb-0.5" style={{ color: "hsl(var(--success))" }}>Résolution</p>
                            <p className="text-[11px]" style={{ color: "hsl(var(--hud-text))" }}>{d.resolution}</p>
                          </div>
                        )}

                        {d.status === "open" && (
                          <div className="space-y-2 pt-1">
                            <Textarea
                              value={resolutionText}
                              onChange={e => setResolutionText(e.target.value)}
                              placeholder="Décrivez la résolution…"
                              rows={2}
                              className="text-xs"
                              style={{ background: "hsl(var(--hud-bg))", border: "1px solid hsl(var(--hud-border) / 0.15)", color: "hsl(var(--hud-text))" }}
                            />
                            <div className="flex gap-2">
                              <Button size="sm" className="flex-1 text-[10px] h-7"
                                onClick={() => handleResolve(d.id)}
                                style={{ background: "hsl(var(--success))", color: "#fff" }}>
                                <CheckCircle2 className="h-3 w-3 mr-1" /> Résoudre
                              </Button>
                              <Button size="sm" className="text-[10px] h-7 px-3"
                                onClick={() => handleEscalate(d.id)}
                                style={{ background: "hsl(var(--warning) / 0.12)", color: "hsl(var(--warning))" }}>
                                <ArrowUpCircle className="h-3 w-3 mr-1" /> Escalader
                              </Button>
                            </div>
                          </div>
                        )}

                        {d.status === "escalated" && (
                          <div className="rounded-lg px-3 py-2" style={{ background: "hsl(var(--warning) / 0.06)" }}>
                            <p className="text-[10px]" style={{ color: "hsl(var(--warning))" }}>
                              ⏳ En cours de traitement par le support
                            </p>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })
        )}
      </div>

      {onClose && (
        <Button size="sm" variant="ghost" className="w-full text-xs h-8" onClick={onClose}
          style={{ color: "hsl(var(--hud-text-dim) / 0.5)" }}>
          Fermer
        </Button>
      )}
    </div>
  );
}
