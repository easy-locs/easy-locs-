import type { ResolvedIntent } from "./intent-types";

type RouteResult = {
  path: string;
  action: "navigate" | "sheet" | "event";
};

const ENTITY_ROUTE_MAP: Record<string, (intent: ResolvedIntent) => string> = {
  "property:property": (i) => i.entityId ? `/property?listing=${i.entityId}` : `/property`,
  "stay:stay": (i) => `/travel/hotel/${i.entityId}`,
  "merchant:food": (i) => `/food/restaurant/${i.entityId}`,
  "merchant:grocery": (i) => `/browse/grocery`,
  "merchant:shops": (i) => `/s/${i.entityId}`,
  "merchant:beauty": (i) => `/s/${i.entityId}`,
  "merchant:services": (i) => `/s/${i.entityId}`,
  "merchant:pharmacy": (i) => `/s/${i.entityId}`,
  "product:food": (i) => `/food/restaurant/${i.entityId}`,
  "product:grocery": (i) => `/browse/grocery`,
  "product:shops": (i) => `/s/${i.entityId}`,
  "driver:mobility": () => `/mobility/taxi`,
  "service:utility": () => `/browse/utility`,
  "atm:utility": () => `/browse/utility`,
  "fuel:utility": () => `/browse/utility`,
  "parking:utility": () => `/browse/utility`,
  "pharmacy:utility": () => `/browse/utility`,
  "hospital:utility": () => `/browse/utility`,
};

const VERTICAL_BROWSE_MAP: Record<string, string> = {
  property: "/property",
  stay: "/stay",
  food: "/food",
  grocery: "/browse/grocery",
  mobility: "/mobility/taxi",
  utility: "/browse/utility",
  services: "/browse/services",
  beauty: "/browse/beauty",
  pharmacy: "/browse/pharmacy",
  shops: "/browse/shops",
};

export function resolveRoute(intent: ResolvedIntent): RouteResult {
  switch (intent.action) {
    case "navigate_entity":
    case "start_booking":
    case "start_order":
    case "request_viewing":
      return { path: resolveEntityRoute(intent), action: "navigate" };

    case "navigate_vertical":
      return {
        path: VERTICAL_BROWSE_MAP[intent.vertical] ?? `/browse/${intent.vertical}`,
        action: "navigate",
      };

    case "open_orbit":
      return {
        path: `/orbit?entity=${intent.entityId}&type=${intent.entityType}`,
        action: "navigate",
      };

    case "open_orbit_thread":
      return {
        path: intent.entityId
          ? `/orbit/${intent.entityId}`
          : `/orbit`,
        action: "navigate",
      };

    case "support_request":
      return {
        path: intent.entityId
          ? `/orbit/${intent.entityId}`
          : `/orbit`,
        action: "navigate",
      };

    case "open_wallet":
      return { path: "/wallet", action: "navigate" };

    case "wallet_transfer":
      return { path: "/wallet/transfer", action: "navigate" };

    case "wallet_payment":
      return {
        path: intent.entityId
          ? `/wallet?pay=${intent.entityId}&type=${intent.entityType}`
          : "/wallet",
        action: "navigate",
      };

    case "wallet_topup":
      return { path: "/wallet/top-up", action: "navigate" };

    case "open_map":
      return {
        path: `/radar?focus=${intent.entityId}&type=${intent.entityType}`,
        action: "navigate",
      };

    case "search_results":
      return {
        path: `/search?q=${encodeURIComponent(intent.routeParams.searchQuery ?? "")}`,
        action: "navigate",
      };

    case "save_entity":
      return { path: "", action: "event" };

    case "share_entity":
      return { path: "", action: "event" };

    case "navigate_dashboard":
      return { path: "/dashboard", action: "navigate" };

    default:
      return { path: "/", action: "navigate" };
  }
}

function resolveEntityRoute(intent: ResolvedIntent): string {
  const key = `${intent.entityType}:${intent.vertical}`;
  const resolver = ENTITY_ROUTE_MAP[key];

  if (resolver) return resolver(intent);

  if (intent.vertical && VERTICAL_BROWSE_MAP[intent.vertical]) {
    return VERTICAL_BROWSE_MAP[intent.vertical];
  }

  if (intent.entityId) return `/s/${intent.entityId}`;

  return "/";
}
