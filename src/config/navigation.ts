/**
 * Centralized navigation config — Single source of truth.
 * All primary routes and nav structure defined here.
 */

export const NAV_TABS = {
  home: "/",
  explore: "/explore",
  map: "/map",
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
  {
    title: "Business",
    items: [
      { label: "Business Hub", path: "/settings/business" },
    ],
  },
] as const;

export const EXPLORE_CATEGORIES = [
  { key: "food", label: "Food", icon: "🍔", path: "/food" },
  { key: "shops", label: "Shops", icon: "🛍️", path: "/explore" },
  { key: "travel", label: "Travel", icon: "✈️", path: "/explore" },
  { key: "property", label: "Property", icon: "🏠", path: "/explore" },
  { key: "services", label: "Services", icon: "🔧", path: "/services-hub" },
] as const;
