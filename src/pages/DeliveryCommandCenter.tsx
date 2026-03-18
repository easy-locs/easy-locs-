/**
 * DeliveryCommandCenter — Full dispatcher UI for Easy-Locs delivery operations.
 * Branded premium dark UI with live map, mission cards, driver assignment, and real-time updates.
 */
import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { MobilePageHeader } from "@/components/ui/mobile-page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { motion, AnimatePresence } from "framer-motion";
import {
  Truck, MapPin, Navigation, Clock, Users, Package,
  CheckCircle2, XCircle, Phone, RotateCcw, ChevronRight,
  Zap, Radio, ArrowUpRight,
} from "lucide-react";
import { useDeliveryCommandCenter, type DriverWithDistance } from "@/hooks/useDeliveryCommandCenter";
import {
  MISSION_STATUS_CONFIG, getMissionCTAs, MISSION_FILTERS,
  type DeliveryMissionStatus, type MissionFilter,
} from "@/lib/delivery/mission-config";
import { formatDistance, formatETA, haversineDistance, estimateETA } from "@/lib/delivery/geo-utils";
import type { DeliveryJob } from "@/hooks/useDriverMissions";
import { toast } from "sonner";
import { useGeolocation } from "@/hooks/useGeolocation";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

const MAPBOX_TOKEN = "pk.eyJ1IjoiZWFzeWxvY3MyMDI2IiwiYSI6ImNtbXZiZ3h0cTF6ZHMycnIyOWw4NnJzZTIifQ.ElIj6bFQK_BpVm6suigHUQ";

/* ═══════════════════════════════════════════════
   STATS BAR
   ═══════════════════════════════════════════════ */
