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
