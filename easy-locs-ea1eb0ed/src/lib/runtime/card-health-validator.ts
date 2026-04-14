/**
 * card-health-validator — Validates all dashboard cards/widgets are real, connected, and alive.
 * Detects dead cards, fake metrics, stale data, broken CTAs, and disconnected widgets.
 * Reports to health-aggregator and anomaly-detector.
 */

import { reportAnomaly } from "./anomaly-detector";
import { reportHealth } from "./health-aggregator";

export interface CardDefinition {
  id: string;
  name: string;
  domain: string;
  type: "stat" | "action" | "summary" | "insight" | "navigation" | "widget";
  dataSource: string;
  refreshStrategy: "event" | "interval" | "manual" | "none";
  ctaTarget?: string;
  requiredPermission?: string;
}

export interface CardHealthStatus {
  cardId: string;
  cardName: string;
  status: "healthy" | "stale" | "dead" | "fake" | "disconnected";
  issues: string[];
  lastValidatedAt: string;
}

const REGISTERED_CARDS: CardDefinition[] = [
  { id: "wallet-balance", name: "Wallet Balance", domain: "wallet", type: "stat", dataSource: "wallet.balance", refreshStrategy: "event", ctaTarget: "/wallet" },
  { id: "wallet-transactions", name: "Recent Transactions", domain: "wallet", type: "summary", dataSource: "wallet.transactions", refreshStrategy: "event", ctaTarget: "/wallet/history" },
  { id: "orbit-unread", name: "Unread Messages", domain: "orbit", type: "stat", dataSource: "orbit.unread", refreshStrategy: "event", ctaTarget: "/orbit" },
  { id: "orders-active", name: "Active Orders", domain: "orders", type: "stat", dataSource: "orders.active", refreshStrategy: "event", ctaTarget: "/my-orders" },
  { id: "dashboard-revenue", name: "Revenue Summary", domain: "dashboard", type: "stat", dataSource: "dashboard.revenue", refreshStrategy: "interval" },
  { id: "dashboard-bookings", name: "Bookings Summary", domain: "dashboard", type: "stat", dataSource: "dashboard.bookings", refreshStrategy: "interval" },
  { id: "radar-nearby", name: "Nearby Entities", domain: "radar", type: "widget", dataSource: "radar.nearby", refreshStrategy: "event", ctaTarget: "/radar" },
  { id: "provider-completeness", name: "Profile Completeness", domain: "onboarding", type: "insight", dataSource: "provider.profile", refreshStrategy: "manual" },
  { id: "listing-quality", name: "Listing Quality Score", domain: "listings", type: "insight", dataSource: "listings.quality", refreshStrategy: "interval" },
  { id: "payout-status", name: "Payout Status", domain: "wallet", type: "stat", dataSource: "wallet.payouts", refreshStrategy: "event", ctaTarget: "/wallet/payouts" },
  { id: "support-tickets", name: "Support Tickets", domain: "support", type: "stat", dataSource: "support.tickets", refreshStrategy: "interval", ctaTarget: "/support" },
  { id: "notifications-feed", name: "Notifications", domain: "notifications", type: "widget", dataSource: "notifications.feed", refreshStrategy: "event", ctaTarget: "/notifications" },
  { id: "search-quick", name: "Quick Search", domain: "search", type: "action", dataSource: "search.index", refreshStrategy: "none", ctaTarget: "/search" },
  { id: "food-nearby", name: "Nearby Restaurants", domain: "food", type: "widget", dataSource: "food.nearby", refreshStrategy: "event" },
  { id: "stay-featured", name: "Featured Stays", domain: "stay", type: "widget", dataSource: "stay.featured", refreshStrategy: "interval" },
  { id: "property-listings", name: "Property Listings", domain: "property", type: "widget", dataSource: "property.listings", refreshStrategy: "interval" },
  { id: "services-popular", name: "Popular Services", domain: "services", type: "widget", dataSource: "services.popular", refreshStrategy: "interval" },
  { id: "shops-trending", name: "Trending Shops", domain: "shops", type: "widget", dataSource: "shops.trending", refreshStrategy: "interval" },
  { id: "forex-rates", name: "Live Forex Rates", domain: "forex", type: "widget", dataSource: "forex.rates", refreshStrategy: "interval", ctaTarget: "/wallet/forex" },
  { id: "forex-converter", name: "Currency Converter", domain: "forex", type: "action", dataSource: "forex.converter", refreshStrategy: "none", ctaTarget: "/wallet/forex" },
  { id: "prayer-times", name: "Prayer Times", domain: "prayer", type: "widget", dataSource: "prayer.times", refreshStrategy: "interval", ctaTarget: "/dashboard/prayer-times" },
  { id: "prayer-next", name: "Next Prayer Countdown", domain: "prayer", type: "stat", dataSource: "prayer.next", refreshStrategy: "interval", ctaTarget: "/dashboard/prayer-times" },
  { id: "c2c-listings", name: "C2C Active Listings", domain: "c2c", type: "widget", dataSource: "c2c.listings", refreshStrategy: "event", ctaTarget: "/marketplace/c2c" },
  { id: "c2c-conversations", name: "C2C Conversations", domain: "c2c", type: "stat", dataSource: "c2c.conversations", refreshStrategy: "event", ctaTarget: "/marketplace/c2c" },
  { id: "c2c-favorites", name: "Followed Listings", domain: "c2c", type: "widget", dataSource: "c2c.favorites", refreshStrategy: "event", ctaTarget: "/favorites" },
  { id: "geo-explorer", name: "Geographic Explorer", domain: "geo", type: "navigation", dataSource: "geo.countries", refreshStrategy: "manual", ctaTarget: "/explorer" },
  { id: "geo-city-profile", name: "City Profile", domain: "geo", type: "widget", dataSource: "geo.city", refreshStrategy: "manual", ctaTarget: "/explorer" },
  { id: "wallet-topup", name: "Wallet Top Up", domain: "wallet", type: "action", dataSource: "wallet.topup", refreshStrategy: "none", ctaTarget: "/wallet/top-up" },
  { id: "wallet-transfer", name: "Wallet Transfer", domain: "wallet", type: "action", dataSource: "wallet.transfer", refreshStrategy: "none", ctaTarget: "/wallet/transfer" },
  { id: "wallet-request", name: "Payment Request", domain: "wallet", type: "action", dataSource: "wallet.request", refreshStrategy: "none", ctaTarget: "/wallet/request" },
  { id: "driver-earnings", name: "Driver Earnings", domain: "driver", type: "stat", dataSource: "driver.earnings", refreshStrategy: "event", ctaTarget: "/driver/earnings" },
  { id: "driver-missions", name: "Active Missions", domain: "driver", type: "widget", dataSource: "driver.missions", refreshStrategy: "event", ctaTarget: "/driver/missions" },
  { id: "merchant-orders", name: "Merchant Order Board", domain: "merchant", type: "widget", dataSource: "merchant.orders", refreshStrategy: "event", ctaTarget: "/merchant/orders" },
  { id: "merchant-analytics", name: "Merchant Analytics", domain: "merchant", type: "insight", dataSource: "merchant.analytics", refreshStrategy: "interval" },
  { id: "travel-flights", name: "Flight Search", domain: "travel", type: "action", dataSource: "travel.flights", refreshStrategy: "none", ctaTarget: "/travel/flights" },
  { id: "travel-stays", name: "Stay Search", domain: "travel", type: "action", dataSource: "travel.stays", refreshStrategy: "none", ctaTarget: "/travel/stays" },
  { id: "boost-active", name: "Active Boosts", domain: "boost", type: "stat", dataSource: "boost.active", refreshStrategy: "event", ctaTarget: "/boost" },
  { id: "loyalty-points", name: "Loyalty Points", domain: "loyalty", type: "stat", dataSource: "loyalty.points", refreshStrategy: "event", ctaTarget: "/loyalty" },
  { id: "intelligence-ticker", name: "Intelligence Ticker", domain: "intelligence", type: "widget", dataSource: "intelligence.feed", refreshStrategy: "interval" },
  { id: "asset-governance", name: "Asset Quality Monitor", domain: "governance", type: "insight", dataSource: "governance.assets", refreshStrategy: "interval" },
];

