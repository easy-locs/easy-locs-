/**
 * order.fulfillment — Fulfillment method and delivery tracking.
 */

export type FulfillmentMethod = "delivery" | "pickup" | "dine_in" | "shipping";

export interface OrderFulfillment {
  method: FulfillmentMethod;
  estimatedAt?: string;
  completedAt?: string;
  driverId?: string;
  driverOrbitId?: string;
  trackingId?: string;
  address?: {
    line1: string;
    city: string;
    country: string;
    lat?: number;
    lng?: number;
  };
}

export function isFulfillmentComplete(f: OrderFulfillment): boolean {
  return !!f.completedAt;
}

export function requiresDriver(method: FulfillmentMethod): boolean {
  return method === "delivery" || method === "shipping";
}
