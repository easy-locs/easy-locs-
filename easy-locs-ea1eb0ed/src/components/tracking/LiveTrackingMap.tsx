/**
 * LiveTrackingMap — Premium Deliveroo/Uber-style real-time tracking map.
 * 
 * Uses native Leaflet (not iframe) with:
 * - Animated tracker marker with heading rotation
 * - Live route polyline trail
 * - Destination pin
 * - Origin pin
 * - Dynamic zoom following the tracker
 * - Premium status overlay + ETA + speed
 */
import { useEffect, useRef, useMemo, useCallback } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useTrackingViewer, type TrackingStatus } from "@/hooks/useLiveTracking";
import { MapPin, Navigation, Clock, CheckCircle2, Truck, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface LiveTrackingMapProps {
  trackingId: string;
  className?: string;
  compact?: boolean;
}

const STATUS_CONFIG: Record<TrackingStatus, {
  labelFr: string;
  dotClass: string;
  barClass: string;
  barWidth: string;
  icon: typeof MapPin;
  pulse: boolean;
}> = {
  pending:   { labelFr: "Préparation",    dotClass: "bg-muted-foreground",  barClass: "bg-muted-foreground", barWidth: "w-0",   icon: Clock,        pulse: false },
  en_route:  { labelFr: "En route",       dotClass: "bg-primary",           barClass: "bg-primary",          barWidth: "w-1/3", icon: Navigation,   pulse: true },
  nearby:    { labelFr: "Presque arrivé", dotClass: "bg-accent-foreground", barClass: "bg-accent",           barWidth: "w-2/3", icon: Truck,        pulse: true },
  arrived:   { labelFr: "Arrivé",         dotClass: "bg-primary",           barClass: "bg-primary",          barWidth: "w-full",icon: CheckCircle2, pulse: false },
  completed: { labelFr: "Terminé",        dotClass: "bg-primary",           barClass: "bg-primary",          barWidth: "w-full",icon: CheckCircle2, pulse: false },
  cancelled: { labelFr: "Annulé",         dotClass: "bg-destructive",       barClass: "bg-destructive",      barWidth: "w-full",icon: X,            pulse: false },
};

export default function LiveTrackingMap({ trackingId, className, compact }: LiveTrackingMapProps) {
  const { tracking, positions, isComplete } = useTrackingViewer(trackingId);
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const trackerMarkerRef = useRef<L.Marker | null>(null);
  const trailRef = useRef<L.Polyline | null>(null);
  const destMarkerRef = useRef<L.Marker | null>(null);
  const originMarkerRef = useRef<L.Marker | null>(null);

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

  // Build tracker icon with heading
  const createTrackerIcon = useCallback((heading: number = 0) => {
    return L.divIcon({
      className: "",
      html: `
        <div style="width:40px;height:40px;position:relative;">
          <div style="position:absolute;inset:0;border-radius:50%;background:hsl(var(--primary));opacity:0.15;animation:ping 2s cubic-bezier(0,0,0.2,1) infinite;"></div>
          <div style="position:absolute;inset:6px;border-radius:50%;background:hsl(var(--primary));border:3px solid hsl(var(--background));box-shadow:0 2px 12px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="transform:rotate(${heading}deg);">
              <polygon points="3 11 22 2 13 21 11 13 3 11"/>
            </svg>
          </div>
        </div>
      `,
      iconSize: [40, 40],
      iconAnchor: [20, 20],
    });
  }, []);

  const createDestinationIcon = useCallback(() => {
    return L.divIcon({
      className: "",
      html: `
        <div style="width:32px;height:44px;position:relative;">
          <svg width="32" height="44" viewBox="0 0 32 44" fill="none">
            <path d="M16 0C7.163 0 0 7.163 0 16c0 12 16 28 16 28s16-16 16-28C32 7.163 24.837 0 16 0z" fill="hsl(var(--destructive))"/>
            <circle cx="16" cy="16" r="8" fill="white"/>
            <circle cx="16" cy="16" r="4" fill="hsl(var(--destructive))"/>
          </svg>
        </div>
      `,
      iconSize: [32, 44],
      iconAnchor: [16, 44],
    });
  }, []);

  const createOriginIcon = useCallback(() => {
    return L.divIcon({
      className: "",
      html: `<div style="width:14px;height:14px;border-radius:50%;background:hsl(var(--muted-foreground));border:3px solid hsl(var(--background));box-shadow:0 1px 4px rgba(0,0,0,0.2);"></div>`,
      iconSize: [14, 14],
      iconAnchor: [7, 7],
    });
  }, []);

  // Initialize map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [0, 0],
      zoom: 14,
      zoomControl: false,
      attributionControl: false,
    });

    L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
      maxZoom: 19,
    }).addTo(map);

    L.control.zoom({ position: "bottomright" }).addTo(map);
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      trackerMarkerRef.current = null;
      trailRef.current = null;
      destMarkerRef.current = null;
      originMarkerRef.current = null;
    };
  }, []);

  // Update map when tracking data changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !tracking) return;

    const lat = tracking.current_lat;
    const lng = tracking.current_lng;

    // Add/update destination marker
    if (tracking.destination_lat && tracking.destination_lng && !destMarkerRef.current) {
      destMarkerRef.current = L.marker(
        [tracking.destination_lat, tracking.destination_lng],
        { icon: createDestinationIcon(), zIndexOffset: 500 }
      ).addTo(map).bindPopup("Destination");
    }

    // Add/update origin marker
    if (tracking.origin_lat && tracking.origin_lng && !originMarkerRef.current) {
      originMarkerRef.current = L.marker(
        [tracking.origin_lat, tracking.origin_lng],
        { icon: createOriginIcon(), zIndexOffset: 400 }
      ).addTo(map).bindPopup("Départ");
    }

    if (lat == null || lng == null) return;

    // Add/update tracker marker
    if (!trackerMarkerRef.current) {
      trackerMarkerRef.current = L.marker([lat, lng], {
        icon: createTrackerIcon(tracking.heading),
        zIndexOffset: 1000,
      }).addTo(map);
      map.setView([lat, lng], 15, { animate: true });
    } else {
      trackerMarkerRef.current.setLatLng([lat, lng]);
      trackerMarkerRef.current.setIcon(createTrackerIcon(tracking.heading));
      // Smooth pan to follow tracker
      if (!isComplete) {
        map.panTo([lat, lng], { animate: true, duration: 1 });
      }
    }
  }, [tracking, createTrackerIcon, createDestinationIcon, createOriginIcon, isComplete]);

  // Update route trail polyline
  useEffect(() => {
    const map = mapRef.current;
    if (!map || positions.length < 2) return;

    const latLngs: L.LatLngExpression[] = positions.map((p) => [p.lat, p.lng]);

    if (trailRef.current) {
      trailRef.current.setLatLngs(latLngs);
    } else {
      trailRef.current = L.polyline(latLngs, {
        color: "hsl(var(--primary))",
        weight: 4,
        opacity: 0.7,
        smoothFactor: 1,
        dashArray: "8 6",
      }).addTo(map);
    }
  }, [positions]);

  // Fit bounds when we have origin + destination
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !tracking) return;

    const bounds: L.LatLngExpression[] = [];
    if (tracking.current_lat && tracking.current_lng) bounds.push([tracking.current_lat, tracking.current_lng]);
    if (tracking.destination_lat && tracking.destination_lng) bounds.push([tracking.destination_lat, tracking.destination_lng]);
    if (tracking.origin_lat && tracking.origin_lng) bounds.push([tracking.origin_lat, tracking.origin_lng]);

    if (bounds.length >= 2 && !trackerMarkerRef.current) {
      map.fitBounds(L.latLngBounds(bounds), { padding: [40, 40], maxZoom: 16 });
    }
  }, [tracking?.destination_lat, tracking?.origin_lat]);

  if (!tracking) {
    return (
      <div className={cn("flex items-center justify-center p-8 rounded-xl bg-card border border-border", className)}>
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <div className="h-8 w-8 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
          <span className="text-sm">Chargement du suivi…</span>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("rounded-xl bg-card border border-border overflow-hidden shadow-lg", className)}>
      {/* Map */}
      <div className="relative" style={{ height: compact ? 220 : 340 }}>
        <div ref={containerRef} className="w-full h-full" style={{ zIndex: 1 }} />

        {/* Status badge */}
        <div className="absolute top-3 left-3 z-[1000]">
          <div className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-full",
            "bg-background/80 backdrop-blur-md border border-border shadow-sm"
          )}>
            {statusConfig.pulse && (
              <span className="relative flex h-2.5 w-2.5">
                <span className={cn("animate-ping absolute inline-flex h-full w-full rounded-full opacity-75", statusConfig.dotClass)} />
                <span className={cn("relative inline-flex rounded-full h-2.5 w-2.5", statusConfig.dotClass)} />
              </span>
            )}
            {!statusConfig.pulse && <StatusIcon className="h-3.5 w-3.5 text-foreground" />}
            <span className="text-xs font-semibold text-foreground">{statusConfig.labelFr}</span>
          </div>
        </div>

        {/* ETA */}
        {etaDisplay && !isComplete && (
          <div className="absolute top-3 right-3 z-[1000] bg-background/90 backdrop-blur-md rounded-lg px-3 py-2 border border-border shadow-sm">
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
        {tracking.context_label && (
          <p className="text-sm font-medium text-foreground break-words leading-snug">{tracking.context_label}</p>
        )}

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-4">
            {speedDisplay && (
              <span className="flex items-center gap-1">
                <Navigation className="h-3 w-3" />
                {speedDisplay}
              </span>
            )}
            {positions.length > 1 && (
              <span>{positions.length} pts</span>
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
            <div className={cn("h-full rounded-full transition-all duration-1000", statusConfig.barClass, statusConfig.barWidth)} />
          </div>
        )}

        {isComplete && (
          <div className={cn(
            "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium",
            tracking.status === "completed" ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"
          )}>
            {tracking.status === "completed" ? (
              <><CheckCircle2 className="h-4 w-4" /> Suivi terminé</>
            ) : (
              <><X className="h-4 w-4" /> Suivi annulé</>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
