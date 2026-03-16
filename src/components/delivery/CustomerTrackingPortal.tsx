/**
 * CustomerTrackingPortal — NNN. Customer Tracking Portal
 * Real-time package tracking with ETA, notifications, and post-delivery feedback.
 * PASS93-NNN
 */
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Package, MapPin, Clock, Star, MessageSquare, Bell, CheckCircle2, Truck, Navigation } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface TrackingStep {
  id: string;
  label: string;
  emoji: string;
  time: string | null;
  status: "completed" | "active" | "pending";
}

interface TrackedPackage {
  id: string;
  trackingCode: string;
  description: string;
  status: "confirmed" | "preparing" | "picked_up" | "in_transit" | "nearby" | "delivered";
  driverName: string;
  driverRating: number;
  driverVehicle: string;
  eta: string;
  etaMinutes: number;
  origin: string;
  destination: string;
  steps: TrackingStep[];
  deliveredAt?: string;
  photoProofUrl?: string;
}

const MOCK_PACKAGES: TrackedPackage[] = [
  {
    id: "pkg1", trackingCode: "EL-20260316-0042", description: "Carton électronique 30x20", status: "in_transit",
    driverName: "Thomas D.", driverRating: 4.8, driverVehicle: "Renault Master", eta: "14:35", etaMinutes: 12,
    origin: "123 Rue du Commerce, Paris 12e", destination: "45 Av. de la Liberté, Paris 8e",
    steps: [
      { id: "s1", label: "Commande confirmée", emoji: "✅", time: "13:20", status: "completed" },
      { id: "s2", label: "Colis préparé", emoji: "📦", time: "13:35", status: "completed" },
      { id: "s3", label: "Récupéré par le livreur", emoji: "🚗", time: "13:50", status: "completed" },
      { id: "s4", label: "En route vers vous", emoji: "🛣️", time: "14:05", status: "active" },
      { id: "s5", label: "À proximité", emoji: "📍", time: null, status: "pending" },
      { id: "s6", label: "Livré", emoji: "🏁", time: null, status: "pending" },
    ],
  },
  {
    id: "pkg2", trackingCode: "EL-20260316-0038", description: "Documents importants", status: "delivered",
    driverName: "Marie L.", driverRating: 4.9, driverVehicle: "Peugeot e-Expert", eta: "", etaMinutes: 0,
    origin: "8 Place Vendôme, Paris 1er", destination: "22 Rue de Passy, Paris 16e",
    deliveredAt: "12:45",
    steps: [
      { id: "s1", label: "Commande confirmée", emoji: "✅", time: "11:00", status: "completed" },
      { id: "s2", label: "Colis préparé", emoji: "📦", time: "11:15", status: "completed" },
      { id: "s3", label: "Récupéré par le livreur", emoji: "🚗", time: "11:30", status: "completed" },
      { id: "s4", label: "En route", emoji: "🛣️", time: "11:45", status: "completed" },
      { id: "s5", label: "À proximité", emoji: "📍", time: "12:35", status: "completed" },
      { id: "s6", label: "Livré", emoji: "🏁", time: "12:45", status: "completed" },
    ],
  },
];

