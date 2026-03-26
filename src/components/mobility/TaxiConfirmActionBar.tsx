/**
 * TaxiConfirmActionBar — Confirm ride with guard protection and loading state.
 */
import React, { useState } from "react";
import { eventBus } from "@/lib/core/event-bus";
import { tc } from "@/lib/i18n-canonical";
import {
  canSubmitRideRequest,
  releaseRideRequestGuard,
} from "@/lib/mobility/ride-request-guard";

interface Props {
  preview: any;
  customerUserId?: string | null;
}

export function TaxiConfirmActionBar({ preview, customerUserId }: Props) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  if (!preview) return null;

  const confirmRide = async () => {
    if (submitting) return;
    setError("");

    const guard = canSubmitRideRequest({
      customer_user_id: customerUserId ?? null,
      pickup_label: preview.pickup.label,
      dropoff_label: preview.dropoff.label,
      pickup_lat: preview.pickup.lat,
      pickup_lng: preview.pickup.lng,
      dropoff_lat: preview.dropoff.lat,
      dropoff_lng: preview.dropoff.lng,
    });

    if (!guard.allowed) {
      setError(tc("ride.request_already_processing"));
      return;
    }

    setSubmitting(true);

    try {
      await eventBus.emit("ride.requested", {
        customer_user_id: customerUserId ?? null,
        pickup_lat: preview.pickup.lat,
        pickup_lng: preview.pickup.lng,
        dropoff_lat: preview.dropoff.lat,
        dropoff_lng: preview.dropoff.lng,
        pickup_label: preview.pickup.label,
        dropoff_label: preview.dropoff.label,
        zone_key: preview.zoneKey ?? null,
        currency: "AED",
        service_level: preview.serviceLevel ?? "taxi_standard",
        preview_pricing: preview.pricing ?? null,
      });
    } catch {
      releaseRideRequestGuard(guard.key);
      setError(tc("ride.request_failed"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="sticky bottom-0 px-4 py-3 bg-background/95 backdrop-blur border-t border-border/30">
      <div className="space-y-2">
        {error && (
          <p className="text-xs text-destructive text-center font-medium">{error}</p>
        )}
        <button
          type="button"
          disabled={submitting}
          className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-semibold text-sm disabled:opacity-60 transition-opacity"
          onClick={confirmRide}
        >
          {submitting ? tc("ride.confirming") : tc("ride.confirm_ride")}
        </button>
      </div>
    </div>
  );
}
