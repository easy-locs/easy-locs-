/**
 * Delivery mission status definitions, labels, colors, and CTA logic.
 */

export type DeliveryMissionStatus =
  | "pending"
  | "broadcast"
  | "assigned"
  | "accepted"
  | "arriving_pickup"
  | "picked_up"
  | "on_the_way"
  | "arriving_dropoff"
  | "delivered"
  | "cancelled"
  | "failed";

export const MISSION_STATUS_CONFIG: Record<
  DeliveryMissionStatus,
  { label: string; color: string; icon: string; step: number }
> = {
  pending:           { label: "Pending",           color: "hsl(var(--muted-foreground))", icon: "⏳", step: 0 },
  broadcast:         { label: "Broadcasting",      color: "#F59E0B",                     icon: "📡", step: 1 },
  assigned:          { label: "Assigned",           color: "#4F46E5",                     icon: "👤", step: 2 },
  accepted:          { label: "Accepted",           color: "#06B6D4",                     icon: "✅", step: 3 },
  arriving_pickup:   { label: "Arriving Pickup",    color: "#8B5CF6",                     icon: "🚗", step: 4 },
  picked_up:         { label: "Picked Up",          color: "#22C55E",                     icon: "📦", step: 5 },
  on_the_way:        { label: "On The Way",         color: "#06B6D4",                     icon: "🛣️", step: 6 },
  arriving_dropoff:  { label: "Arriving Dropoff",   color: "#3B82F6",                     icon: "📍", step: 7 },
  delivered:         { label: "Delivered",           color: "#22C55E",                     icon: "🎉", step: 8 },
  cancelled:         { label: "Cancelled",          color: "hsl(var(--destructive))",      icon: "❌", step: -1 },
  failed:            { label: "Failed",             color: "hsl(var(--destructive))",      icon: "⚠️", step: -1 },
};

export type MissionCTA = { label: string; action: string; variant: "default" | "destructive" | "outline" };

export function getMissionCTAs(status: DeliveryMissionStatus, isDispatcher: boolean): MissionCTA[] {
  if (isDispatcher) {
    switch (status) {
      case "pending":
      case "broadcast":
        return [
          { label: "Assign Driver", action: "assign", variant: "default" },
          { label: "Cancel", action: "cancel", variant: "destructive" },
        ];
      case "assigned":
      case "accepted":
        return [
          { label: "Contact Driver", action: "contact_driver", variant: "outline" },
          { label: "Reassign", action: "reassign", variant: "outline" },
          { label: "Navigate", action: "navigate_pickup", variant: "default" },
        ];
      case "arriving_pickup":
      case "picked_up":
      case "on_the_way":
      case "arriving_dropoff":
        return [
          { label: "Track", action: "track", variant: "default" },
          { label: "Contact Driver", action: "contact_driver", variant: "outline" },
          { label: "Contact Customer", action: "contact_customer", variant: "outline" },
        ];
      case "delivered":
        return [
          { label: "View Summary", action: "summary", variant: "default" },
        ];
      default:
        return [];
    }
  }
  // Driver CTAs
  switch (status) {
    case "assigned":
      return [
        { label: "Accept", action: "accept", variant: "default" },
        { label: "Reject", action: "reject", variant: "destructive" },
      ];
    case "accepted":
    case "arriving_pickup":
      return [
        { label: "Navigate to Pickup", action: "navigate_pickup", variant: "default" },
        { label: "Confirm Pickup", action: "confirm_pickup", variant: "default" },
      ];
    case "picked_up":
    case "on_the_way":
    case "arriving_dropoff":
      return [
        { label: "Navigate to Dropoff", action: "navigate_dropoff", variant: "default" },
        { label: "Confirm Delivered", action: "confirm_delivered", variant: "default" },
      ];
    default:
      return [];
  }
}

export const MISSION_FILTERS = [
  { key: "all", label: "All" },
  { key: "pending", label: "Pending" },
  { key: "assigned", label: "Assigned" },
  { key: "in_progress", label: "In Progress" },
  { key: "delivered", label: "Delivered" },
  { key: "cancelled", label: "Cancelled" },
] as const;

export type MissionFilter = (typeof MISSION_FILTERS)[number]["key"];

export function filterMissions(status: string, filter: MissionFilter): boolean {
  if (filter === "all") return true;
  if (filter === "in_progress") {
    return ["accepted", "arriving_pickup", "picked_up", "on_the_way", "arriving_dropoff"].includes(status);
  }
  if (filter === "assigned") return ["assigned", "broadcast"].includes(status);
  return status === filter;
}
