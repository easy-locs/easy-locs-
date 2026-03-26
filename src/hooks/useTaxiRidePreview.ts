/**
 * useTaxiRidePreview — computes route preview (geometry, ETA, distance, traffic)
 * for the taxi booking flow before confirmation.
 */
import { useState } from "react";
import { getDirections } from "@/lib/location/geocode";

export interface TaxiRidePreview {
  geometry: any;
  eta: number;
  distance: number;
  traffic: "low" | "moderate" | "heavy";
  pickup: { lat: number; lng: number; label?: string };
  dropoff: { lat: number; lng: number; label?: string };
}

export function useTaxiRidePreview() {
  const [preview, setPreview] = useState<TaxiRidePreview | null>(null);
  const [loading, setLoading] = useState(false);

  const runPreview = async (
    pickup: { lat: number; lng: number; label?: string },
    dropoff: { lat: number; lng: number; label?: string },
  ) => {
    setLoading(true);
    try {
      const directions = await getDirections(pickup, dropoff);
      if (!directions) return;

      const eta = Math.round(directions.duration_s / 60);
      const distance = directions.distance_m / 1000;

      const ratio = eta / Math.max(distance, 0.01);
      const traffic: TaxiRidePreview["traffic"] =
        ratio > 2 ? "heavy" : ratio > 1.5 ? "moderate" : "low";

      setPreview({ geometry: directions.geometry, eta, distance, traffic, pickup, dropoff });
    } finally {
      setLoading(false);
    }
  };

  const clearPreview = () => setPreview(null);

  return { preview, runPreview, clearPreview, loading };
}
