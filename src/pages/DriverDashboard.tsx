/**
 * DriverDashboard — Mobile-first driver dashboard with missions, earnings, online toggle.
 * PASS70-B
 */
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Power, Navigation, Package, Clock, CheckCircle2,
  XCircle, MapPin, ChevronRight, TrendingUp, Star,
  Truck, AlertCircle, Phone,
} from "lucide-react";
import { useDriverSession } from "@/hooks/useDriverSession";
import { useDriverMissions, type DeliveryJob } from "@/hooks/useDriverMissions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { haptic } from "@/lib/haptics";
import { toast } from "sonner";

const STATUS_CONFIG: Record<string, { label: string; emoji: string; color: string }> = {
  assigned: { label: "Nouvelle mission", emoji: "📩", color: "hsl(var(--warning))" },
  accepted: { label: "Acceptée", emoji: "✅", color: "hsl(var(--info))" },
  in_progress: { label: "En cours", emoji: "🚗", color: "hsl(var(--hud-cyan))" },
  completed: { label: "Terminée", emoji: "🏁", color: "hsl(var(--success))" },
  cancelled: { label: "Annulée", emoji: "❌", color: "hsl(var(--destructive))" },
};

const PRIORITY_BADGE: Record<string, string> = {
  urgent: "🔴",
  express: "🟠",
  standard: "🟢",
};