export default function CustomerTrackingPortal({ orgId }: { orgId: string }) {
  const [selectedPkg, setSelectedPkg] = useState<string>(MOCK_PACKAGES[0].id);
  const [showFeedback, setShowFeedback] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");

  const pkg = MOCK_PACKAGES.find(p => p.id === selectedPkg)!;
  const isDelivered = pkg.status === "delivered";
  const activeStep = pkg.steps.findIndex(s => s.status === "active");

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Navigation className="h-4 w-4" style={{ color: "hsl(var(--hud-cyan))" }} />
        <h3 className="text-sm font-bold" style={{ color: "hsl(var(--hud-text))" }}>Suivi Colis</h3>
      </div>

      {/* Package selector */}
      <div className="flex gap-1.5 overflow-x-auto scrollbar-none">
        {MOCK_PACKAGES.map(p => (
          <button key={p.id} onClick={() => { setSelectedPkg(p.id); setShowFeedback(false); }}
            className="shrink-0 rounded-lg px-3 py-2 text-left transition-all"
            style={{
              background: selectedPkg === p.id ? "hsl(var(--hud-cyan) / 0.1)" : "hsl(var(--hud-surface))",
              border: `1px solid ${selectedPkg === p.id ? "hsl(var(--hud-cyan) / 0.2)" : "hsl(var(--hud-border) / 0.06)"}`,
            }}>
            <p className="text-[10px] font-bold" style={{ color: "hsl(var(--hud-text))" }}>{p.trackingCode}</p>
            <p className="text-[8px]" style={{ color: "hsl(var(--hud-text-dim) / 0.4)" }}>{p.description}</p>
          </button>
        ))}
      </div>

      {/* ETA / Status banner */}
      <div className="rounded-xl p-3 text-center" style={{
        background: isDelivered ? "hsl(var(--success) / 0.06)" : "hsl(var(--hud-cyan) / 0.06)",
        border: `1px solid ${isDelivered ? "hsl(var(--success) / 0.12)" : "hsl(var(--hud-cyan) / 0.12)"}`,
      }}>
        {isDelivered ? (
          <>
            <p className="text-lg">🏁</p>
            <p className="text-[12px] font-bold mt-1" style={{ color: "hsl(var(--success))" }}>Livré à {pkg.deliveredAt}</p>
            <p className="text-[9px]" style={{ color: "hsl(var(--hud-text-dim) / 0.5)" }}>Par {pkg.driverName}</p>
          </>
        ) : (
          <>
            <p className="text-lg">🚚</p>
            <p className="text-[12px] font-bold mt-1" style={{ color: "hsl(var(--hud-cyan))" }}>
              Arrivée estimée : {pkg.eta}
            </p>
            <p className="text-[10px] font-semibold" style={{ color: "hsl(var(--hud-text))" }}>
              dans ~{pkg.etaMinutes} min
            </p>
            <p className="text-[9px] mt-1" style={{ color: "hsl(var(--hud-text-dim) / 0.4)" }}>
              🚗 {pkg.driverName} • {pkg.driverVehicle} • ⭐ {pkg.driverRating}
            </p>
          </>
        )}
      </div>

      {/* Route */}
      <div className="rounded-xl p-3 flex items-center gap-3" style={{ background: "hsl(var(--hud-surface))", border: "1px solid hsl(var(--hud-border) / 0.08)" }}>
        <div className="flex flex-col items-center gap-0.5">
          <div className="w-2 h-2 rounded-full" style={{ background: "hsl(var(--success))" }} />
          <div className="w-0.5 h-6" style={{ background: "hsl(var(--hud-border) / 0.15)" }} />
          <div className="w-2 h-2 rounded-full" style={{ background: isDelivered ? "hsl(var(--success))" : "hsl(var(--hud-cyan))" }} />
        </div>
        <div className="flex-1 space-y-3">
          <div>
            <p className="text-[8px] font-semibold" style={{ color: "hsl(var(--hud-text-dim) / 0.4)" }}>RETRAIT</p>
            <p className="text-[10px]" style={{ color: "hsl(var(--hud-text))" }}>{pkg.origin}</p>
          </div>
          <div>
            <p className="text-[8px] font-semibold" style={{ color: "hsl(var(--hud-text-dim) / 0.4)" }}>LIVRAISON</p>
            <p className="text-[10px]" style={{ color: "hsl(var(--hud-text))" }}>{pkg.destination}</p>
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="rounded-xl p-3 space-y-0" style={{ background: "hsl(var(--hud-surface))", border: "1px solid hsl(var(--hud-border) / 0.08)" }}>
        <p className="text-[10px] font-bold mb-2" style={{ color: "hsl(var(--hud-text))" }}>Suivi en temps réel</p>
        {pkg.steps.map((step, i) => {
          const isActive = step.status === "active";
          const isCompleted = step.status === "completed";
          const lineColor = isCompleted ? "hsl(var(--success))" : "hsl(var(--hud-border) / 0.1)";
          return (
            <div key={step.id} className="flex items-start gap-3">
              <div className="flex flex-col items-center">
                <div className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] shrink-0"
                  style={{
                    background: isCompleted ? "hsl(var(--success) / 0.12)" : isActive ? "hsl(var(--hud-cyan) / 0.12)" : "hsl(var(--hud-bg))",
                    border: `1.5px solid ${isCompleted ? "hsl(var(--success))" : isActive ? "hsl(var(--hud-cyan))" : "hsl(var(--hud-border) / 0.15)"}`,
                  }}>
                  {step.emoji}
                </div>
                {i < pkg.steps.length - 1 && (
                  <div className="w-0.5 h-5" style={{ background: lineColor }} />
                )}
              </div>
              <div className="pb-2 flex-1">
                <p className="text-[10px] font-semibold" style={{
                  color: isCompleted ? "hsl(var(--hud-text))" : isActive ? "hsl(var(--hud-cyan))" : "hsl(var(--hud-text-dim) / 0.3)",
                }}>{step.label}</p>
                {step.time && (
                  <p className="text-[8px]" style={{ color: "hsl(var(--hud-text-dim) / 0.3)" }}>{step.time}</p>
                )}
                {isActive && (
                  <motion.div animate={{ opacity: [0.5, 1, 0.5] }} transition={{ repeat: Infinity, duration: 2 }}
                    className="text-[8px] mt-0.5 font-semibold" style={{ color: "hsl(var(--hud-cyan))" }}>
                    En cours…
                  </motion.div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Feedback section for delivered packages */}
      {isDelivered && !showFeedback && (
        <Button size="sm" className="w-full text-xs h-9" onClick={() => setShowFeedback(true)}
          style={{ background: "hsl(var(--warning) / 0.12)", color: "hsl(var(--warning))" }}>
          <Star className="h-3.5 w-3.5 mr-1" /> Évaluer la livraison
        </Button>
      )}

      <AnimatePresence>
        {showFeedback && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
            className="rounded-xl p-3 space-y-3 overflow-hidden"
            style={{ background: "hsl(var(--hud-surface))", border: "1px solid hsl(var(--warning) / 0.12)" }}>
            <p className="text-[10px] font-bold" style={{ color: "hsl(var(--hud-text))" }}>Évaluez {pkg.driverName}</p>
            <div className="flex gap-1 justify-center">
              {[1, 2, 3, 4, 5].map(s => (
                <button key={s} onClick={() => setRating(s)} className="text-lg transition-transform hover:scale-110">
                  {s <= rating ? "⭐" : "☆"}
                </button>
              ))}
            </div>
            <Textarea placeholder="Un commentaire ? (optionnel)" value={comment} onChange={e => setComment(e.target.value)}
              rows={2} className="text-xs"
              style={{ background: "hsl(var(--hud-bg))", borderColor: "hsl(var(--hud-border) / 0.12)", color: "hsl(var(--hud-text))" }} />
            <div className="flex gap-2">
              <Button size="sm" className="flex-1 text-xs h-8" disabled={rating === 0}
                style={{ background: "hsl(var(--success))", color: "#fff" }}>
                <CheckCircle2 className="h-3 w-3 mr-1" /> Envoyer
              </Button>
              <Button size="sm" variant="ghost" className="text-xs h-8" onClick={() => setShowFeedback(false)}
                style={{ color: "hsl(var(--hud-text-dim) / 0.5)" }}>Annuler</Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Notifications */}
      <div className="rounded-xl p-3 space-y-2" style={{ background: "hsl(var(--hud-surface))", border: "1px solid hsl(var(--hud-border) / 0.08)" }}>
        <p className="text-[10px] font-bold flex items-center gap-1" style={{ color: "hsl(var(--hud-text))" }}>
          <Bell className="h-3 w-3" /> Notifications récentes
        </p>
        {[
          { time: "14:05", msg: "Votre colis est en route vers vous", emoji: "🚗" },
          { time: "13:50", msg: "Le livreur a récupéré votre colis", emoji: "📦" },
          { time: "13:35", msg: "Votre colis est prêt pour l'enlèvement", emoji: "✅" },
        ].map((n, i) => (
          <div key={i} className="flex items-center gap-2 text-[9px]" style={{ color: "hsl(var(--hud-text-dim) / 0.5)" }}>
            <span>{n.emoji}</span>
            <span className="flex-1">{n.msg}</span>
            <span className="font-mono" style={{ color: "hsl(var(--hud-text-dim) / 0.3)" }}>{n.time}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
