/**
 * Centralized navigation config — Single source of truth.
 * 5 tabs: Dashboard | Radar | Orbit | Wallet | Me
 */
import { LayoutDashboard, Radar, MessageCircle, Wallet, User } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface NavTab {
  key: string;
  label: string;
  path: string;
  icon: LucideIcon;
  match: (pathname: string) => boolean;
}

export const NAV_TABS_CONFIG: NavTab[] = [
  {
    key: "dashboard",
    label: "Dashboard",
    path: "/",
    icon: LayoutDashboard,
    match: (p) => p === "/" || p === "/home" || p === "/dashboard",
  },
  {
    key: "radar",
    label: "Radar",
    path: "/radar",
    icon: Radar,
    match: (p) =>
      p === "/radar" || p === "/map" ||
      p.startsWith("/browse") ||
      p.startsWith("/explore") || p.startsWith("/discover") ||
      p.startsWith("/search") ||
      p.startsWith("/listing/") || p.startsWith("/store/") ||
      p.startsWith("/shop") ||
      p.startsWith("/food") || p.startsWith("/grocery") ||
      p.startsWith("/travel") || p.startsWith("/property") ||
      p.startsWith("/mobility/") || p.startsWith("/rider/") ||
      p.startsWith("/ride") ||
      p.startsWith("/track/") ||
      p.startsWith("/services") || p.startsWith("/real-estate") ||
      p.startsWith("/geo-explorer") ||
      p.startsWith("/annonces"),
  },
  {
    key: "orbit",
    label: "Orbit",
    path: "/orbit",
    icon: MessageCircle,
    match: (p) => p.startsWith("/orbit"),
  },
  {
    key: "wallet",
    label: "Wallet",
    path: "/wallet",
    icon: Wallet,
    match: (p) =>
      p.startsWith("/wallet") || p.startsWith("/pay") ||
      p === "/pos" || p.startsWith("/pos/") || p === "/checkout" ||
      p.startsWith("/my-orders") || p.startsWith("/orders"),
  },
  {
    key: "me",
    label: "Me",
    path: "/me",
    icon: User,
    match: (p) =>
      p === "/me" || p.startsWith("/me/") ||
      p.startsWith("/settings") ||
      p.startsWith("/merchant") || p.startsWith("/seller") ||
      p.startsWith("/business") || p.startsWith("/notifications") ||
      p.startsWith("/driver") || p.startsWith("/favorites"),
  },
];

export const HIDE_NAV_PREFIXES = [
  "/login", "/signup", "/forgot-password", "/reset-password",
  "/verify-email", "/onboarding", "/auth/",
  "/checkout",
  "/pay/",
  "/order/",
  "/travel/flight-passengers",
  "/travel/flight-payment",
  "/travel/flight-confirmation",
  "/property/booking",
  "/property/payment",
  "/property/confirmation",
];

/**
 * Task #988 — Orbit pillar landing + sub-sections must keep the bottom nav
 * visible (otherwise users entering Orbit from the bottom nav are trapped
 * with no way back to the other 4 pillars). The nav should only hide
 * inside an actual conversation thread (/orbit/<conversationId>).
 */
const ORBIT_VISIBLE_PATHS = new Set([
  "/orbit",
  "/orbit/contacts",
  "/orbit/add",
  "/orbit/identity",
  "/orbit/support",
]);

export function shouldHideBottomNav(pathname: string): boolean {
  // Normalize trailing slash so "/orbit" and "/orbit/" behave identically.
  const p = pathname.length > 1 && pathname.endsWith("/")
    ? pathname.slice(0, -1)
    : pathname;
  if (HIDE_NAV_PREFIXES.some((prefix) => p.startsWith(prefix))) return true;
  if (p.startsWith("/orbit")) {
    return !ORBIT_VISIBLE_PATHS.has(p);
  }
  return false;
}

export const NAV_TABS = {
  dashboard: "/",
  radar: "/radar",
  orbit: "/orbit",
  wallet: "/wallet",
  me: "/me",
} as const;

/** @deprecated Use ServiceMenuGrid / menu-registry instead. Kept for backward compat. */
export const EXPLORE_CATEGORIES = [
  { key: "food", label: "Food", icon: "🍔", path: "/browse/food" },
  { key: "grocery", label: "Grocery", icon: "🛒", path: "/browse/grocery" },
  { key: "shops", label: "Shops", icon: "🛍️", path: "/browse/shops" },
  { key: "services", label: "Services", icon: "🔧", path: "/browse/services" },
  { key: "taxi", label: "Taxi", icon: "🚕", path: "/mobility/taxi" },
  { key: "delivery", label: "Delivery", icon: "🚚", path: "/mobility/delivery" },
  { key: "property", label: "Property", icon: "🏠", path: "/property-hub" },
  { key: "travel", label: "Travel", icon: "✈️", path: "/travel" },
  { key: "geo", label: "Explorer", icon: "🌍", path: "/geo-explorer" },
] as const;
