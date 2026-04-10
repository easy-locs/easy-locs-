/**
 * map-style-helpers.ts — Visual mapping for MapEntity kinds and statuses.
 */
import type { MapEntityKind } from "@/types/map";

export function kindToEmoji(kind: string): string {
  const map: Record<string, string> = {
    restaurant: "🍕",
    grocery: "🛒",
    hotel: "🏨",
    property: "🏠",
    service: "🛠️",
    driver: "🛵",
    pickup: "📦",
    dropoff: "📍",
    warehouse: "🏬",
    order: "🧾",
    user: "👤",
  };
  return map[kind] ?? "📌";
}

export function kindToColor(kind: string): string {
  const map: Record<string, string> = {
    restaurant: "#f97316",
    grocery: "#22c55e",
    hotel: "#8b5cf6",
    property: "#3b82f6",
    service: "#f59e0b",
    driver: "#06b6d4",
    pickup: "#14b8a6",
    dropoff: "#ec4899",
    warehouse: "#6366f1",
    order: "#f97316",
    user: "#3b82f6",
  };
  return map[kind] ?? "#64748b";
}

export function statusToColor(status?: string | null): string {
  const map: Record<string, string> = {
    active: "#22c55e",
    available: "#22c55e",
    completed: "#22c55e",
    busy: "#f59e0b",
    preparing: "#f59e0b",
    pending: "#f59e0b",
    delivering: "#3b82f6",
    cancelled: "#ef4444",
    offline: "#ef4444",
    inactive: "#ef4444",
  };
  return map[status ?? ""] ?? "#64748b";
}

/** Map MapEntityKind to the Mapbox expression color */
export function kindColorExpression(): mapboxgl.Expression {
  return [
    "match",
    ["get", "kind"],
    "restaurant", "#f97316",
    "grocery", "#22c55e",
    "hotel", "#8b5cf6",
    "property", "#3b82f6",
    "service", "#f59e0b",
    "driver", "#06b6d4",
    "pickup", "#14b8a6",
    "dropoff", "#ec4899",
    "warehouse", "#6366f1",
    "order", "#f97316",
    "#64748b",
  ] as any;
}

export const LEGEND_ITEMS: { kind: MapEntityKind; emoji: string; label: string }[] = [
  { kind: "restaurant", emoji: "🍕", label: "Restaurant" },
  { kind: "grocery", emoji: "🛒", label: "Grocery" },
  { kind: "hotel", emoji: "🏨", label: "Hotel" },
  { kind: "property", emoji: "🏠", label: "Property" },
  { kind: "service", emoji: "🛠️", label: "Service" },
  { kind: "driver", emoji: "🛵", label: "Driver" },
  { kind: "pickup", emoji: "📦", label: "Pickup" },
  { kind: "dropoff", emoji: "📍", label: "Dropoff" },
  { kind: "warehouse", emoji: "🏬", label: "Warehouse" },
  { kind: "order", emoji: "🧾", label: "Order" },
];
