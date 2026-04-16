/**
 * OrderTrackingMap — Embedded branded Easy-Locs tracking map for order detail.
 * Shows pickup, dropoff, and live driver position.
 */
import { useEffect, useRef, useState } from "react";
import { AppCard, CardContent } from "@/components/ui/AppCard";
import { Badge } from "@/components/ui/badge";
import { formatDistance, formatETA, haversineKm as haversineDistance, estimateETA } from "@/lib/geo/distance";
import { Truck, MapPin, Package } from "lucide-react";

interface Props {
  pickupLat?: number | null;
  pickupLng?: number | null;
  dropoffLat?: number | null;
  dropoffLng?: number | null;
  driverLat?: number | null;
  driverLng?: number | null;
  status?: string;
}

export default function OrderTrackingMap({
  pickupLat, pickupLng, dropoffLat, dropoffLng, driverLat, driverLng, status
}: Props) {
  const hasPickup = pickupLat != null && pickupLng != null;
  const hasDropoff = dropoffLat != null && dropoffLng != null;
  const hasDriver = driverLat != null && driverLng != null;

  if (!hasPickup && !hasDropoff && !hasDriver) return null;

  // Compute ETA
  let etaMin: number | null = null;
  let distKm: number | null = null;
  if (hasDriver && hasDropoff) {
    distKm = haversineDistance(driverLat!, driverLng!, dropoffLat!, dropoffLng!);
    etaMin = estimateETA(distKm);
  } else if (hasPickup && hasDropoff) {
    distKm = haversineDistance(pickupLat!, pickupLng!, dropoffLat!, dropoffLng!);
    etaMin = estimateETA(distKm);
  }

  const isActive = ["assigned", "accepted", "picked_up", "in_progress", "on_the_way", "arriving_pickup", "arriving_dropoff"].includes(status || "");

  return (
    <AppCard className="overflow-hidden">
      <CardContent className="p-0">
        <div className="relative h-40 overflow-hidden">
          {(() => {
            const points: [number, number][] = [];
            if (hasPickup) points.push([pickupLat!, pickupLng!]);
            if (hasDropoff) points.push([dropoffLat!, dropoffLng!]);
            if (hasDriver) points.push([driverLat!, driverLng!]);

            const lats = points.map(p => p[0]);
            const lngs = points.map(p => p[1]);
            const minLat = Math.min(...lats);
            const maxLat = Math.max(...lats);
            const minLng = Math.min(...lngs);
            const maxLng = Math.max(...lngs);
            const pad = 0.005;
            const bbox = `${minLng - pad},${minLat - pad},${maxLng + pad},${maxLat + pad}`;

            const markerLat = hasDriver ? driverLat! : (minLat + maxLat) / 2;
            const markerLng = hasDriver ? driverLng! : (minLng + maxLng) / 2;

            const osmUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${markerLat},${markerLng}`;
            return (
              <iframe
                src={osmUrl}
                className="w-full h-full border-0"
                loading="lazy"
                title="Order tracking"
                style={{ filter: "saturate(0.85) contrast(1.05)" }}
              />
            );
          })()}

          <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-card/90 to-transparent h-12 pointer-events-none" />

          <div className="absolute top-2 left-2 flex gap-1.5">
            {hasPickup && (
              <Badge variant="outline" className="bg-card/90 text-[0.625rem] gap-1 border-primary/20">
                <Package className="h-2.5 w-2.5 text-primary" /> Pickup
              </Badge>
            )}
            {isActive && hasDriver && (
              <Badge className="bg-primary text-primary-foreground text-[0.625rem] gap-1 animate-pulse">
                <Truck className="h-2.5 w-2.5" /> Live
              </Badge>
            )}
            {hasDropoff && (
              <Badge variant="outline" className="bg-card/90 text-[0.625rem] gap-1 border-success/20">
                <MapPin className="h-2.5 w-2.5 text-success" /> Dropoff
              </Badge>
            )}
          </div>

          {etaMin != null && isActive && (
            <div className="absolute top-2 right-2">
              <Badge className="bg-primary/90 text-primary-foreground text-[0.625rem] gap-1">
                <Truck className="h-3 w-3" />
                {formatETA(etaMin)} • {distKm != null && formatDistance(distKm)}
              </Badge>
            </div>
          )}
        </div>
      </CardContent>
    </AppCard>
  );
}
