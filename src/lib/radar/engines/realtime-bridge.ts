/**
 * RadarRealtimeBridge — Bridges platformBus events into radar engine updates.
 * Converts live GPS, order status, and driver position events into
 * canonical radar projections. Injectable.
 */
import type { CanonicalRadarProjection } from "@/lib/domains/canonical-entities";
import { platformBus } from "@/lib/shared/platform-bus";

export type RealtimeUpdateHandler = (layerKey: string, items: CanonicalRadarProjection[]) => void;

export class RadarRealtimeBridge {
  private unsubs: (() => void)[] = [];
  private handlers: RealtimeUpdateHandler[] = [];

  /** Start listening to platform events and forward as radar updates */
  start() {
    this.unsubs.push(
      platformBus.on("driver:position_updated", (payload: any) => {
        if (!payload?.lat || !payload?.lng) return;
        const projection: CanonicalRadarProjection = {
          lat: payload.lat,
          lng: payload.lng,
          layerKey: "driver",
          iconKey: payload.vehicleType === "courier" ? "courier" : "taxi",
          color: "hsl(var(--accent))",
          intensity: 1,
          clusterable: false,
          popupTitle: payload.label || "Driver",
          popupSubtitle: payload.eta ? `ETA ${payload.eta}min` : undefined,
        };
        this.notify("driver", [projection]);
      }),
    );

    this.unsubs.push(
      platformBus.on("order:status_changed", (payload: any) => {
        if (!payload?.pickupLat || !payload?.pickupLng) return;
        const projection: CanonicalRadarProjection = {
          lat: payload.pickupLat,
          lng: payload.pickupLng,
          layerKey: "order",
          iconKey: "order_active",
          color: "hsl(var(--success))",
          intensity: 0.8,
          clusterable: false,
          popupTitle: `Order #${payload.orderId?.slice(0, 8) || ""}`,
          popupSubtitle: payload.status,
        };
        this.notify("order", [projection]);
      }),
    );
  }

  onUpdate(fn: RealtimeUpdateHandler): () => void {
    this.handlers.push(fn);
    return () => { this.handlers = this.handlers.filter(h => h !== fn); };
  }

  private notify(layerKey: string, items: CanonicalRadarProjection[]) {
    this.handlers.forEach(fn => fn(layerKey, items));
  }

  stop() {
    this.unsubs.forEach(fn => fn());
    this.unsubs = [];
  }

  destroy() {
    this.stop();
    this.handlers = [];
  }
}
