/**
 * MobilityLiveMap — Live map preview for taxi/delivery pages.
 * Shows animated rider positions with a visible dark-mode map aesthetic.
 */
import React, { useEffect, useRef, useState } from "react";
import { MapPin, Navigation, Bike, Car } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface MobilityLiveMapProps {
  pickupLat?: number | null;
  pickupLng?: number | null;
  dropoffLat?: number | null;
  dropoffLng?: number | null;
  mode?: "taxi" | "delivery";
  nearbyRiders?: number;
  className?: string;
}

function generateNearbyPositions(centerLat: number, centerLng: number, count: number, radiusKm = 2) {
  const positions: { lat: number; lng: number; id: number }[] = [];
  for (let i = 0; i < count; i++) {
    const angle = (2 * Math.PI * i) / count + Math.random() * 0.5;
    const dist = (Math.random() * 0.7 + 0.3) * radiusKm;
    const dLat = (dist / 111) * Math.cos(angle);
    const dLng = (dist / (111 * Math.cos((centerLat * Math.PI) / 180))) * Math.sin(angle);
    positions.push({ lat: centerLat + dLat, lng: centerLng + dLng, id: i });
  }
  return positions;
}

export function MobilityLiveMap({
  pickupLat,
  pickupLng,
  dropoffLat,
  dropoffLng,
  mode = "taxi",
  nearbyRiders = 4,
  className,
}: MobilityLiveMapProps) {
  const [riderPositions, setRiderPositions] = useState<{ lat: number; lng: number; id: number }[]>([]);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const centerLat = pickupLat ?? 25.2048;
  const centerLng = pickupLng ?? 55.2708;

  useEffect(() => {
    setRiderPositions(generateNearbyPositions(centerLat, centerLng, nearbyRiders));
    intervalRef.current = setInterval(() => {
      setRiderPositions((prev) =>
        prev.map((r) => ({
          ...r,
          lat: r.lat + (Math.random() - 0.5) * 0.002,
          lng: r.lng + (Math.random() - 0.5) * 0.002,
        })),
      );
    }, 3000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [centerLat, centerLng, nearbyRiders]);

  const RiderIcon = mode === "taxi" ? Car : Bike;

  // Simulated "road" segments for visual depth
  const roads = [
    { x1: "10%", y1: "50%", x2: "90%", y2: "50%" },
    { x1: "50%", y1: "10%", x2: "50%", y2: "90%" },
    { x1: "15%", y1: "25%", x2: "85%", y2: "75%" },
    { x1: "20%", y1: "80%", x2: "80%", y2: "20%" },
    { x1: "30%", y1: "10%", x2: "70%", y2: "90%" },
    { x1: "10%", y1: "35%", x2: "90%", y2: "65%" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className={cn(
        "relative rounded-2xl border border-border/30 overflow-hidden",
        className,
      )}
      style={{ height: 240, background: "hsl(var(--muted) / 0.3)" }}
    >
      {/* Dark map base */}
      <div className="absolute inset-0" style={{ background: "linear-gradient(145deg, hsl(var(--background)), hsl(var(--card)), hsl(var(--muted) / 0.5))" }} />

      {/* Street grid - major + minor */}
      <svg className="absolute inset-0 w-full h-full" style={{ opacity: 0.15 }}>
        {roads.map((r, i) => (
          <line key={i} x1={r.x1} y1={r.y1} x2={r.x2} y2={r.y2} stroke="hsl(var(--primary))" strokeWidth={i < 2 ? 2.5 : 1.2} strokeLinecap="round" />
        ))}
      </svg>

      {/* Subtle block grid */}
      <div
        className="absolute inset-0"
        style={{
          opacity: 0.08,
          backgroundImage:
            "linear-gradient(hsl(var(--primary)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--primary)) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      />

      {/* Radial glow around center */}
      <div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 rounded-full"
        style={{ background: "radial-gradient(circle, hsl(var(--primary) / 0.12) 0%, transparent 70%)" }}
      />

      {/* Pickup marker */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
        <div className="relative">
          <div className="absolute -inset-4 rounded-full bg-primary/15 animate-ping" style={{ animationDuration: "2s" }} />
          <div className="absolute -inset-2.5 rounded-full bg-primary/10" />
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center shadow-lg shadow-primary/40 border-2 border-primary-foreground/20">
            <MapPin className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[9px] font-bold text-primary whitespace-nowrap bg-card/90 px-2 py-0.5 rounded-full border border-primary/30 shadow-sm">
            Y...
          </span>
        </div>
      </div>

      {/* Dropoff marker */}
      {dropoffLat != null && dropoffLng != null && (
        <div
          className="absolute z-10"
          style={{
            left: `${50 + ((dropoffLng - centerLng) / 0.03) * 20}%`,
            top: `${50 - ((dropoffLat - centerLat) / 0.03) * 20}%`,
          }}
        >
          <div className="w-6 h-6 rounded-full bg-destructive flex items-center justify-center shadow-md border border-destructive-foreground/20">
            <Navigation className="w-3 h-3 text-destructive-foreground" />
          </div>
        </div>
      )}

      {/* Nearby riders */}
      {riderPositions.map((r) => {
        const dx = ((r.lng - centerLng) / 0.04) * 40;
        const dy = ((r.lat - centerLat) / 0.04) * 40;
        const left = Math.max(8, Math.min(92, 50 + dx));
        const top = Math.max(8, Math.min(92, 50 - dy));

        return (
          <motion.div
            key={r.id}
            className="absolute z-[5]"
            animate={{ left: `${left}%`, top: `${top}%` }}
            transition={{ duration: 2.5, ease: "easeInOut" }}
          >
            <div className="relative -translate-x-1/2 -translate-y-1/2">
              <div className="w-8 h-8 rounded-full bg-card border-2 border-emerald-500/70 flex items-center justify-center shadow-md shadow-emerald-500/20">
                <RiderIcon className="w-4 h-4 text-emerald-400" />
              </div>
              <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse border border-card" />
            </div>
          </motion.div>
        );
      })}

      {/* Bottom overlay */}
      <div className="absolute bottom-0 inset-x-0 z-20 bg-gradient-to-t from-card via-card/80 to-transparent px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-bold text-foreground">
              {nearbyRiders} {mode === "taxi" ? "drivers" : "riders"} nearby
            </span>
          </div>
          <span className="text-[10px] font-semibold text-muted-foreground tracking-wide">Live</span>
        </div>
      </div>
    </motion.div>
  );
}
