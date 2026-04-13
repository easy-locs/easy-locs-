export type ActionLevel = "inline" | "overlay" | "full";

export type Pillar = "dashboard" | "radar" | "orbit" | "wallet" | "me";

export interface NavigationContext {
  entityId?: string;
  entityName?: string;
  entityType?: string;
  entityImage?: string;
  ownerUserId?: string;
  amount?: number;
  currency?: string;
  note?: string;
  returnRoute?: string;
}

export interface NavigationIntent {
  from: Pillar;
  to: Pillar;
  action: string;
  level: ActionLevel;
  route: string;
  overlayType?: OverlayType;
  context?: NavigationContext;
}

export type OverlayType = "radar" | "orbit" | "wallet" | "me" | "entity";

export function resolveActionLevel(action: string): ActionLevel {
  if (INLINE_ACTIONS.has(action)) return "inline";
  if (OVERLAY_ACTIONS.has(action)) return "overlay";
  return "full";
}

const INLINE_ACTIONS = new Set([
  "view_preview",
  "see_suggestion",
  "scroll_cards",
  "view_balance",
  "view_unread_count",
  "quick_stat",
]);

const OVERLAY_ACTIONS = new Set([
  "explore_nearby",
  "see_all_results",
  "view_messages",
  "quick_pay",
  "scan_qr",
  "quick_transfer",
  "view_transactions",
  "view_profile",
  "message_entity",
  "contact_support",
  "view_wallet_detail",
  "view_entity_detail",
  "quick_reply",
  "compare_results",
  "compose_message",
  "pillar_switch",
  "open_thread",
  "pay_entity",
  "contact_entity",
]);

const FULL_ACTIONS = new Set([
  "full_search",
  "open_full_map",
  "explore_zone",
  "filter_advanced",
  "manage_payments",
  "manage_profile",
  "manage_business",
  "view_analytics",
  "full_chat",
  "active_call",
  "manage_settings",
]);

export function resolveNavigationIntent(
  from: Pillar,
  targetRoute: string,
  action?: string,
  context?: NavigationContext
): NavigationIntent {
  const to = routeToPillar(targetRoute);
  const resolvedAction = action || inferAction(targetRoute);
  const level = resolveActionLevel(resolvedAction);

  const samePillar = from === to;
  const finalLevel = samePillar ? "inline" : level;

  return {
    from,
    to,
    action: resolvedAction,
    level: finalLevel,
    route: targetRoute,
    overlayType: finalLevel === "overlay" ? pillarToOverlayType(to) : undefined,
    context,
  };
}

export function routeToPillar(route: string): Pillar {
  if (route.startsWith("/radar")) return "radar";
  if (route.startsWith("/orbit")) return "orbit";
  if (route.startsWith("/wallet") || route.startsWith("/pay") || route.startsWith("/my-orders")) return "wallet";
  if (route.startsWith("/me") || route.startsWith("/settings")) return "me";
  if (route === "/" || route.startsWith("/home")) return "dashboard";
  return "radar";
}

function pillarToOverlayType(pillar: Pillar): OverlayType {
  switch (pillar) {
    case "radar": return "radar";
    case "orbit": return "orbit";
    case "wallet": return "wallet";
    case "me": return "me";
    default: return "radar";
  }
}

function inferAction(route: string): string {
  if (route.includes("/transfer")) return "quick_transfer";
  if (route.includes("/scan")) return "scan_qr";
  if (route.includes("/top-up")) return "quick_pay";
  if (route.includes("/transactions")) return "view_transactions";
  if (route.includes("/orbit")) return "view_messages";
  if (route === "/wallet") return "view_wallet_detail";
  if (route === "/me") return "view_profile";
  if (route.startsWith("/radar")) return "explore_nearby";
  return "full_search";
}
