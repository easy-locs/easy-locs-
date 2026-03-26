/**
 * Centralized navigation config — Single source of truth.
 * 5 tabs: Dashboard | Radar | Orbit | Wallet | Me
 */
import { LayoutDashboard, Radar, MessageCircle, Wallet, User } from "lucide-react";
import type { LucideIcon } from "lucide-react";

/* ── Primary 5-tab bottom navigation ── */
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
    match: (p) =>
      p === "/" || p === "/home" || p === "/index" || p === "/dashboard",
  },
  {
    key: "radar",
    label: "Radar",
    path: "/radar",
    icon: Radar,
    match: (p) =>
      p === "/radar" || p === "/map" || p.startsWith("/explore") ||
      p.startsWith("/search") || p.startsWith("/discover") ||
      p.startsWith("/listing/") || p.startsWith("/store/") ||
      p.startsWith("/services-hub") ||
      p.startsWith("/real-estate") || p.startsWith("/travel") ||
      p.startsWith("/nearby") || p.startsWith("/top-rated") ||
      p.startsWith("/trending") || p.startsWith("/super-map") ||
      p.startsWith("/food") || p.startsWith("/grocery") ||
      p.startsWith("/shops") || p.startsWith("/achille") ||
      p.startsWith("/ride") || p.startsWith("/send") ||
      p.startsWith("/track/") ||
      p.startsWith("/mobility/") || p.startsWith("/rider/"),
  },
  {
    key: "orbit",
    label: "Orbit",
    path: "/dashboard/communication",
    icon: MessageCircle,
    match: (p) =>
      p.startsWith("/dashboard/communication") || p.startsWith("/orbit") ||
      p.startsWith("/ghost"),
  },
  {
    key: "wallet",
    label: "Wallet",
    path: "/wallet/hub",
    icon: Wallet,
    match: (p) => p.startsWith("/wallet") || p === "/pos" || p === "/my-orders" || p === "/checkout",
  },
  {
    key: "profile",
    label: "Me",
    path: "/settings",
    icon: User,
    match: (p) =>
      p.startsWith("/settings") || p.startsWith("/me") || p.startsWith("/business") ||
      p.startsWith("/property-hub") || p.startsWith("/seller") || p.startsWith("/merchant") ||
      p.startsWith("/notifications") || p.startsWith("/dashboard/settings") ||
      p.startsWith("/dashboard/my-shop") || p.startsWith("/dashboard/seller") ||
      p.startsWith("/dashboard/driver"),
  },
];

/** Paths where the bottom nav should be hidden */
export const HIDE_NAV_PREFIXES = [
  "/login", "/signup", "/forgot-password", "/reset-password",
  "/verify-email", "/tenant-signup", "/onboarding", "/auth/",
  "/emergency-test", "/app",
];

/* ── Legacy path mappings for backward compat ── */
export const NAV_TABS = {
  dashboard: "/",
  radar: "/radar",
  orbit: "/dashboard/communication",
  wallet: "/wallet/hub",
  profile: "/settings",
} as const;

export const PROFILE_SECTIONS = [
  {
    title: "Account",
    items: [
      { label: "Personal Info", path: "/settings/account" },
      { label: "Addresses", path: "/settings/addresses" },
      { label: "Payment Methods", path: "/settings/payment-methods" },
    ],
  },
  {
    title: "Orbit",
    items: [
      { label: "Chat Settings", path: "/settings/orbit" },
      { label: "Ghost Mode", path: "/settings/orbit" },
    ],
  },
  {
    title: "Wallet",
    items: [
      { label: "Wallet Settings", path: "/settings/wallet" },
    ],
  },
  {
    title: "Notifications",
    items: [
      { label: "Notification Preferences", path: "/settings/notifications" },
    ],
  },
  {
    title: "Security",
    items: [
      { label: "Security & Privacy", path: "/settings/security" },
    ],
  },
] as const;

export const EXPLORE_CATEGORIES = [
  { key: "food", label: "Food", icon: "🍔", path: "/food" },
  { key: "shops", label: "Shops", icon: "🛍️", path: "/radar" },
  { key: "travel", label: "Travel", icon: "✈️", path: "/travel" },
  { key: "property", label: "Property", icon: "🏠", path: "/real-estate" },
  { key: "services", label: "Services", icon: "🔧", path: "/services-hub" },
] as const;
