/**
 * LiveTrackingMap — Deliveroo/Uber-style real-time tracking map.
 * Shows live position, route trail, ETA, and status with premium UX.
 */
import { useEffect, useRef, useMemo } from "react";
import { useTrackingViewer, type TrackingStatus } from "@/hooks/useLiveTracking";
import { MapPin, Navigation, Clock, CheckCircle2, Truck, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface LiveTrackingMapProps {
  trackingId: string;
  className?: string;
  compact?: boolean;
}

const STATUS_CONFIG: Record<TrackingStatus, {
  label: string;
  labelFr: string;
  color: string;
  bgColor: string;
  icon: typeof MapPin;
  pulse: boolean;
}> = {
  pending: { label: "Preparing", labelFr: "Préparation", color: "text-muted-foreground", bgColor: "bg-muted", icon: Clock, pulse: false },
  en_route: { label: "On the way", labelFr: "En route", color: "text-blue-600", bgColor: "bg-blue-500/10", icon: Navigation, pulse: true },
  nearby: { label: "Almost there", labelFr: "Presque arrivé", color: "text-amber-600", bgColor: "bg-amber-500/10", icon: Truck, pulse: true },
  arrived: { label: "Arrived", labelFr: "Arrivé", color: "text-emerald-600", bgColor: "bg-emerald-500/10", icon: CheckCircle2, pulse: false },
  completed: { label: "Completed", labelFr: "Terminé", color: "text-emerald-600", bgColor: "bg-emerald-500/10", icon: CheckCircle2, pulse: false },
  cancelled: { label: "Cancelled", labelFr: "Annulé", color: "text-destructive", bgColor: "bg-destructive/10", icon: X, pulse: false },
};

export default function LiveTrackingMap({ trackingId, className, compact }: LiveTrackingMapProps) {
  const { tracking, positions, isComplete } = useTrackingViewer(trackingId);
  const mapRef = useRef<HTMLDivElement>(null);

  const statusConfig = tracking ? STATUS_CONFIG[tracking.status] : STATUS_CONFIG.pending;
  const StatusIcon = statusConfig.icon;

  const etaDisplay = useMemo(() => {
    if (!tracking?.eta_minutes) return null;
    if (tracking.eta_minutes < 1) return "< 1 min";
    if (tracking.eta_minutes > 60) return `${Math.round(tracking.eta_minutes / 60)}h ${tracking.eta_minutes % 60}min`;
    return `${tracking.eta_minutes} min`;
  }, [tracking?.eta_minutes]);

  const speedDisplay = useMemo(() => {
    if (!tracking?.speed_kmh || tracking.speed_kmh < 1) return null;
    return `${Math.round(tracking.speed_kmh)} km/h`;
  }, [tracking?.speed_kmh]);

  // Map rendering via iframe (Leaflet/OpenStreetMap)
  const mapUrl = useMemo(() => {
    if (!tracking?.current_lat || !tracking?.current_lng) return null;
    const lat = tracking.current_lat;
    const lng = tracking.current_lng;
    return `https://www.openstreetmap.org/export/embed.html?bbox=${lng - 0.01},${lat - 0.01},${lng + 0.01},${lat + 0.01}&layer=mapnik&marker=${lat},${lng}`;
  }, [tracking?.current_lat, tracking?.current_lng]);

  if (!tracking) {
    return (
      <div className={cn("flex items-center justify-center p-8 rounded-xl bg-card border border-border", className)}>
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <div className="h-8 w-8 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
          <span className="text-sm">Loading tracking…</span>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("rounded-xl bg-card border border-border overflow-hidden shadow-lg", className)}>
      {/* Map Area */}
      <div className="relative" style={{ height: compact ? 200 : 300 }}>
        {mapUrl ? (
          <iframe
            src={mapUrl}
            className="w-full h-full border-0"
            title="Live tracking map"
            loading="eager"
          />
        ) : (
          <div className="w-full h-full bg-muted flex items-center justify-center">
            <MapPin className="h-8 w-8 text-muted-foreground/40" />
          </div>
        )}

        {/* Status badge overlay */}
        <div className="absolute top-3 left-3">
          <div className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-full backdrop-blur-md border",
            statusConfig.bgColor, statusConfig.color,
            "border-white/20 shadow-sm"
          )}>
            {statusConfig.pulse && (
              <span className="relative flex h-2.5 w-2.5">
                <span className={cn("animate-ping absolute inline-flex h-full w-full rounded-full opacity-75", statusConfig.color === "text-blue-600" ? "bg-blue-500" : "bg-amber-500")} />
                <span className={cn("relative inline-flex rounded-full h-2.5 w-2.5", statusConfig.color === "text-blue-600" ? "bg-blue-500" : "bg-amber-500")} />
              </span>
            )}
            <StatusIcon className="h-3.5 w-3.5" />
            <span className="text-xs font-semibold">{statusConfig.labelFr}</span>
          </div>
        </div>

        {/* ETA overlay */}
        {etaDisplay && !isComplete && (
          <div className="absolute top-3 right-3 bg-background/90 backdrop-blur-md rounded-lg px-3 py-2 border border-border shadow-sm">
            <div className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-primary" />
              <span className="text-sm font-bold text-foreground">{etaDisplay}</span>
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5">Arrivée estimée</p>
          </div>
        )}
      </div>

      {/* Info panel */}
      <div className="p-4 space-y-3">
        {/* Context label */}
        {tracking.context_label && (
          <p className="text-sm font-medium text-foreground truncate">{tracking.context_label}</p>
        )}

        {/* Stats row */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-4">
            {speedDisplay && (
              <span className="flex items-center gap-1">
                <Navigation className="h-3 w-3" />
                {speedDisplay}
              </span>
            )}
            {positions.length > 0 && (
              <span>{positions.length} positions</span>
            )}
          </div>

          {tracking.started_at && (
            <span>
              Démarré {new Date(tracking.started_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
            </span>
          )}
        </div>

        {/* Progress bar */}
        {!isComplete && tracking.status !== "pending" && (
          <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-1000",
                tracking.status === "en_route" && "bg-blue-500 w-1/3",
                tracking.status === "nearby" && "bg-amber-500 w-2/3",
                tracking.status === "arrived" && "bg-emerald-500 w-full",
              )}
            />
          </div>
        )}

        {isComplete && (
          <div className={cn(
            "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium",
            tracking.status === "completed" ? "bg-emerald-500/10 text-emerald-600" : "bg-destructive/10 text-destructive"
          )}>
            {tracking.status === "completed" ? (
              <><CheckCircle2 className="h-4 w-4" /> Tracking terminé</>
            ) : (
              <><X className="h-4 w-4" /> Tracking annulé</>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
