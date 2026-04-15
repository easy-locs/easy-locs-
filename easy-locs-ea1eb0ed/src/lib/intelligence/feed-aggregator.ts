import { platformBus } from "@/lib/shared/platform-bus";

export interface FeedItem {
  id: string;
  category: "wallet" | "orbit" | "commerce" | "forex" | "prayer" | "system";
  title: string;
  subtitle?: string;
  icon?: string;
  deepLinkUrl?: string;
  timestamp: number;
  priority: number;
}

const MAX_ITEMS = 30;
let _feedItems: FeedItem[] = [];
let _initialized = false;

function addItem(item: FeedItem) {
  _feedItems = [item, ..._feedItems.filter((f) => f.id !== item.id)].slice(0, MAX_ITEMS);
}

function makeId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
}

export function initFeedAggregator(): () => void {
  if (_initialized) return () => {};
  _initialized = true;

  const unsubs: Array<() => void> = [];

  unsubs.push(
    platformBus.on("wallet:transfer_received", (payload: any) => {
      addItem({
        id: makeId("wt"),
        category: "wallet",
        title: `Transfer received: ${payload?.amount ?? ""} ${payload?.currency ?? ""}`.trim(),
        deepLinkUrl: "/wallet",
        timestamp: Date.now(),
        priority: 8,
      });
    }),
  );

  unsubs.push(
    platformBus.on("wallet:payment_completed", (payload: any) => {
      addItem({
        id: makeId("wp"),
        category: "wallet",
        title: `Payment completed: ${payload?.amount ?? ""} ${payload?.currency ?? ""}`.trim(),
        deepLinkUrl: "/wallet",
        timestamp: Date.now(),
        priority: 7,
      });
    }),
  );

  unsubs.push(
    platformBus.on("orbit:message_sent", () => {
      addItem({
        id: makeId("om"),
        category: "orbit",
        title: "Message sent",
        deepLinkUrl: "/orbit",
        timestamp: Date.now(),
        priority: 3,
      });
    }),
  );

  unsubs.push(
    platformBus.on("marketplace:booking_confirmed", (payload: any) => {
      addItem({
        id: makeId("mb"),
        category: "commerce",
        title: `Booking confirmed${payload?.shopName ? ` at ${payload.shopName}` : ""}`,
        deepLinkUrl: "/dashboard/bookings",
        timestamp: Date.now(),
        priority: 9,
      });
    }),
  );

  unsubs.push(
    platformBus.on("marketplace:booking_created", (payload: any) => {
      addItem({
        id: makeId("bc"),
        category: "commerce",
        title: `New booking request${payload?.shopName ? ` for ${payload.shopName}` : ""}`,
        deepLinkUrl: "/dashboard/bookings",
        timestamp: Date.now(),
        priority: 8,
      });
    }),
  );

  unsubs.push(
    platformBus.on("forex.rates.updated", (payload: any) => {
      if (payload?.significantChange) {
        addItem({
          id: makeId("fx"),
          category: "forex",
          title: `Forex: ${payload.pair ?? "rates"} moved ${payload.changePercent ?? ""}%`,
          deepLinkUrl: "/wallet/forex",
          timestamp: Date.now(),
          priority: 5,
        });
      }
    }),
  );

  unsubs.push(
    platformBus.on("prayer.times.updated", (payload: any) => {
      addItem({
        id: makeId("pr"),
        category: "prayer",
        title: `Prayer times updated for today`,
        deepLinkUrl: "/dashboard/islamic",
        timestamp: Date.now(),
        priority: 2,
      });
    }),
  );

  return () => {
    unsubs.forEach((u) => u());
    _initialized = false;
  };
}

export function getFeedItems(): FeedItem[] {
  return _feedItems;
}

export function getLatestFeedItem(): FeedItem | null {
  return _feedItems[0] ?? null;
}

export function getFeedByCategory(category: FeedItem["category"]): FeedItem[] {
  return _feedItems.filter((f) => f.category === category);
}
