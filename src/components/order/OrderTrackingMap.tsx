/**
 * OrderTrackingMap — Embedded branded Easy-Locs tracking map for order detail.
 * Shows pickup, dropoff, and live driver position.
 */
import { useEffect, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDistance, formatETA, haversineDistance, estimateETA } from "@/lib/delivery/geo-utils";
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
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        {/* Static map placeholder with ETA overlay */}
        <div className="relative bg-gradient-to-br from-primary/5 to-primary/10 h-36 flex items-center justify-center">
          {/* Map markers */}
          <div className="absolute inset-0 flex items-center justify-center gap-8">
            {hasPickup && (
              <div className="flex flex-col items-center gap-1">
                <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center">
                  <Package className="h-4 w-4 text-primary" />
                </div>
                <span className="text-[8px] text-muted-foreground font-medium">Pickup</span>
              </div>
            )}
            {isActive && hasDriver && (
              <div className="flex flex-col items-center gap-1">
                <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center animate-pulse shadow-lg">
                  <Truck className="h-5 w-5 text-primary-foreground" />
                </div>
                <span className="text-[8px] text-primary font-semibold">Driver</span>
              </div>
            )}
            {hasDropoff && (
              <div className="flex flex-col items-center gap-1">
                <div className="h-8 w-8 rounded-full bg-success/20 flex items-center justify-center">
                  <MapPin className="h-4 w-4 text-success" />
                </div>
                <span className="text-[8px] text-muted-foreground font-medium">Dropoff</span>
              </div>
            )}
          </div>

          {/* Route line */}
          {(hasPickup || hasDriver) && hasDropoff && (
            <div className="absolute top-1/2 left-1/4 right-1/4 h-0.5 bg-primary/30 rounded-full -translate-y-1/2" />
          )}

          {/* ETA badge */}
          {etaMin != null && isActive && (
            <div className="absolute top-2 right-2">
              <Badge className="bg-primary/90 text-primary-foreground text-[10px] gap-1">
                <Truck className="h-3 w-3" />
                {formatETA(etaMin)} • {distKm != null && formatDistance(distKm)}
              </Badge>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
