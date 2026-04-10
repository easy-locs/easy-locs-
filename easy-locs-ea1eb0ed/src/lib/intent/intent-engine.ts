import type { IntentContext, ResolvedIntent, IntentAction } from "./intent-types";

const CTA_TO_ACTION: Record<string, IntentAction> = {
  open: "navigate_entity",
  orbit: "open_orbit",
  wallet: "open_wallet",
  map: "open_map",
  save: "save_entity",
  share: "share_entity",
  transfer: "wallet_transfer",
  pay: "wallet_payment",
  topup: "wallet_topup",
  support: "support_request",
  thread: "open_orbit_thread",
  viewing: "request_viewing",
};

const BOOKING_VERTICALS = new Set(["stay", "beauty", "services"]);
const ORDER_VERTICALS = new Set(["food", "grocery", "pharmacy"]);

const INTENT_HINT_MAP: Record<string, IntentAction> = {
  buy_property: "navigate_entity",
  rent_property: "navigate_entity",
  project_property: "navigate_entity",
  stay_booking: "start_booking",
  food_order: "start_order",
  grocery_order: "start_order",
  service_request: "start_booking",
  ride_request: "navigate_entity",
  wallet_transfer: "wallet_transfer",
  wallet_payment: "wallet_payment",
  wallet_topup: "wallet_topup",
  support_request: "support_request",
};

export function detectIntent(ctx: IntentContext): ResolvedIntent {
  const action = resolveAction(ctx);
  const source = resolveSource(ctx);
  const confidence = computeConfidence(ctx, action);

  return {
    action,
    entityId: ctx.entityId,
    entityType: ctx.entityType,
    vertical: ctx.vertical,
    routeParams: buildRouteParams(ctx),
    confidence,
    source,
    metadata: ctx.metadata ?? {},
  };
}

function resolveAction(ctx: IntentContext): IntentAction {
  if (ctx.intentHint) {
    const hinted = INTENT_HINT_MAP[ctx.intentHint];
    if (hinted) return hinted;
  }

  if (ctx.ctaType) {
    const mapped = CTA_TO_ACTION[ctx.ctaType];
    if (mapped) {
      if (mapped === "navigate_entity") {
        return refineNavigateAction(ctx);
      }
      if (mapped === "open_orbit" && !ctx.entityId) return "support_request";
      if (mapped === "open_wallet" && ctx.entityType === "property") return "navigate_entity";
      return mapped;
    }
  }

  if (ctx.searchQuery) return "search_results";

  return refineNavigateAction(ctx);
}

function refineNavigateAction(ctx: IntentContext): IntentAction {
  if (ctx.entityType === "stay" || BOOKING_VERTICALS.has(ctx.vertical)) return "start_booking";
  if (ctx.entityType === "merchant" && ORDER_VERTICALS.has(ctx.vertical)) return "start_order";
  if (ctx.entityType === "driver") return "navigate_entity";
  return "navigate_entity";
}

function resolveSource(ctx: IntentContext): ResolvedIntent["source"] {
  if (ctx.surface?.includes("dashboard") || ctx.feedKey?.startsWith("dashboard_")) return "dashboard";
  if (ctx.surface?.includes("radar") || ctx.feedKey?.startsWith("radar_")) return "radar";
  if (ctx.surface?.includes("orbit")) return "orbit";
  if (ctx.surface?.includes("wallet")) return "wallet";
  if (ctx.surface?.includes("search")) return "search";
  if (ctx.feedKey || ctx.surface) return "story";
  return "direct";
}

function computeConfidence(ctx: IntentContext, action: IntentAction): number {
  let score = 0.5;
  if (ctx.entityId) score += 0.2;
  if (ctx.entityType) score += 0.1;
  if (ctx.vertical) score += 0.1;
  if (ctx.ctaType) score += 0.1;
  if (ctx.intentHint) score += 0.15;
  if (action === "save_entity" || action === "share_entity") score = Math.min(score, 0.9);
  return Math.min(score, 1.0);
}

function buildRouteParams(ctx: IntentContext): Record<string, string> {
  const params: Record<string, string> = {};
  if (ctx.entityId) params.entityId = ctx.entityId;
  if (ctx.entityType) params.entityType = ctx.entityType;
  if (ctx.vertical) params.vertical = ctx.vertical;
  if (ctx.categoryKey) params.categoryKey = ctx.categoryKey;
  if (ctx.subcategoryKey) params.subcategoryKey = ctx.subcategoryKey;
  if (ctx.searchQuery) params.searchQuery = ctx.searchQuery;
  if (ctx.intentHint) params.intentHint = ctx.intentHint;
  return params;
}
