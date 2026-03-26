/**
 * MobilityLiveMap — Live map preview for taxi/delivery pages.
 * Shows rider positions and route preview in a compact embedded map.
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
  /** "taxi" | "delivery" */
  mode?: "taxi" | "delivery";
  /** Number of nearby riders to simulate */
  nearbyRiders?: number;
  className?: string;
}

// Simulated rider positions around a center point
function generateNearbyPositions(
  centerLat: number,
  centerLng: number,
  count: number,
  radiusKm: number = 2,
) {
  const positions: { lat: number; lng: number; id: number }[] = [];
  for (let i = 0; i < count; i++) {
    const angle = (2 * Math.PI * i) / count + Math.random() * 0.5;
    const dist = (Math.random() * 0.7 + 0.3) * radiusKm;
    const dLat = (dist / 111) * Math.cos(angle);
    const dLng = (dist / (111 * Math.cos((centerLat * Math.PI) / 180))) * Math.sin(angle);
    positions.push({
      lat: centerLat + dLat,
      lng: centerLng + dLng,
      id: i,
    });
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
  const [riderPositions, setRiderPositions] = useState<
    { lat: number; lng: number; id: number }[]
  >([]);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const centerLat = pickupLat ?? 25.2048;
  const centerLng = pickupLng ?? 55.2708;

  useEffect(() => {
    // Generate initial positions
    setRiderPositions(generateNearbyPositions(centerLat, centerLng, nearbyRiders));

    // Animate rider positions slightly every 3s
    intervalRef.current = setInterval(() => {
      setRiderPositions((prev) =>
        prev.map((r) => ({
          ...r,
          lat: r.lat + (Math.random() - 0.5) * 0.002,
          lng: r.lng + (Math.random() - 0.5) * 0.002,
        })),
      );
    }, 3000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [centerLat, centerLng, nearbyRiders]);

  const RiderIcon = mode === "taxi" ? Car : Bike;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className={cn(
        "relative rounded-2xl border border-border/30 overflow-hidden bg-card",
        className,
      )}
      style={{ height: 220 }}
    >
      {/* Map background with gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-accent/5" />

      {/* Grid pattern to simulate map tiles */}
      <div
        className="absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage:
            "linear-gradient(hsl(var(--border)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--border)) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }}
      />

      {/* Pickup marker */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
        <div className="relative">
          {/* Pulse ring */}
          <div className="absolute -inset-3 rounded-full bg-primary/20 animate-ping" />
          <div className="absolute -inset-2 rounded-full bg-primary/10" />
          <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center shadow-lg shadow-primary/30">
            <MapPin className="w-3.5 h-3.5 text-primary-foreground" />
          </div>
          <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[9px] font-bold text-primary whitespace-nowrap bg-background/80 px-1.5 py-0.5 rounded-full border border-primary/20">
            You
          </span>
        </div>
      </div>

      {/* Dropoff marker */}
      {dropoffLat && dropoffLng && (
        <div
          className="absolute z-10"
          style={{
            left: `${50 + ((dropoffLng - centerLng) / 0.03) * 20}%`,
            top: `${50 - ((dropoffLat - centerLat) / 0.03) * 20}%`,
          }}
        >
          <div className="w-5 h-5 rounded-full bg-destructive flex items-center justify-center shadow-md">
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
            className="absolute z-5"
            animate={{ left: `${left}%`, top: `${top}%` }}
            transition={{ duration: 2.5, ease: "easeInOut" }}
          >
            <div className="relative -translate-x-1/2 -translate-y-1/2">
              <div className="w-7 h-7 rounded-full bg-card border-2 border-emerald-500/60 flex items-center justify-center shadow-sm">
                <RiderIcon className="w-3.5 h-3.5 text-emerald-500" />
              </div>
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            </div>
          </motion.div>
        );
      })}

      {/* Bottom overlay label */}
      <div className="absolute bottom-0 inset-x-0 z-20 bg-gradient-to-t from-card via-card/90 to-transparent px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-semibold text-foreground">
              {nearbyRiders} {mode === "taxi" ? "drivers" : "riders"} nearby
            </span>
          </div>
          <span className="text-[10px] text-muted-foreground">Live</span>
        </div>
      </div>
    </motion.div>
  );
}