function MissionCard({ mission, onAccept, onPickup, onDeliver, onCancel }: {
  mission: DeliveryJob;
  onAccept: () => void;
  onPickup: () => void;
  onDeliver: () => void;
  onCancel: () => void;
}) {
  const cfg = STATUS_CONFIG[mission.status] || STATUS_CONFIG.assigned;
  const [expanded, setExpanded] = useState(false);

  return (
    <motion.div
      layout
      className="rounded-xl overflow-hidden"
      style={{
        background: "hsl(var(--hud-surface))",
        border: `1px solid hsl(var(--hud-border) / 0.15)`,
      }}
    >
      <button
        className="w-full flex items-center gap-3 px-4 py-3.5 text-left"
        onClick={() => { setExpanded(!expanded); haptic("light"); }}
      >
        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: `${cfg.color}15` }}>
          <span className="text-lg">{cfg.emoji}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-xs font-bold truncate" style={{ color: "hsl(var(--hud-text))" }}>
              {mission.package_description || "Colis"}
            </p>
            <span className="text-xs">{PRIORITY_BADGE[mission.priority] || "🟢"}</span>
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <MapPin className="h-2.5 w-2.5 shrink-0" style={{ color: cfg.color }} />
            <span className="text-[10px] truncate" style={{ color: "hsl(var(--hud-text-dim))" }}>
              {mission.dropoff_address || "—"}
            </span>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          {mission.delivery_fee != null && (
            <span className="text-xs font-bold" style={{ color: "hsl(var(--hud-cyan))" }}>
              {mission.delivery_fee.toFixed(2)} {mission.currency || "EUR"}
            </span>
          )}
          <ChevronRight
            className="h-3.5 w-3.5 transition-transform"
            style={{
              color: "hsl(var(--hud-text-dim) / 0.3)",
              transform: expanded ? "rotate(90deg)" : "rotate(0)",
            }}
          />
        </div>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-3">
              {/* Addresses */}
              <div className="space-y-2">
                <div className="flex items-start gap-2">
                  <div className="w-5 h-5 rounded-full flex items-center justify-center mt-0.5 shrink-0"
                    style={{ background: "hsl(var(--success) / 0.15)" }}>
                    <span className="text-[10px]">📦</span>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold" style={{ color: "hsl(var(--hud-text-dim))" }}>Retrait</p>
                    <p className="text-xs" style={{ color: "hsl(var(--hud-text))" }}>{mission.pickup_address || "—"}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-5 h-5 rounded-full flex items-center justify-center mt-0.5 shrink-0"
                    style={{ background: "hsl(var(--info) / 0.15)" }}>
                    <span className="text-[10px]">📍</span>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold" style={{ color: "hsl(var(--hud-text-dim))" }}>Livraison</p>
                    <p className="text-xs" style={{ color: "hsl(var(--hud-text))" }}>{mission.dropoff_address || "—"}</p>
                  </div>
                </div>
              </div>

              {mission.notes && (
                <p className="text-[10px] px-3 py-2 rounded-lg" style={{ background: "hsl(var(--hud-surface-2))", color: "hsl(var(--hud-text-dim))" }}>
                  {mission.notes}
                </p>
              )}

              {/* Actions */}
              <div className="flex gap-2">
                {mission.status === "assigned" && (
                  <>
                    <Button size="sm" className="flex-1 text-xs h-9" onClick={onAccept}
                      style={{ background: "hsl(var(--success))", color: "#fff" }}>
                      <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Accepter
                    </Button>
                    <Button size="sm" variant="outline" className="text-xs h-9" onClick={onCancel}
                      style={{ borderColor: "hsl(var(--destructive) / 0.3)", color: "hsl(var(--destructive))" }}>
                      <XCircle className="h-3.5 w-3.5" />
                    </Button>
                  </>
                )}
                {mission.status === "accepted" && (
                  <Button size="sm" className="flex-1 text-xs h-9" onClick={onPickup}
                    style={{ background: "hsl(var(--info))", color: "#fff" }}>
                    <Package className="h-3.5 w-3.5 mr-1" /> Colis récupéré
                  </Button>
                )}
                {mission.status === "in_progress" && (
                  <Button size="sm" className="flex-1 text-xs h-9" onClick={onDeliver}
                    style={{ background: "hsl(var(--hud-cyan))", color: "hsl(var(--hud-bg))" }}>
                    <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Livré
                  </Button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function DriverDashboard() {
  const { session, isOnline, goOnline, goOffline, loading: sessionLoading } = useDriverSession();
  const { activeMissions, completedMissions, stats, loading: missionsLoading, acceptMission, updateStatus, confirmDelivery } = useDriverMissions();
  const [tab, setTab] = useState<"active" | "history">("active");

  const handleToggleOnline = async () => {
    haptic("medium");
    try {
      if (isOnline) {
        await goOffline();
        toast.success("Vous êtes hors ligne");
      } else {
        await goOnline();
        toast.success("Vous êtes en ligne !");
      }
    } catch { toast.error("Erreur de connexion"); }
  };

  const handleAccept = async (jobId: string) => {
    haptic("medium");
    try { await acceptMission(jobId); toast.success("Mission acceptée !"); }
    catch { toast.error("Erreur d'acceptation"); }
  };

  const handlePickup = async (jobId: string) => {
    haptic("medium");
    try { await updateStatus(jobId, "in_progress"); toast.success("Colis récupéré"); }
    catch { toast.error("Erreur de mise à jour"); }
  };

  const handleDeliver = async (jobId: string) => {
    haptic("medium");
    // For now, mark completed directly. Confirmation code flow can be added.
    try { await updateStatus(jobId, "completed"); toast.success("Livraison confirmée !"); }
    catch { toast.error("Erreur de confirmation"); }
  };

  const handleCancel = async (jobId: string) => {
    haptic("warning");
    try { await updateStatus(jobId, "cancelled", "driver_declined"); toast("Mission refusée"); }
    catch { toast.error("Erreur"); }
  };

  const loading = sessionLoading || missionsLoading;

  return (
    <div className="min-h-screen" style={{ background: "hsl(var(--hud-bg))" }}>
      {/* Header */}
      <div className="px-4 pt-6 pb-4">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-lg font-bold" style={{ color: "hsl(var(--hud-text))" }}>
              🚀 Driver Hub
            </h1>
            <p className="text-[11px] mt-0.5" style={{ color: "hsl(var(--hud-text-dim) / 0.5)" }}>
              Gérez vos missions de livraison
            </p>
          </div>

          {/* Online toggle */}
          <motion.button
            whileTap={{ scale: 0.92 }}
            onClick={handleToggleOnline}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-xs transition-all"
            style={{
              background: isOnline ? "hsl(var(--success) / 0.15)" : "hsl(var(--hud-surface-2))",
              color: isOnline ? "hsl(var(--success))" : "hsl(var(--hud-text-dim))",
              border: `1px solid ${isOnline ? "hsl(var(--success) / 0.3)" : "hsl(var(--hud-border) / 0.1)"}`,
            }}
          >
            <Power className="h-4 w-4" />
            {isOnline ? "En ligne" : "Hors ligne"}
          </motion.button>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: "Missions", value: stats.completed, icon: CheckCircle2, color: "--success" },
            { label: "Revenus", value: `${stats.totalEarnings.toFixed(0)}€`, icon: TrendingUp, color: "--hud-cyan" },
            { label: "Note", value: session?.avg_rating ? `${session.avg_rating.toFixed(1)}⭐` : "—", icon: Star, color: "--warning" },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="rounded-xl px-3 py-3 text-center"
              style={{ background: "hsl(var(--hud-surface))", border: "1px solid hsl(var(--hud-border) / 0.08)" }}>
              <Icon className="h-4 w-4 mx-auto mb-1" style={{ color: `hsl(var(${color}))` }} />
              <p className="text-sm font-bold" style={{ color: "hsl(var(--hud-text))" }}>{value}</p>
              <p className="text-[9px]" style={{ color: "hsl(var(--hud-text-dim) / 0.4)" }}>{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 mx-4 mb-3 p-1 rounded-xl" style={{ background: "hsl(var(--hud-surface))" }}>
        {(["active", "history"] as const).map(t => (
          <button
            key={t}
            onClick={() => { setTab(t); haptic("light"); }}
            className="flex-1 py-2 rounded-lg text-xs font-semibold transition-all"
            style={{
              background: tab === t ? "hsl(var(--hud-cyan) / 0.12)" : "transparent",
              color: tab === t ? "hsl(var(--hud-cyan))" : "hsl(var(--hud-text-dim) / 0.5)",
            }}
          >
            {t === "active" ? `Missions (${stats.active})` : "Historique"}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="px-4 pb-8 space-y-2">
        {loading ? (
          <div className="flex flex-col items-center py-16">
            <Truck className="h-8 w-8 animate-pulse" style={{ color: "hsl(var(--hud-cyan) / 0.3)" }} />
            <p className="text-[11px] mt-2" style={{ color: "hsl(var(--hud-text-dim) / 0.4)" }}>Chargement…</p>
          </div>
        ) : tab === "active" ? (
          activeMissions.length === 0 ? (
            <div className="flex flex-col items-center py-16 text-center">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-3"
                style={{ background: "hsl(var(--hud-cyan) / 0.08)" }}>
                <Navigation className="h-7 w-7" style={{ color: "hsl(var(--hud-cyan) / 0.25)" }} />
              </div>
              <p className="text-sm font-semibold" style={{ color: "hsl(var(--hud-text))" }}>
                {isOnline ? "En attente de missions" : "Passez en ligne"}
              </p>
              <p className="text-[10px] max-w-[220px] mt-1" style={{ color: "hsl(var(--hud-text-dim) / 0.4)" }}>
                {isOnline
                  ? "Les nouvelles missions apparaîtront ici automatiquement."
                  : "Activez votre statut pour recevoir des missions."}
              </p>
            </div>
          ) : (
            activeMissions.map(m => (
              <MissionCard
                key={m.id}
                mission={m}
                onAccept={() => handleAccept(m.id)}
                onPickup={() => handlePickup(m.id)}
                onDeliver={() => handleDeliver(m.id)}
                onCancel={() => handleCancel(m.id)}
              />
            ))
          )
        ) : (
          completedMissions.length === 0 ? (
            <div className="flex flex-col items-center py-16 text-center">
              <Clock className="h-7 w-7" style={{ color: "hsl(var(--hud-text-dim) / 0.2)" }} />
              <p className="text-xs mt-2" style={{ color: "hsl(var(--hud-text-dim) / 0.4)" }}>Aucun historique</p>
            </div>
          ) : (
            completedMissions.map(m => {
              const cfg = STATUS_CONFIG[m.status] || STATUS_CONFIG.completed;
              return (
                <div key={m.id} className="flex items-center gap-3 px-4 py-3 rounded-xl"
                  style={{ background: "hsl(var(--hud-surface))", border: "1px solid hsl(var(--hud-border) / 0.06)" }}>
                  <span className="text-base">{cfg.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold truncate" style={{ color: "hsl(var(--hud-text))" }}>
                      {m.package_description || "Colis"}
                    </p>
                    <p className="text-[10px]" style={{ color: "hsl(var(--hud-text-dim) / 0.4)" }}>
                      {m.delivered_at ? new Date(m.delivered_at).toLocaleDateString("fr") : "—"}
                    </p>
                  </div>
                  {m.delivery_fee != null && (
                    <span className="text-xs font-bold" style={{ color: m.status === "completed" ? "hsl(var(--success))" : "hsl(var(--destructive))" }}>
                      {m.status === "completed" ? "+" : ""}{m.delivery_fee.toFixed(2)}€
                    </span>
                  )}
                </div>
              );
            })
          )
        )}
      </div>
    </div>
  );
}
