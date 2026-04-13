/**
 * Dashboard Read Model — Pure projections from raw data to render-ready models.
 * No side effects, no store writes, no DB access.
 * ALL dashboard aggregation logic lives here — not in pages or components.
 */
import { getSmartCategories, getSmartHero, getTimeGreeting, type SmartCategory, type SmartHero } from "@/lib/smart-home-engine";
import { getTopBanners } from "@/lib/context-banner/context-banner-engine";
import type { ContextBanner } from "@/lib/context-banner/context-banner-engine";

// ══════════════════════════════════════════════
// HOME DASHBOARD
// ══════════════════════════════════════════════

export interface HeroBannerModel {
  hero: SmartHero;
  greeting: string;
  locationLabel: string;
}

export function projectHeroBanner(city: string | null, timezone?: string): HeroBannerModel {
  return {
    hero: getSmartHero(timezone),
    greeting: getTimeGreeting(timezone),
    locationLabel: city || "your area",
  };
}

export interface CategoriesModel {
  categories: SmartCategory[];
}

export function projectCategories(timezone?: string, countryCode?: string): CategoriesModel {
  return { categories: getSmartCategories(timezone, countryCode) };
}

export interface ContextBannersModel {
  banners: ContextBanner[];
}

export function projectContextBanners(
  countryCode?: string | null,
  city?: string | null,
  localHour?: number,
  maxBanners = 3,
): ContextBannersModel {
  return { banners: getTopBanners({ country: countryCode, city, hour: localHour }, maxBanners) };
}

// ══════════════════════════════════════════════
// ADMIN OPS DASHBOARD
// ══════════════════════════════════════════════

const ACTIVE_ORDER_STATUSES = ["paid", "confirmed", "preparing", "driver_search", "driver_assigned", "on_the_way"] as const;
const FAILED_ORDER_STATUSES = ["cancelled", "disputed"] as const;

/** Minimal shape of an order row used by the ops dashboard projection. */
export interface OpsOrderRow {
  status: string;
  payment_status?: string | null;
  total_amount?: number | string | null;
}

/** Minimal shape of a merchant row used by ops dashboard projection. */
export interface OpsMerchantRow {
  is_active?: boolean | null;
  is_open?: boolean | null;
  promo_active?: boolean | null;
}

/** Minimal shape of a support ticket row. */
export interface OpsTicketRow {
  status: string;
}

/** Minimal shape of a driver row used by super dashboard. */
export interface OpsDriverRow {
  is_online?: boolean | null;
  is_available?: boolean | null;
}

/** Minimal shape of a ledger entry row. */
export interface OpsLedgerRow {
  direction: "in" | "out" | string;
  amount?: number | string | null;
}

/** Minimal shape of a driver profile row. */
export interface DriverProfileRow {
  is_online?: boolean | null;
  is_available?: boolean | null;
  current_status?: string | null;
}

export interface OpsMetricModel {
  title: string;
  value: string;
}

export interface OpsDashboardModel {
  metrics: OpsMetricModel[];
}

export function projectOpsDashboard(
  orders: OpsOrderRow[],
  merchants: OpsMerchantRow[],
  tickets: OpsTicketRow[],
  currency = "EUR",
): OpsDashboardModel {
  const activeMerchants = merchants.filter((m) => m.is_active).length;
  const openTickets = tickets.filter((t) => t.status === "open").length;
  const activeOrders = orders.filter((o) =>
    (ACTIVE_ORDER_STATUSES as readonly string[]).includes(o.status),
  ).length;
  const failedOrders = orders.filter((o) =>
    (FAILED_ORDER_STATUSES as readonly string[]).includes(o.status),
  ).length;
  const gross = orders.reduce((sum: number, o) => sum + Number(o.total_amount ?? 0), 0);

  return {
    metrics: [
      { title: "Active Merchants", value: String(activeMerchants) },
      { title: "Active Orders", value: String(activeOrders) },
      { title: "Failed Orders", value: String(failedOrders) },
      { title: "Open Tickets", value: String(openTickets) },
      { title: "Gross Volume", value: `${gross.toFixed(0)} ${currency}` },
      { title: "Total Orders", value: String(orders.length) },
    ],
  };
}

// ══════════════════════════════════════════════
// ADMIN SUPER DASHBOARD
// ══════════════════════════════════════════════

const SUPER_ACTIVE_STATUSES = ["paid", "confirmed", "preparing", "driver_search", "driver_assigned", "picked_up", "on_the_way"] as const;

export interface SuperDashboardModel {
  metrics: OpsMetricModel[];
}