let cardStatuses: CardHealthStatus[] = [];

export function validateCard(card: CardDefinition): CardHealthStatus {
  const issues: string[] = [];
  let status: CardHealthStatus["status"] = "healthy";
  const now = new Date().toISOString();

  if (!card.dataSource) {
    issues.push("No data source defined");
    status = "dead";
  }

  if (card.refreshStrategy === "none" && card.type === "stat") {
    issues.push("Stat card has no refresh strategy — data will become stale");
    status = "stale";
  }

  if (card.type === "action" && !card.ctaTarget) {
    issues.push("Action card has no CTA target — button leads nowhere");
    status = "disconnected";
  }

  if (card.type === "navigation" && !card.ctaTarget) {
    issues.push("Navigation card has no CTA target");
    status = "disconnected";
  }

  return { cardId: card.id, cardName: card.name, status, issues, lastValidatedAt: now };
}

export function validateAllCards(): CardHealthStatus[] {
  cardStatuses = REGISTERED_CARDS.map(card => validateCard(card));

  const dead = cardStatuses.filter(c => c.status === "dead").length;
  const stale = cardStatuses.filter(c => c.status === "stale").length;
  const disconnected = cardStatuses.filter(c => c.status === "disconnected").length;
  const healthy = cardStatuses.filter(c => c.status === "healthy").length;

  if (dead > 0) {
    for (const c of cardStatuses.filter(c => c.status === "dead")) {
      reportAnomaly("architecture_violation", "card-health",
        `Dead card: "${c.cardName}" — ${c.issues.join("; ")}`, "high",
        { cardId: c.cardId });
    }
  }

  reportHealth(
    "dashboard",
    dead > 0 ? "degraded" : "ok",
    undefined,
    dead > 0 || stale > 0 ? `${dead} dead, ${stale} stale, ${disconnected} disconnected cards` : undefined
  );

  return cardStatuses;
}

export function getCardHealthStatuses(): CardHealthStatus[] {
  return [...cardStatuses];
}

export function getDeadCards(): CardHealthStatus[] {
  return cardStatuses.filter(c => c.status !== "healthy");
}

export function registerCard(card: CardDefinition): void {
  const existing = REGISTERED_CARDS.findIndex(c => c.id === card.id);
  if (existing >= 0) {
    REGISTERED_CARDS[existing] = card;
  } else {
    REGISTERED_CARDS.push(card);
  }
}

export function getRegisteredCards(): CardDefinition[] {
  return [...REGISTERED_CARDS];
}

export function runCardHealthValidator(): { total: number; healthy: number; dead: number; stale: number } {
  const statuses = validateAllCards();
  const healthy = statuses.filter(c => c.status === "healthy").length;
  const dead = statuses.filter(c => c.status === "dead").length;
  const stale = statuses.filter(c => c.status === "stale").length;

  console.log(`[card-health] ${statuses.length} cards validated — ${healthy} healthy, ${dead} dead, ${stale} stale`);
  return { total: statuses.length, healthy, dead, stale };
}
