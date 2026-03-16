/**
 * TrackingDashboard — Lists all active tracking sessions for org managers.
 * Shows live status, ETA, and can open individual session views.
 * PASS55 Block G
 */
import { useState, lazy, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Navigation, Clock, MapPin, Truck, Eye,
  Radar, ChevronRight, Activity,
} from "lucide-react";
import { useOrgTrackingSessions, useTrackingObserver } from "@/hooks/useServiceTracking";
import TrackingStatusBar from "./TrackingStatusBar";
import { haptic } from "@/lib/haptics";
import { Badge } from "@/components/ui/badge";

const ServiceTrackingMap = lazy(() => import("./ServiceTrackingMap"));

const STATUS_CONFIG: Record<string, { color: string; label: string; emoji: string }> = {
  pending: { color: "--hud-text-dim", label: "En attente", emoji: "⏳" },
  en_route: { color: "--hud-cyan", label: "En route", emoji: "🚗" },
  nearby: { color: "--hud-warning", label: "À proximité", emoji: "📍" },
  arrived: { color: "--hud-success", label: "Arrivé", emoji: "🏁" },
  completed: { color: "--hud-accent", label: "Terminé", emoji: "✅" },
};

function SessionDetailPanel({ sessionId }: { sessionId: string }) {
  const { session, distanceKm } = useTrackingObserver(sessionId);
  if (!session) return null;

  return (
    <div className="space-y-3">
      <Suspense fallback={
        <div className="h-[250px] rounded-xl flex items-center justify-center" style={{ background: "hsl(var(--hud-bg))" }}>
          <Radar className="h-6 w-6 animate-spin" style={{ color: "hsl(var(--hud-cyan))" }} />
        </div>
      }>
        <div className="rounded-xl overflow-hidden" style={{ height: 250 }}>
          <ServiceTrackingMap session={session} className="w-full h-full" />
        </div>
      </Suspense>
      <TrackingStatusBar session={session} distanceKm={distanceKm} />
    </div>
  );
}

export default function TrackingDashboard() {
  const { sessions, loading } = useOrgTrackingSessions();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20" style={{ background: "hsl(var(--hud-bg))" }}>
        <Radar className="h-10 w-10 animate-spin mb-3" style={{ color: "hsl(var(--hud-cyan) / 0.3)" }} />
        <p className="text-xs" style={{ color: "hsl(var(--hud-text-dim) / 0.5)" }}>Chargement du suivi…</p>
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center px-6" style={{ background: "hsl(var(--hud-bg))" }}>
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4" style={{ background: "hsl(var(--hud-cyan) / 0.08)" }}>
          <Navigation className="h-8 w-8" style={{ color: "hsl(var(--hud-cyan) / 0.3)" }} />
        </div>
        <p className="text-sm font-semibold mb-1" style={{ color: "hsl(var(--hud-text))" }}>Aucun suivi actif</p>
        <p className="text-[11px] max-w-[240px]" style={{ color: "hsl(var(--hud-text-dim) / 0.4)" }}>
          Les sessions de suivi apparaîtront ici lorsqu'un agent, technicien ou livreur sera en route.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2 p-3" style={{ background: "hsl(var(--hud-bg))" }}>
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <Activity className="h-4 w-4" style={{ color: "hsl(var(--hud-cyan))" }} />
        <h3 className="text-sm font-bold" style={{ color: "hsl(var(--hud-text))" }}>
          Suivi en direct
        </h3>
        <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
          style={{ background: "hsl(var(--hud-cyan) / 0.1)", color: "hsl(var(--hud-cyan))" }}>
          {sessions.length} actif{sessions.length > 1 ? "s" : ""}
        </span>
      </div>

      {/* Sessions list */}
      {sessions.map((session) => {
        const cfg = STATUS_CONFIG[session.status] || STATUS_CONFIG.pending;
        const isExpanded = expandedId === session.id;

        return (
          <motion.div
            key={session.id}
            layout
            className="rounded-xl overflow-hidden"
            style={{ background: "hsl(var(--hud-surface))", border: `1px solid hsl(var(${cfg.color}) / 0.15)` }}
          >
            {/* Session row */}
            <button
              className="w-full flex items-center gap-3 px-3 py-3 text-left"
              onClick={() => {
                setExpandedId(isExpanded ? null : session.id);
                haptic("light");
              }}
            >
              <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: `hsl(var(${cfg.color}) / 0.1)` }}>
                <span className="text-base">{cfg.emoji}</span>
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold truncate" style={{ color: "hsl(var(--hud-text))" }}>
                  {session.context_label || session.context_type}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[10px] font-medium" style={{ color: `hsl(var(${cfg.color}))` }}>
                    {cfg.label}
                  </span>
                  {session.eta_minutes && session.status === "en_route" && (
                    <span className="flex items-center gap-0.5 text-[10px]" style={{ color: "hsl(var(--hud-cyan))" }}>
                      <Clock className="h-2.5 w-2.5" /> {session.eta_minutes} min
                    </span>
                  )}
                </div>
              </div>

              <ChevronRight
                className="h-4 w-4 transition-transform shrink-0"
                style={{
                  color: "hsl(var(--hud-text-dim) / 0.3)",
                  transform: isExpanded ? "rotate(90deg)" : "rotate(0)",
                }}
              />
            </button>

            {/* Expanded detail */}
            <AnimatePresence>
              {isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="px-3 pb-3">
                    <SessionDetailPanel sessionId={session.id} />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        );
      })}
    </div>
  );
}
