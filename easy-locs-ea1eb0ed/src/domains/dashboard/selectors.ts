/**
 * Dashboard Selectors — Read-only projections from other domain stores.
 *
 * Dashboard NEVER writes. It only reads and aggregates.
 */
import type { CanonicalDashboardSummary, DashboardActivityItem } from "../shared/canonical-types";

/**
 * Maps a platform bus event to a DashboardActivityItem.
 * Returns null for event types that are not user-facing.
 */
function mapEventToActivity(event: {
  type: string;
  payload: unknown;
  timestamp: number;
  id?: string;
}, index: number): DashboardActivityItem | null {
  const ts = new Date(event.timestamp).toISOString();
  const id = event.id ?? `event-${index}`;
  const payload = (event.payload ?? {}) as Record<string, unknown>;

  if (event.type.startsWith("orbit:") || event.type.startsWith("messaging:")) {
    return {
      id,
      type: "message",
      title: "New message",
      subtitle: typeof payload.preview === "string" ? payload.preview : null,
      timestamp: ts,
      metadata: payload,
    };
  }
  if (event.type.startsWith("wallet:") || event.type.startsWith("payment:")) {
    return {
      id,
      type: "payment",
      title: "Payment activity",
      subtitle: typeof payload.amount === "number" ? `${payload.amount} ${payload.currency ?? ""}` : null,
      timestamp: ts,
      metadata: payload,
    };
  }
  if (event.type.startsWith("booking:")) {
    return {
      id,
      type: "booking",
      title: "Booking update",
      subtitle: typeof payload.status === "string" ? payload.status : null,
      timestamp: ts,
      metadata: payload,
    };
  }
  if (event.type.startsWith("listing:") || event.type.startsWith("marketplace:")) {
    return {
      id,
      type: "listing",
      title: "Listing activity",
      subtitle: typeof payload.listingId === "string" ? `Listing ${payload.listingId}` : null,
      timestamp: ts,
      metadata: payload,
    };
  }
  if (event.type.startsWith("call:")) {
    return {
      id,
      type: "call",
      title: "Call activity",
      subtitle: typeof payload.status === "string" ? payload.status : null,
      timestamp: ts,
      metadata: payload,
    };
  }
  // Skip internal/debug events
  return null;
}

/**
 * Aggregates a dashboard summary from existing domain stores.
 * This is a pure read — no side effects, no writes.
 */
export function selectDashboardSummary(): CanonicalDashboardSummary {
  const { useWalletStore } = require("@/stores/walletStore");
  const { useOrbitThreadStore } = require("@/stores/orbit/thread.store");
  const { useBookingStore } = require("@/stores/bookingStore");
  const { useListingStore } = require("@/stores/listingStore");
  const { platformBus } = require("@/lib/shared/platform-bus");

  const wallet = useWalletStore.getState();
  const orbitThreads = useOrbitThreadStore.getState();
  const booking = useBookingStore.getState();
  const listing = useListingStore.getState();

  // Derive unread message count from orbit threads
  const unreadMessages = (orbitThreads.threads as Array<{ unreadCountCache?: number }>).reduce(
    (sum: number, t) => sum + (t.unreadCountCache ?? 0),
    0,
  );

  // Active conversations = total thread count (each thread = an active conversation)
  const activeConversations = orbitThreads.threads.length;

  // Pending bookings — user-scoped: bookings the current user initiated that are awaiting confirmation
  const myBuyerBookings = booking.getMyBuyerBookings() as Array<{ status: string }>;
  const pendingBookings = myBuyerBookings.filter(
    (b) => b.status === "pending_payment" || b.status === "pending_confirmation",
  ).length;

  // Active listings — user-scoped: only listings owned by the current user that are published
  const myListings = listing.getMyListings() as Array<{ status: string }>;
  const activeListings = myListings.filter((l) => l.status === "published").length;

  // Dynamic currency from wallet, with locale-aware fallback
  const walletCurrency = wallet.wallet?.currency ?? _resolveLocaleCurrency();

  // Recent activity from platform bus event log (last 10 relevant events)
  const recentActivity: DashboardActivityItem[] = [];
  try {
    const busLog = platformBus.getLog() as Array<{ type: string; payload: unknown; timestamp: number; id?: string }>;
    const mapped = busLog
      .slice() // copy to avoid mutation
      .reverse() // most recent first
      .map((e, i) => mapEventToActivity(e, i))
      .filter((e): e is DashboardActivityItem => e !== null);
    recentActivity.push(...mapped.slice(0, 10));
  } catch {
    // Platform bus not yet initialized or not available
  }

  return {
    unreadMessages,
    activeConversations,
    walletBalance: wallet.wallet?.availableBalance ?? 0,
    walletCurrency,
    pendingBookings,
    activeListings,
    recentActivity,
  };
}

/**
 * Resolve currency from locale or stored country preference.
 * Mirrors the logic in getWalletDefaultCurrency() to avoid circular deps.
 */
function _resolveLocaleCurrency(): string {
  try {
    const { COUNTRY_CURRENCY_MAP } = require("@/lib/geo/country-currency-map");
    const stored = localStorage.getItem("app_country");
    if (stored && COUNTRY_CURRENCY_MAP[stored]) return COUNTRY_CURRENCY_MAP[stored];
    if (typeof navigator !== "undefined") {
      const country = (navigator.language || "").split("-")[1]?.toUpperCase();
      if (country && COUNTRY_CURRENCY_MAP[country]) return COUNTRY_CURRENCY_MAP[country];
    }
  } catch {
    // Non-browser or map not loaded
  }
  return "EUR";
}
