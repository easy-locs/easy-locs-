/**
 * UserIntent — canonical, journey-scoped intent type.
 * Replaces the ad-hoc IntentAction type for cross-pillar journey events.
 * IntentAction is preserved for backward compatibility with existing callers.
 *
 * Naming convention: <pillar>_<verb>
 * - "discovery_*"  → Radar / browse flows
 * - "booking_*"    → Reserve / schedule flows
 * - "order_*"      → Transactional order flows
 * - "ride_*"       → Mobility flows
 * - "payment_*"    → Wallet / financial flows
 * - "orbit_*"      → Communication flows
 * - "manage_*"     → Dashboard / asset management flows
 * - "support_*"    → Help / escalation flows
 */
export type UserIntent =
  // Discovery
  | "discovery_browse"
  | "discovery_search"
  | "discovery_entity_open"
  // Booking
  | "booking_start"
  | "booking_confirm"
  | "booking_cancel"
  | "booking_reschedule"
  // Order
  | "order_start"
  | "order_checkout"
  | "order_track"
  | "order_cancel"
  // Ride
  | "ride_request"
  | "ride_track"
  | "ride_cancel"
  // Payment
  | "payment_initiate"
  | "payment_confirm"
  | "payment_retry"
  | "payment_topup"
  | "payment_transfer"
  // Orbit / Communication
  | "orbit_open_thread"
  | "orbit_send_message"
  | "orbit_call_start"
  // Manage / Dashboard
  | "manage_asset_view"
  | "manage_asset_create"
  | "manage_asset_edit"
  // Support
  | "support_open"
  | "support_escalate"
  | "support_resolve"
  // Deep link / navigation
  | "deeplink_resolve"
  | "resume_interrupted";

export type IntentAction =
  | "navigate_entity"
  | "open_orbit"
  | "open_wallet"
  | "open_map"
  | "save_entity"
  | "share_entity"
  | "search_results"
  | "start_booking"
  | "start_order"
  | "navigate_vertical"
  | "navigate_dashboard"
  | "wallet_transfer"
  | "wallet_payment"
  | "wallet_topup"
  | "support_request"
  | "open_orbit_thread"
  | "request_viewing";

export type EntityVertical =
  | "property"
  | "stay"
  | "food"
  | "grocery"
  | "mobility"
  | "utility"
  | "services"
  | "beauty"
  | "pharmacy"
  | "shops";

export type CanonicalEntityType =
  | "property"
  | "stay"
  | "merchant"
  | "product"
  | "driver"
  | "service"
  | "atm"
  | "fuel"
  | "parking"
  | "pharmacy"
  | "hospital"
  | "navigation";

export interface IntentContext {
  entityId: string;
  entityType: CanonicalEntityType;
  vertical: EntityVertical | string;
  categoryKey?: string;
  subcategoryKey?: string;
  ctaType?: string;
  feedKey?: string;
  surface?: string;
  searchQuery?: string;
  intentHint?: string;
  metadata?: Record<string, unknown>;
}

export interface ResolvedIntent {
  action: IntentAction;
  entityId: string;
  entityType: CanonicalEntityType;
  vertical: EntityVertical | string;
  routeParams: Record<string, string>;
  confidence: number;
  source: "story" | "search" | "radar" | "dashboard" | "orbit" | "wallet" | "direct";
  metadata: Record<string, unknown>;
}
