/**
 * Unified Status Profile — context-specific status flows.
 */
import type { MobilityContext } from "./unified-mobility.types";

export function getStatusFlow(context: MobilityContext): string[] {
  switch (context) {
    case "taxi":
      return [
        "searching", "accepted",
        "rider_arriving_pickup", "rider_arrived_pickup",
        "picked_up", "in_progress", "rider_arriving_dropoff",
        "completed",
      ];

    case "food_delivery":
    case "grocery_delivery":
      return [
        "searching", "accepted",
        "rider_arriving_merchant", "rider_arrived_merchant",
        "merchant_preparing", "order_ready",
        "picked_up", "rider_arriving_dropoff",
        "delivered", "completed",
      ];

    case "parcel":
    case "errand":
      return [
        "searching", "accepted",
        "rider_arriving_pickup", "rider_arrived_pickup",
        "picked_up", "rider_arriving_dropoff",
        "proof_pending", "completed",
      ];

    default:
      return ["searching", "accepted", "completed"];
  }
}
