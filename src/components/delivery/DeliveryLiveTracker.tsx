/**
 * DeliveryLiveTracker — Live GPS tracking panel for delivery jobs.
 * Uses existing ServiceTrackingMap + live_trackings infrastructure.
 * PASS79-J: Live GPS Tracking
 */
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, Navigation, Clock, Loader2, X, Satellite } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDeliveryTracking } from "@/hooks/useDeliveryTracking";
import ServiceTrackingMap from "@/components/tracking/ServiceTrackingMap";

const STATUS_LABELS: Record<string, { label: string; emoji: string; color: string }> = {
  pending: { label: "En attente", emoji: "⏳", color: "hsl(var(--hud-text-dim))" },
  en_route: { label: "En route", emoji: "🚗", color: "hsl(var(--hud-cyan))" },
  nearby: { label: "À proximité", emoji: "📍", color: "hsl(var(--warning))" },
  arrived: { label: "Arrivé", emoji: "✅", color: "hsl(var(--success))" },
  completed: { label: "Terminé", emoji: "🏁", color: "hsl(var(--success))" },
};

interface Props {
  jobId: string;
  onClose: () => void;
}

export default function DeliveryLiveTracker({ jobId, onClose }: Props) {
  const { session, loading, hasTracking } = useDeliveryTracking(jobId);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8 gap-2">
        <Loader2 className="h-4 w-4 animate-spin" style={{ color: "hsl(var(--hud-cyan))" }} />
        <span className="text-[11px]" style={{ color: "hsl(var(--hud-text-dim))" }}>
          Recherche du tracking…
        </span>
      </div>
    );
  }

  if (!hasTracking || !session) {
    return (
      <div className="space-y-3">
        <div className="flex flex-col items-center py-8 text-center">
          <Satellite className="h-8 w-8 mb-2" style={{ color: "hsl(var(--hud-text-dim) / 0.15)" }} />
          <p className="text-xs font-medium" style={{ color: "hsl(var(--hud-text-dim) / 0.5)" }}>
            Pas de tracking actif
          </p>
          <p className="text-[10px] mt-1" style={{ color: "hsl(var(--hud-text-dim) / 0.3)" }}>
            Le tracking GPS démarre quand le livreur accepte la mission
          </p>
        </div>
        <Button size="sm" variant="ghost" className="w-full text-xs h-8" onClick={onClose}
          style={{ color: "hsl(var(--hud-text-dim) / 0.5)" }}>
          Fermer
        </Button>
      </div>
    );
  }

  const statusCfg = STATUS_LABELS[session.status] || STATUS_LABELS.pending;

  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm">{statusCfg.emoji}</span>
          <div>
            <p className="text-xs font-bold" style={{ color: "hsl(var(--hud-text))" }}>
              {statusCfg.label}
            </p>
            {session.eta_minutes != null && (
              <p className="text-[10px] flex items-center gap-1" style={{ color: "hsl(var(--hud-cyan))" }}>
                <Clock className="h-3 w-3" />
                ETA: {session.eta_minutes} min
              </p>
            )}
          </div>
        </div>
        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={onClose}>
          <X className="h-3.5 w-3.5" style={{ color: "hsl(var(--hud-text-dim) / 0.4)" }} />
        </Button>
      </div>

      {/* Map */}
      <div className="rounded-xl overflow-hidden" style={{ border: "1px solid hsl(var(--hud-border) / 0.1)" }}>
        <ServiceTrackingMap session={session} className="h-48 w-full" />
      </div>

      {/* Position info */}
      <div className="grid grid-cols-2 gap-2">
        {session.current_lat != null && (
          <div className="rounded-lg px-2.5 py-2"
            style={{ background: "hsl(var(--hud-surface))", border: "1px solid hsl(var(--hud-border) / 0.08)" }}>
            <div className="flex items-center gap-1 mb-0.5">
              <Navigation className="h-3 w-3" style={{ color: "hsl(var(--hud-cyan))" }} />
              <span className="text-[9px] font-semibold" style={{ color: "hsl(var(--hud-text-dim))" }}>Position</span>
            </div>
            <p className="text-[10px] font-mono" style={{ color: "hsl(var(--hud-text))" }}>
              {session.current_lat.toFixed(4)}, {session.current_lng?.toFixed(4)}
            </p>
          </div>
        )}
        {session.destination_lat != null && (
          <div className="rounded-lg px-2.5 py-2"
            style={{ background: "hsl(var(--hud-surface))", border: "1px solid hsl(var(--hud-border) / 0.08)" }}>
            <div className="flex items-center gap-1 mb-0.5">
              <MapPin className="h-3 w-3" style={{ color: "hsl(var(--warning))" }} />
              <span className="text-[9px] font-semibold" style={{ color: "hsl(var(--hud-text-dim))" }}>Destination</span>
            </div>
            <p className="text-[10px] font-mono" style={{ color: "hsl(var(--hud-text))" }}>
              {session.destination_lat.toFixed(4)}, {session.destination_lng?.toFixed(4)}
            </p>
          </div>
        )}
      </div>

      {/* Live indicator */}
      <div className="flex items-center justify-center gap-1.5 py-1">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
            style={{ background: statusCfg.color }} />
          <span className="relative inline-flex rounded-full h-2 w-2"
            style={{ background: statusCfg.color }} />
        </span>
        <span className="text-[9px] font-semibold" style={{ color: statusCfg.color }}>
          LIVE
        </span>
        {session.updated_at && (
          <span className="text-[8px]" style={{ color: "hsl(var(--hud-text-dim) / 0.3)" }}>
            · {new Date(session.updated_at).toLocaleTimeString("fr", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
          </span>
        )}
      </div>
    </div>
  );
}
