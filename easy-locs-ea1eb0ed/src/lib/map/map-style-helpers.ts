/**
 * map-style-helpers.ts — Visual mapping for MapEntity kinds and statuses.
 */
import type { MapEntityKind } from "@/types/map";
import { MAP_KIND_COLORS, STATUS_COLORS } from "@/config/colors";

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
  return (MAP_KIND_COLORS as Record<string, string>)[kind] ?? MAP_KIND_COLORS.fallback;
}

export function statusToColor(status?: string | null): string {
  return (STATUS_COLORS as Record<string, string>)[status ?? ""] ?? STATUS_COLORS.fallback;
}

export function kindColorExpression(): mapboxgl.Expression {
  return [
    "match",
    ["get", "kind"],
    "restaurant", MAP_KIND_COLORS.restaurant,
    "grocery", MAP_KIND_COLORS.grocery,
    "hotel", MAP_KIND_COLORS.hotel,
    "property", MAP_KIND_COLORS.property,
    "service", MAP_KIND_COLORS.service,
    "driver", MAP_KIND_COLORS.driver,
    "pickup", MAP_KIND_COLORS.pickup,
    "dropoff", MAP_KIND_COLORS.dropoff,
    "warehouse", MAP_KIND_COLORS.warehouse,
    "order", MAP_KIND_COLORS.order,
    MAP_KIND_COLORS.fallback,
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