export function projectSuperDashboard(
  orders: OpsOrderRow[],
  merchants: OpsMerchantRow[],
  drivers: OpsDriverRow[],
  tickets: OpsTicketRow[],
  ledger: OpsLedgerRow[],
  currency = "EUR",
): SuperDashboardModel {
  const gross = orders.reduce((sum: number, o) => sum + Number(o.total_amount ?? 0), 0);
  const activeOrders = orders.filter((o) =>
    (SUPER_ACTIVE_STATUSES as readonly string[]).includes(o.status),
  ).length;
  const paidOrders = orders.filter((o) =>
    ["captured", "paid"].includes(String(o.payment_status ?? "")),
  ).length;
  const onlineDrivers = drivers.filter((d) => d.is_online).length;
  const availableDrivers = drivers.filter((d) => d.is_online && d.is_available).length;
  const openTickets = tickets.filter((t) => t.status === "open").length;
  const activeMerchants = merchants.filter((m) => m.is_active).length;
  const openMerchants = merchants.filter((m) => m.is_open).length;
  const activePromos = merchants.filter((m) => m.promo_active).length;
  const totalIn = ledger
    .filter((l) => l.direction === "in")
    .reduce((sum: number, l) => sum + Number(l.amount ?? 0), 0);
  const totalOut = ledger
    .filter((l) => l.direction === "out")
    .reduce((sum: number, l) => sum + Number(l.amount ?? 0), 0);

  return {
    metrics: [
      { title: "Gross GMV", value: `${gross.toFixed(0)} ${currency}` },
      { title: "Active Orders", value: String(activeOrders) },
      { title: "Paid Orders", value: String(paidOrders) },
      { title: "Active Merchants", value: String(activeMerchants) },
      { title: "Open Merchants", value: String(openMerchants) },
      { title: "Active Promos", value: String(activePromos) },
      { title: "Online Drivers", value: String(onlineDrivers) },
      { title: "Available Drivers", value: String(availableDrivers) },
      { title: "Open Tickets", value: String(openTickets) },
      { title: "Ledger In", value: `${totalIn.toFixed(0)} ${currency}` },
      { title: "Ledger Out", value: `${totalOut.toFixed(0)} ${currency}` },
      { title: "Total Orders", value: String(orders.length) },
    ],
  };
}

// ══════════════════════════════════════════════
// DRIVER DASHBOARD
// ══════════════════════════════════════════════

export interface DriverDashboardModel {
  isOnline: boolean;
  isAvailable: boolean;
  currentStatus: string;
}

export function projectDriverDashboard(profile: DriverProfileRow | null | undefined): DriverDashboardModel {
  return {
    isOnline: !!profile?.is_online,
    isAvailable: !!profile?.is_available,
    currentStatus: profile?.current_status || "unknown",
  };
}

// ══════════════════════════════════════════════
// ONBOARDING CHECKLIST
// ══════════════════════════════════════════════

export interface ChecklistItemModel {
  id: string;
  label: string;
  description: string;
  iconKey: string;
  route: string;
  done: boolean;
}

export interface ChecklistModel {
  items: ChecklistItemModel[];
  doneCount: number;
  totalCount: number;
  progress: number;
  allDone: boolean;
}

export function projectChecklist(counts: {
  properties: number;
  tenants: number;
  documents: number;
  ownerProfile: boolean;
  payments: number;
  messages: number;
}): ChecklistModel {
  const items: ChecklistItemModel[] = [
    { id: "property", label: "Ajouter un bien", description: "Créez votre premier bien immobilier", iconKey: "Building", route: "/dashboard/property-management", done: counts.properties > 0 },
    { id: "tenant", label: "Ajouter un locataire", description: "Enregistrez votre premier locataire", iconKey: "Users", route: "/dashboard/rental-management?tab=tenants", done: counts.tenants > 0 },
    { id: "document", label: "Générer un document", description: "Bail, quittance, état des lieux…", iconKey: "FileText", route: "/dashboard/documents", done: counts.documents > 0 },
    { id: "payment", label: "Configurer les loyers", description: "Appels de loyer automatiques", iconKey: "CreditCard", route: "/dashboard/rental-management?tab=payments", done: counts.payments > 0 },
    { id: "communication", label: "Envoyer un message", description: "Utilisez le centre de communication", iconKey: "MessageSquare", route: "/orbit", done: counts.messages > 0 },
  ];
  const doneCount = items.filter((i) => i.done).length;
  return {
    items,
    doneCount,
    totalCount: items.length,
    progress: Math.round((doneCount / items.length) * 100),
    allDone: doneCount === items.length,
  };
}

// ══════════════════════════════════════════════
// CURRENCY WALLET WIDGET
// ══════════════════════════════════════════════

export interface CurrencyWalletModel {
  currency: string;
  amount: number;
  orderCount: number;
}

export interface WalletSummaryModel {
  wallets: CurrencyWalletModel[];
  totalConverted: number;
}

/** Minimal order row shape used by the currency wallet widget. */
export interface CurrencyOrderRow {
  currency: string;
  total_price: number | string;
  payment_status: string;
  status: string;
}

export function projectCurrencyWallets(
  orders: CurrencyOrderRow[],
  preferredCurrency: string,
  computeRate: (from: string, to: string) => number,
): WalletSummaryModel {
  const paidOrders = orders.filter(
    (o) => o.payment_status === "paid" && o.status !== "cancelled",
  );

  const map = new Map<string, CurrencyWalletModel>();
  for (const o of paidOrders) {
    const cur = (o.currency || "EUR").toUpperCase();
    const existing = map.get(cur) || { currency: cur, amount: 0, orderCount: 0 };
    existing.amount += Number(o.total_price || 0);
    existing.orderCount += 1;
    map.set(cur, existing);
  }

  const wallets = Array.from(map.values()).sort((a, b) => b.amount - a.amount);
  const totalConverted = wallets.reduce((sum, w) => {
    return sum + w.amount * computeRate(w.currency, preferredCurrency);
  }, 0);

  return { wallets, totalConverted };
}