function StatsBar({ stats }: { stats: { activeMissions: number; availableDrivers: number; deliveredToday: number; avgETA: number } }) {
  const items = [
    { icon: Zap, label: "Active", value: stats.activeMissions, color: "text-[#06B6D4]" },
    { icon: Users, label: "Drivers", value: stats.availableDrivers, color: "text-[#22C55E]" },
    { icon: CheckCircle2, label: "Delivered", value: stats.deliveredToday, color: "text-[#4F46E5]" },
    { icon: Clock, label: "Avg ETA", value: `${stats.avgETA}m`, color: "text-[#F59E0B]" },
  ];
  return (
    <div className="grid grid-cols-4 gap-2 px-3 py-2">
      {items.map((it) => (
        <div key={it.label} className="flex flex-col items-center gap-0.5 rounded-xl border border-border/20 bg-card/60 backdrop-blur-md py-2">
          <it.icon className={`h-4 w-4 ${it.color}`} />
          <span className="text-sm font-bold text-foreground">{it.value}</span>
          <span className="text-[10px] text-muted-foreground">{it.label}</span>
        </div>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════
   MISSION STATUS TIMELINE
   ═══════════════════════════════════════════════ */
function MissionTimeline({ status }: { status: string }) {
  const steps = ["pending", "assigned", "accepted", "picked_up", "on_the_way", "delivered"];
  const currentIdx = steps.indexOf(status === "completed" ? "delivered" : status);
  return (
    <div className="flex items-center gap-1 px-1">
      {steps.map((s, i) => {
        const cfg = MISSION_STATUS_CONFIG[s as DeliveryMissionStatus] || MISSION_STATUS_CONFIG.pending;
        const active = i <= currentIdx && currentIdx >= 0;
        return (
          <div key={s} className="flex items-center gap-1 flex-1">
            <div
              className={`h-2 w-2 rounded-full shrink-0 transition-colors ${active ? "" : "opacity-30"}`}
              style={{ background: active ? cfg.color : "hsl(var(--muted-foreground))" }}
            />
            {i < steps.length - 1 && (
              <div className={`h-[2px] flex-1 rounded-full transition-colors ${active && i < currentIdx ? "" : "opacity-20"}`}
                style={{ background: active && i < currentIdx ? cfg.color : "hsl(var(--muted-foreground))" }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ═══════════════════════════════════════════════
   MISSION CARD
   ═══════════════════════════════════════════════ */
function MissionCard({
  mission, selected, onSelect, onAction,
}: {
  mission: DeliveryJob; selected: boolean; onSelect: () => void;
  onAction: (action: string, missionId: string) => void;
}) {
  const cfg = MISSION_STATUS_CONFIG[(mission.status as DeliveryMissionStatus)] || MISSION_STATUS_CONFIG.pending;
  const ctas = getMissionCTAs(mission.status as DeliveryMissionStatus, true);
  const dist = mission.pickup_lat && mission.dropoff_lat
    ? haversineDistance(mission.pickup_lat, mission.pickup_lng!, mission.dropoff_lat, mission.dropoff_lng!)
    : null;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-2xl border p-3 transition-all cursor-pointer ${
        selected
          ? "border-primary/60 bg-primary/10 shadow-lg shadow-primary/10"
          : "border-border/20 bg-card/60 backdrop-blur-md"
      }`}
      onClick={onSelect}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-base">{cfg.icon}</span>
          <Badge variant="outline" className="text-[10px] px-1.5 py-0" style={{ borderColor: cfg.color, color: cfg.color }}>
            {cfg.label}
          </Badge>
        </div>
        {mission.delivery_fee != null && (
          <span className="text-xs font-bold text-success">
            {mission.delivery_fee.toFixed(2)} {mission.currency || "EUR"}
          </span>
        )}
      </div>

      {/* Addresses */}
      <div className="space-y-1 mb-2">
        <div className="flex items-start gap-2">
          <div className="w-2 h-2 rounded-full bg-[#22C55E] mt-1.5 shrink-0" />
          <p className="text-xs text-foreground truncate">{mission.pickup_address || "Pickup"}</p>
        </div>
        <div className="flex items-start gap-2">
          <div className="w-2 h-2 rounded-full bg-[#EF4444] mt-1.5 shrink-0" />
          <p className="text-xs text-foreground truncate">{mission.dropoff_address || "Dropoff"}</p>
        </div>
      </div>

      {/* Timeline */}
      <MissionTimeline status={mission.status} />

      {/* Meta row */}
      <div className="flex items-center gap-3 mt-2 text-[10px] text-muted-foreground">
        {dist != null && <span>{formatDistance(dist)}</span>}
        {dist != null && <span>~{formatETA(estimateETA(dist))}</span>}
        {mission.priority && <span className="uppercase">{mission.priority}</span>}
      </div>

      {/* CTAs */}
      {selected && ctas.length > 0 && (
        <div className="flex gap-2 mt-3">
          {ctas.map((cta) => (
            <Button
              key={cta.action}
              size="sm"
              variant={cta.variant}
              className="flex-1 text-xs h-8"
              onClick={(e) => { e.stopPropagation(); onAction(cta.action, mission.id); }}
            >
              {cta.label}
            </Button>
          ))}
        </div>
      )}
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════
   DRIVER CARD (for assignment drawer)
   ═══════════════════════════════════════════════ */
function DriverCard({ driver, onAssign }: { driver: DriverWithDistance; onAssign: () => void }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border/20 bg-card/60 backdrop-blur-md p-3">
      <div className="w-9 h-9 rounded-full bg-[#22C55E]/20 flex items-center justify-center text-sm">🚗</div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{driver.user_id.slice(0, 8)}</p>
        <div className="flex gap-2 text-[10px] text-muted-foreground">
          {driver.distanceToPickup != null && <span>{formatDistance(driver.distanceToPickup)}</span>}
          {driver.etaToPickup != null && <span>~{formatETA(driver.etaToPickup)}</span>}
          <span>{driver.vehicle_type}</span>
        </div>
      </div>
      <Button size="sm" className="h-7 text-xs bg-[#4F46E5] hover:bg-[#4338CA]" onClick={onAssign}>
        Assign
      </Button>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   EMPTY STATE — using shared component
   ═══════════════════════════════════════════════ */
import MapEmptyState from "@/components/map/MapEmptyState";
import MapLoadingSkeleton from "@/components/map/MapLoadingSkeleton";

function EmptyState({ driversCount, onRefresh }: { driversCount: number; onRefresh: () => void }) {
  return (
    <MapEmptyState
      icon={<Truck className="h-6 w-6 text-primary/60" />}
      title="No active deliveries"
      subtitle="New missions will appear here in real time"
      stat={`${driversCount} driver${driversCount !== 1 ? "s" : ""} online and ready`}
      onRetry={onRefresh}
      retryLabel="Refresh"
    />
  );
}

/* ═══════════════════════════════════════════════
   COMMAND CENTER MAP — Live driver map with recenter
   ═══════════════════════════════════════════════ */
function CommandMap({
  mission, drivers, userLat, userLng, onRecenter,
}: {
  mission: DeliveryJob | null;
  drivers: { lat: number | null; lng: number | null; user_id: string; status: string }[];
  userLat: number | null;
  userLng: number | null;
  onRecenter: () => void;
}) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);

  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;
    mapboxgl.accessToken = MAPBOX_TOKEN;
    const center: [number, number] = userLng && userLat ? [userLng, userLat] : [3.06, 36.75];
    const map = new mapboxgl.Map({
      container: mapRef.current,
      style: "mapbox://styles/mapbox/dark-v11",
      center,
      zoom: 12,
    });
    mapInstance.current = map;
    return () => { map.remove(); mapInstance.current = null; };
  }, []);

  // Update markers
  useEffect(() => {
    const map = mapInstance.current;
    if (!map) return;
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];
    const bounds = new mapboxgl.LngLatBounds();
    let hasPoints = false;

    // User position
    if (userLat && userLng) {
      const el = document.createElement("div");
      el.style.cssText = "width:16px;height:16px;border-radius:50%;background:hsl(var(--primary));border:3px solid white;box-shadow:0 0 12px hsl(var(--primary) / 0.5);";
      const m = new mapboxgl.Marker({ element: el }).setLngLat([userLng, userLat]).addTo(map);
      markersRef.current.push(m);
      bounds.extend([userLng, userLat]);
      hasPoints = true;
    }

    // Drivers with status colors
    drivers.forEach((d) => {
      if (d.lat == null || d.lng == null) return;
      const isOnline = d.status === "online";
      const isBusy = d.status === "on_delivery";
      const bg = isOnline ? "#22C55E" : isBusy ? "#F59E0B" : "#64748B";
      const label = isOnline ? "🟢" : isBusy ? "🔶" : "⚫";
      const el = document.createElement("div");
      el.style.cssText = `width:32px;height:32px;border-radius:50%;background:${bg}22;border:2px solid ${bg};display:flex;align-items:center;justify-content:center;font-size:14px;box-shadow:0 4px 12px ${bg}44;`;
      el.textContent = "🚗";
      el.title = `Driver ${d.user_id.slice(0,6)} — ${d.status}`;
      const marker = new mapboxgl.Marker({ element: el }).setLngLat([d.lng, d.lat]).addTo(map);
      markersRef.current.push(marker);
      bounds.extend([d.lng, d.lat]);
      hasPoints = true;
    });

    // Mission pins
    if (mission) {
      if (mission.pickup_lat && mission.pickup_lng) {
        const el = document.createElement("div");
        el.style.cssText = "width:30px;height:30px;border-radius:50%;background:#4F46E5;border:2px solid #fff;display:flex;align-items:center;justify-content:center;font-size:14px;box-shadow:0 4px 16px #4F46E555;";
        el.textContent = "📦";
        const marker = new mapboxgl.Marker({ element: el }).setLngLat([mission.pickup_lng, mission.pickup_lat]).addTo(map);
        markersRef.current.push(marker);
        bounds.extend([mission.pickup_lng, mission.pickup_lat]);
        hasPoints = true;
      }
      if (mission.dropoff_lat && mission.dropoff_lng) {
        const el = document.createElement("div");
        el.style.cssText = "width:30px;height:30px;border-radius:50%;background:#EF4444;border:2px solid #fff;display:flex;align-items:center;justify-content:center;font-size:14px;box-shadow:0 4px 16px #EF444455;";
        el.textContent = "📍";
        const marker = new mapboxgl.Marker({ element: el }).setLngLat([mission.dropoff_lng, mission.dropoff_lat]).addTo(map);
        markersRef.current.push(marker);
        bounds.extend([mission.dropoff_lng, mission.dropoff_lat]);
        hasPoints = true;
      }
    }

    if (hasPoints) {
      map.fitBounds(bounds, { padding: 60, maxZoom: 15 });
    }
  }, [mission, drivers, userLat, userLng]);

  // Recenter handler
  const handleRecenter = useCallback(() => {
    onRecenter();
    if (mapInstance.current && userLat && userLng) {
      mapInstance.current.flyTo({ center: [userLng, userLat], zoom: 13, duration: 800 });
    }
  }, [onRecenter, userLat, userLng]);

  return (
    <div className="relative rounded-2xl overflow-hidden border border-border/20">
      <div ref={mapRef} className="h-[300px] w-full" />

      {/* Recenter button */}
      <div className="absolute bottom-3 left-3 z-10">
        <button
          onClick={handleRecenter}
          className="w-9 h-9 rounded-full flex items-center justify-center bg-background/90 backdrop-blur-md border border-border/30 shadow-lg hover:bg-muted transition-colors"
          title="Recenter on my position"
        >
          <Navigation className="h-4 w-4 text-primary" />
        </button>
      </div>

      {/* Map legend overlay */}
      <div className="absolute bottom-3 right-3 flex gap-1.5 z-10">
        {[
          { color: "#22C55E", label: "Online" },
          { color: "#F59E0B", label: "Busy" },
          { color: "#4F46E5", label: "Pickup" },
          { color: "#EF4444", label: "Dropoff" },
        ].map((it) => (
          <div key={it.label} className="flex items-center gap-1 px-1.5 py-1 rounded-lg bg-black/60 backdrop-blur-sm">
            <span className="w-2 h-2 rounded-full" style={{ background: it.color }} />
            <span className="text-[8px] text-white/80">{it.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   MAIN COMMAND CENTER
   ═══════════════════════════════════════════════ */
export default function DeliveryCommandCenter() {
  const {
    missions, drivers, availableDrivers, loading, stats,
    selectedMission, selectedMissionId, setSelectedMissionId,
    filter, setFilter, nearbyDrivers, assignDriver,
    updateMissionStatus, cancelMission, refetch,
  } = useDeliveryCommandCenter();

  const { lat: userLat, lng: userLng, requestLocation } = useGeolocation();

  const [assignDrawerOpen, setAssignDrawerOpen] = useState(false);
  const [assigningJobId, setAssigningJobId] = useState<string | null>(null);

  const assignCandidates = useMemo(() => {
    if (!assigningJobId) return [];
    const job = missions.find((m) => m.id === assigningJobId);
    if (!job?.pickup_lat || !job?.pickup_lng) return availableDrivers.map((d) => ({ ...d, distanceToPickup: undefined, etaToPickup: undefined }));
    return nearbyDrivers(job.pickup_lat, job.pickup_lng!);
  }, [assigningJobId, missions, nearbyDrivers, availableDrivers]);

  const handleAction = async (action: string, missionId: string) => {
    switch (action) {
      case "assign":
      case "reassign":
        setAssigningJobId(missionId);
        setAssignDrawerOpen(true);
        break;
      case "cancel":
        await cancelMission(missionId);
        toast.success("Mission cancelled");
        break;
      case "confirm_pickup":
        await updateMissionStatus(missionId, "picked_up");
        toast.success("Pickup confirmed");
        break;
      case "confirm_delivered":
        await updateMissionStatus(missionId, "delivered");
        toast.success("Delivery confirmed");
        break;
      case "accept":
        await updateMissionStatus(missionId, "accepted");
        toast.success("Mission accepted");
        break;
      case "track":
        setSelectedMissionId(missionId);
        break;
      default:
        toast.info(`Action: ${action}`);
    }
  };

  const handleAssign = async (driverId: string) => {
    if (!assigningJobId) return;
    await assignDriver(assigningJobId, driverId);
    setAssignDrawerOpen(false);
    setAssigningJobId(null);
    toast.success("Driver assigned");
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <MobilePageHeader title="Delivery Command" backTo="/dashboard" />

      {/* Stats */}
      <StatsBar stats={stats} />

      {/* Map */}
      <div className="px-3 mb-3">
        <CommandMap mission={selectedMission} drivers={drivers} userLat={userLat} userLng={userLng} onRecenter={requestLocation} />
      </div>

      {/* Filters — unified chip style */}
      <div className="px-3 mb-3">
        <ScrollArea className="w-full">
          <div className="flex gap-1.5 pb-1">
            {MISSION_FILTERS.map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key as MissionFilter)}
                className={`px-3 py-1.5 rounded-full text-[11px] font-medium whitespace-nowrap transition-all active:scale-95 ${
                  filter === f.key
                    ? "bg-primary text-primary-foreground shadow-md shadow-primary/30"
                    : "bg-card/60 text-muted-foreground border border-border/20 hover:border-border/40"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Mission List */}
      <div className="px-3 space-y-2">
        {loading ? (
          <MapLoadingSkeleton showMap={false} cardCount={3} />
        ) : missions.length === 0 ? (
          <EmptyState driversCount={stats.availableDrivers} onRefresh={refetch} />
        ) : (
          <AnimatePresence mode="popLayout">
            {missions.map((m) => (
              <MissionCard
                key={m.id}
                mission={m}
                selected={selectedMissionId === m.id}
                onSelect={() => setSelectedMissionId(selectedMissionId === m.id ? null : m.id)}
                onAction={handleAction}
              />
            ))}
          </AnimatePresence>
        )}
      </div>

      {/* Driver Assignment Drawer */}
      <Sheet open={assignDrawerOpen} onOpenChange={setAssignDrawerOpen}>
        <SheetContent side="bottom" className="rounded-t-3xl border-t border-border/20 bg-card/95 backdrop-blur-xl max-h-[70vh]">
          <SheetHeader>
            <SheetTitle className="text-sm font-semibold">Assign Driver</SheetTitle>
          </SheetHeader>
          <div className="mt-4 space-y-2 overflow-y-auto max-h-[50vh] pb-6">
            {assignCandidates.length === 0 ? (
              <p className="text-center text-xs text-muted-foreground py-8">No available drivers</p>
            ) : (
              assignCandidates.map((d) => (
                <DriverCard key={d.id} driver={d} onAssign={() => handleAssign(d.user_id)} />
              ))
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
