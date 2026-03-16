/**
 * BuyerTrackingPanel — Live delivery tracking for buyers.
 * Timeline, driver info, confirmation code, rating.
 * PASS70-D
 */
import { useState } from "react";
import { motion } from "framer-motion";
import {
  Package, Star, MapPin, Truck, Clock,
  CheckCircle2, Shield, Send, MessageSquare,
} from "lucide-react";
import { useBuyerDelivery, type TrackingStep } from "@/hooks/useBuyerDelivery";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { haptic } from "@/lib/haptics";
import { toast } from "sonner";

function TrackingTimeline({ steps, progress }: { steps: TrackingStep[]; progress: number }) {
  return (
    <div className="relative pl-6 space-y-0">
      {/* Progress line */}
      <div className="absolute left-[11px] top-3 bottom-3 w-0.5" style={{ background: "hsl(var(--hud-border) / 0.15)" }}>
        <motion.div
          className="w-full rounded-full"
          style={{ background: "hsl(var(--hud-cyan))" }}
          initial={{ height: "0%" }}
          animate={{ height: `${progress}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        />
      </div>

      {steps.map((step, i) => (
        <div key={step.key} className="relative flex items-start gap-3 py-2.5">
          {/* Dot */}
          <div className="absolute -left-6 mt-0.5">
            <div
              className="w-[22px] h-[22px] rounded-full flex items-center justify-center text-[10px] transition-all"
              style={{
                background: step.completed
                  ? step.active ? "hsl(var(--hud-cyan))" : "hsl(var(--success))"
                  : "hsl(var(--hud-surface-2))",
                border: step.active ? "2px solid hsl(var(--hud-cyan))" : "none",
                boxShadow: step.active ? "0 0 12px hsl(var(--hud-cyan) / 0.4)" : "none",
              }}
            >
              {step.completed ? (step.active ? step.emoji : "✓") : step.emoji}
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold" style={{
              color: step.completed ? "hsl(var(--hud-text))" : "hsl(var(--hud-text-dim) / 0.4)",
            }}>
              {step.label}
            </p>
            {step.timestamp && (
              <p className="text-[9px] mt-0.5" style={{ color: "hsl(var(--hud-text-dim) / 0.3)" }}>
                {new Date(step.timestamp).toLocaleString("fr", { hour: "2-digit", minute: "2-digit", day: "numeric", month: "short" })}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function RatingPanel({ onSubmit }: { onSubmit: (rating: number, comment?: string) => Promise<void> }) {
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) { toast.error("Sélectionnez une note"); return; }
    setSubmitting(true);
    try { await onSubmit(rating, comment || undefined); toast.success("Merci pour votre avis !"); }
    catch { toast.error("Erreur"); }
    finally { setSubmitting(false); }
  };

  return (
    <div className="rounded-xl p-4 space-y-3"
      style={{ background: "hsl(var(--hud-surface))", border: "1px solid hsl(var(--hud-border) / 0.15)" }}>
      <h4 className="text-xs font-bold flex items-center gap-2" style={{ color: "hsl(var(--hud-text))" }}>
        <Star className="h-3.5 w-3.5" style={{ color: "hsl(var(--warning))" }} />
        Noter votre livreur
      </h4>

      {/* Stars */}
      <div className="flex gap-1 justify-center py-2">
        {[1, 2, 3, 4, 5].map(s => (
          <button
            key={s}
            onMouseEnter={() => setHovered(s)}
            onMouseLeave={() => setHovered(0)}
            onClick={() => { setRating(s); haptic("light"); }}
            className="transition-transform hover:scale-110"
          >
            <Star
              className="h-7 w-7"
              fill={(hovered || rating) >= s ? "hsl(var(--warning))" : "none"}
              style={{ color: (hovered || rating) >= s ? "hsl(var(--warning))" : "hsl(var(--hud-text-dim) / 0.2)" }}
            />
          </button>
        ))}
      </div>

      <Textarea
        value={comment}
        onChange={e => setComment(e.target.value)}
        placeholder="Un commentaire ? (optionnel)"
        rows={2}
        className="text-xs"
        style={{ background: "hsl(var(--hud-bg))", borderColor: "hsl(var(--hud-border) / 0.15)", color: "hsl(var(--hud-text))" }}
      />

      <Button size="sm" className="w-full text-xs h-9" onClick={handleSubmit} disabled={submitting}
        style={{ background: "hsl(var(--warning))", color: "hsl(var(--hud-bg))" }}>
        <Send className="h-3.5 w-3.5 mr-1" /> {submitting ? "Envoi…" : "Envoyer l'avis"}
      </Button>
    </div>
  );
}

interface Props {
  jobId: string;
}

export default function BuyerTrackingPanel({ jobId }: Props) {
  const { job, driverInfo, loading, steps, progress, submitRating } = useBuyerDelivery(jobId);
  const [showRating, setShowRating] = useState(false);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Package className="h-8 w-8 animate-pulse" style={{ color: "hsl(var(--hud-cyan) / 0.3)" }} />
      </div>
    );
  }

  if (!job) {
    return (
      <div className="flex flex-col items-center py-16 text-center">
        <Package className="h-8 w-8 mb-2" style={{ color: "hsl(var(--hud-text-dim) / 0.2)" }} />
        <p className="text-xs" style={{ color: "hsl(var(--hud-text-dim) / 0.4)" }}>Livraison introuvable</p>
      </div>
    );
  }

  const isCancelled = job.status === "cancelled";
  const isCompleted = job.status === "completed";

  return (
    <div className="space-y-4">
      {/* Header card */}
      <div className="rounded-xl p-4"
        style={{ background: "hsl(var(--hud-surface))", border: "1px solid hsl(var(--hud-border) / 0.15)" }}>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-bold" style={{ color: "hsl(var(--hud-text))" }}>
              📦 {job.package_description || "Votre colis"}
            </h3>
            <p className="text-[10px] mt-0.5" style={{ color: "hsl(var(--hud-text-dim) / 0.4)" }}>
              {job.dropoff_address}
            </p>
          </div>
          {job.delivery_fee != null && (
            <span className="text-sm font-bold" style={{ color: "hsl(var(--hud-cyan))" }}>
              {job.delivery_fee.toFixed(2)} {job.currency || "€"}
            </span>
          )}
        </div>

        {/* Progress bar */}
        <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: "hsl(var(--hud-border) / 0.1)" }}>
          <motion.div
            className="h-full rounded-full"
            style={{ background: isCancelled ? "hsl(var(--destructive))" : "hsl(var(--hud-cyan))" }}
            initial={{ width: "0%" }}
            animate={{ width: isCancelled ? "100%" : `${progress}%` }}
            transition={{ duration: 0.8 }}
          />
        </div>
        <p className="text-[9px] text-right mt-1" style={{ color: "hsl(var(--hud-text-dim) / 0.3)" }}>
          {isCancelled ? "Annulé" : `${progress}%`}
        </p>
      </div>

      {/* Driver info */}
      {driverInfo && job.driver_id && (
        <div className="rounded-xl p-3 flex items-center gap-3"
          style={{ background: "hsl(var(--hud-surface))", border: "1px solid hsl(var(--hud-border) / 0.1)" }}>
          <div className="w-10 h-10 rounded-full flex items-center justify-center"
            style={{ background: "hsl(var(--info) / 0.1)" }}>
            <Truck className="h-5 w-5" style={{ color: "hsl(var(--info))" }} />
          </div>
          <div className="flex-1">
            <p className="text-xs font-semibold" style={{ color: "hsl(var(--hud-text))" }}>
              Votre livreur
            </p>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[10px]" style={{ color: "hsl(var(--hud-text-dim))" }}>
                {driverInfo.vehicle_type}
              </span>
              {driverInfo.avg_rating && (
                <span className="text-[10px]" style={{ color: "hsl(var(--warning))" }}>
                  ⭐ {driverInfo.avg_rating.toFixed(1)}
                </span>
              )}
              {driverInfo.total_completed != null && (
                <span className="text-[10px]" style={{ color: "hsl(var(--hud-text-dim) / 0.4)" }}>
                  {driverInfo.total_completed} livraisons
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Timeline */}
      {!isCancelled && (
        <div className="rounded-xl p-4"
          style={{ background: "hsl(var(--hud-surface))", border: "1px solid hsl(var(--hud-border) / 0.1)" }}>
          <h4 className="text-xs font-bold mb-3 flex items-center gap-2" style={{ color: "hsl(var(--hud-text))" }}>
            <Clock className="h-3.5 w-3.5" style={{ color: "hsl(var(--hud-cyan))" }} /> Suivi en temps réel
          </h4>
          <TrackingTimeline steps={steps} progress={progress} />
        </div>
      )}

      {/* Confirmation code (visible when in_progress or completed) */}
      {job.confirmation_code && ["in_progress", "completed"].includes(job.status) && (
        <div className="rounded-xl p-4 text-center"
          style={{ background: "hsl(var(--hud-surface))", border: "1px solid hsl(var(--success) / 0.2)" }}>
          <Shield className="h-5 w-5 mx-auto mb-2" style={{ color: "hsl(var(--success))" }} />
          <p className="text-[10px] font-semibold mb-1" style={{ color: "hsl(var(--hud-text-dim))" }}>
            Code de confirmation
          </p>
          <p className="text-2xl font-black tracking-[0.3em] font-mono" style={{ color: "hsl(var(--hud-text))" }}>
            {job.confirmation_code}
          </p>
          <p className="text-[9px] mt-1" style={{ color: "hsl(var(--hud-text-dim) / 0.3)" }}>
            Communiquez ce code au livreur à la réception
          </p>
        </div>
      )}

      {/* Photo proof */}
      {job.photo_proof_url && (
        <div className="rounded-xl overflow-hidden"
          style={{ border: "1px solid hsl(var(--hud-border) / 0.1)" }}>
          <img src={job.photo_proof_url} alt="Preuve de livraison" className="w-full h-40 object-cover" />
          <div className="px-3 py-2" style={{ background: "hsl(var(--hud-surface))" }}>
            <p className="text-[10px] flex items-center gap-1" style={{ color: "hsl(var(--success))" }}>
              <CheckCircle2 className="h-3 w-3" /> Photo de preuve de livraison
            </p>
          </div>
        </div>
      )}

      {/* Rating */}
      {isCompleted && !showRating && (
        <Button
          className="w-full text-xs h-10 font-semibold"
          onClick={() => { setShowRating(true); haptic("light"); }}
          style={{ background: "hsl(var(--warning) / 0.12)", color: "hsl(var(--warning))", border: "1px solid hsl(var(--warning) / 0.2)" }}
          variant="outline"
        >
          <Star className="h-4 w-4 mr-1.5" /> Noter votre livreur
        </Button>
      )}

      {showRating && (
        <RatingPanel onSubmit={async (r, c) => { await submitRating(r, c); setShowRating(false); }} />
      )}

      {/* Cancelled state */}
      {isCancelled && (
        <div className="rounded-xl p-4 text-center"
          style={{ background: "hsl(var(--destructive) / 0.08)", border: "1px solid hsl(var(--destructive) / 0.15)" }}>
          <p className="text-sm font-bold" style={{ color: "hsl(var(--destructive))" }}>❌ Livraison annulée</p>
          {job.notes && <p className="text-[10px] mt-1" style={{ color: "hsl(var(--hud-text-dim))" }}>{job.notes}</p>}
        </div>
      )}
    </div>
  );
}
