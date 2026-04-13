import { platformBus } from "@/lib/shared/platform-bus";

export type NavigationPillar = "dashboard" | "radar" | "orbit" | "wallet" | "me";
export type NavigationMode = "tab" | "stack" | "modal" | "deeplink" | "overlay";

export interface NavigationEntry {
  path: string;
  pillar: NavigationPillar;
  mode: NavigationMode;
  requiresAuth: boolean;
  deepLinkPattern: string | null;
  verticalEntry: string | null;
}

export const PILLAR_ROOTS: Record<NavigationPillar, string> = {
  dashboard: "/",
  radar: "/radar",
  orbit: "/orbit",
  wallet: "/wallet",
  me: "/me",
};

export const VERTICAL_ENTRY_POINTS: Record<string, string> = {
  food: "/food",
  hotel: "/travel",
  services: "/services",
  property: "/me/gestion-immo",
  retail: "/shop",
  marketplace: "/browse",
  mobility: "/mobility",
  events: "/events",
};

export const DEEP_LINK_PATTERNS: Record<string, string> = {
  listing: "/listing/:id",
  shop: "/shop/:slug",
  restaurant: "/food/restaurant/:id",
  thread: "/orbit/chat/:threadId",
  order: "/orders/:orderId",
  payment: "/wallet/pay/:threadId",
  live: "/live/:liveId",
  profile: "/profile/:userId",
  qr: "/qr/:code",
};

export const QUICK_ACTIONS = [
  { key: "scan_qr", icon: "qr", label: "Scan QR", path: "/qr-scan", requiresAuth: true },
  { key: "send_money", icon: "send", label: "Send Money", path: "/wallet/send", requiresAuth: true },
  { key: "new_listing", icon: "plus", label: "New Listing", path: "/sell/create", requiresAuth: true },
  { key: "contact_support", icon: "headphones", label: "Support", path: "/settings/support", requiresAuth: false },
  { key: "share_location", icon: "map-pin", label: "Share Location", path: "/radar", requiresAuth: true },
] as const;

export interface NavigationTransition {
  from: string;
  to: string;
  pillar: NavigationPillar;
  mode: NavigationMode;
  timestamp: number;
}

const navigationStack: NavigationTransition[] = [];

export function pushNavigation(from: string, to: string, pillar: NavigationPillar, mode: NavigationMode): void {
  const transition: NavigationTransition = { from, to, pillar, mode, timestamp: Date.now() };
  navigationStack.push(transition);
  if (navigationStack.length > 50) navigationStack.shift();
  platformBus.emit("ui:panel_changed", { from, to, pillar, mode }, "navigation");
}

export function getBackDestination(): string | null {
  if (navigationStack.length < 2) return null;
  return navigationStack[navigationStack.length - 2].to;
}

export function getNavigationHistory(): readonly NavigationTransition[] {
  return navigationStack;
}

export function resolveDeepLink(url: string): { path: string; params: Record<string, string> } | null {
  for (const [key, pattern] of Object.entries(DEEP_LINK_PATTERNS)) {
    const regex = new RegExp("^" + pattern.replace(/:(\w+)/g, "(?<$1>[^/]+)") + "$");
    const match = url.match(regex);
    if (match?.groups) {
      return { path: pattern.replace(/:(\w+)/g, (_, k) => match.groups![k]), params: match.groups };
    }
  }
  return null;
}
