/**
 * Orbit Context Resolver — Central orchestration connecting wallet, QR, menu, and merchant flows.
 * Every QR scan, share link, or payment action resolves through Orbit for unified state.
 */
import { supabase } from "@/integrations/supabase/client";

export type OrbitContextType = "payment" | "menu" | "merchant" | "qr_target" | "order" | "contact" | "share";

export interface OrbitContext {
  contextType: OrbitContextType;
  contextId: string;
  merchantId?: string;
  branchId?: string;
  tableId?: string;
  walletIntentId?: string;
  qrTargetId?: string;
  menuContextId?: string;
  countryCode?: string;
  currencyCode?: string;
  amount?: number;
  metadata?: Record<string, any>;
}

export interface MerchantWalletContext {
  merchantId: string;
  defaultCountry: string;
  defaultCurrency: string;
  allowedCurrencies: string[];
  qrPaymentEnabled: boolean;
  menuQrEnabled: boolean;
  orderThenPayEnabled: boolean;
}

export interface QrResolutionResult {
  type: "menu" | "payment" | "table_menu" | "branch_menu" | "contact" | "invalid" | "expired";
  context: OrbitContext | null;
  merchantName?: string;
  error?: string;
}

// ── Wallet Context ───────────────────────────────────────

export async function resolveWalletContext(userId: string): Promise<{
  walletId: string | null;
  balance: number;
  currency: string;
  country: string;
}> {
  const { data: wallet } = await (supabase as any)
    .from("wallet_accounts")
    .select("id, balance_cash, currency, country_code")
    .eq("user_id", userId)
    .eq("account_type", "fiat")
    .maybeSingle();

  return {
    walletId: wallet?.id ?? null,
    balance: Number(wallet?.balance_cash ?? 0),
    currency: wallet?.currency ?? "EUR",
    country: wallet?.country_code ?? "FR",
  };
}

// ── QR Context Resolution ────────────────────────────────

export async function resolveQrContext(targetCode: string): Promise<QrResolutionResult> {
  if (!targetCode || targetCode.length < 4) {
    return { type: "invalid", context: null, error: "Invalid QR code" };
  }

  // Try merchant QR targets first
  const { data: qrTarget } = await (supabase as any)
    .from("qr_order_targets")
    .select("*, storefront_pages(id, business_name, slug)")
    .eq("target_code", targetCode)
    .eq("active", true)
    .maybeSingle();

  if (qrTarget) {
    if (qrTarget.expires_at && new Date(qrTarget.expires_at) < new Date()) {
      return { type: "expired", context: null, error: "This QR code has expired" };
    }

    const ctx: OrbitContext = {
      contextType: "qr_target",
      contextId: qrTarget.id,
      merchantId: qrTarget.shop_id,
      tableId: qrTarget.table_number ?? undefined,
      qrTargetId: qrTarget.id,
    };

    const targetType = qrTarget.target_type;
    if (targetType === "dine_in" || targetType === "table") {
      return { type: "table_menu", context: ctx, merchantName: qrTarget.storefront_pages?.business_name };
    }
    if (targetType === "global_menu" || targetType === "takeaway") {
      return { type: "menu", context: ctx, merchantName: qrTarget.storefront_pages?.business_name };
    }

    return { type: "menu", context: ctx, merchantName: qrTarget.storefront_pages?.business_name };
  }

  return { type: "invalid", context: null, error: "QR code not recognized" };
}

// ── Merchant/Menu Context ────────────────────────────────

export async function resolveMerchantMenuContext(merchantId: string): Promise<{
  merchant: any;
  categories: any[];
  currency: string;
  country: string;
} | null> {
  const { data: shop } = await (supabase as any)
    .from("storefront_pages")
    .select("id, business_name, slug, country, currency, city")
    .eq("id", merchantId)
    .maybeSingle();

  if (!shop) return null;

  const { data: categories } = await (supabase as any)
    .from("storefront_catalog_categories")
    .select("id, name, sort_order")
    .eq("shop_id", merchantId)
    .eq("active", true)
    .order("sort_order", { ascending: true });

  return {
    merchant: shop,
    categories: categories ?? [],
    currency: shop.currency ?? "EUR",
    country: shop.country ?? "FR",
  };
}

// ── Country/Currency Resolution ──────────────────────────

const COUNTRY_CURRENCY_MAP: Record<string, string> = {
  AE: "AED", FR: "EUR", US: "USD", GB: "GBP", MA: "MAD",
  SN: "XOF", CI: "XOF", DE: "EUR", ES: "EUR", IT: "EUR",
};

export function resolveCountryCurrency(countryCode?: string, merchantCurrency?: string, explicitCurrency?: string): {
  currency: string;
  country: string;
} {
  if (explicitCurrency) return { currency: explicitCurrency, country: countryCode ?? "FR" };
  if (merchantCurrency) return { currency: merchantCurrency, country: countryCode ?? "FR" };
  const country = countryCode ?? "FR";
  return { currency: COUNTRY_CURRENCY_MAP[country] ?? "EUR", country };
}

// ── Payment Intent via Orbit ─────────────────────────────

export async function createOrbitPaymentIntent(params: {
  userId: string;
  amount: number;
  currency: string;
  merchantId?: string;
  recipientUserId?: string;
  qrTargetId?: string;
  contextType?: string;
  contextId?: string;
}): Promise<string> {
  // Defer to wallet payment intent engine
  const { createPaymentIntent } = await import("@/lib/wallet/wallet-payment-intent");
  const result = await createPaymentIntent({
    userId: params.userId,
    amount: params.amount,
    currency: params.currency,
    merchantId: params.merchantId,
    recipientUserId: params.recipientUserId,
    contextType: params.contextType,
    contextId: params.contextId,
    metadata: { qrTargetId: params.qrTargetId },
  });
  return result.intentId;
}

// ── Share Link Builder ───────────────────────────────────

export function createOrbitShareLink(params: {
  type: "payment" | "menu" | "contact" | "shop";
  targetId: string;
  amount?: number;
  currency?: string;
}): string {
  const base = window.location.origin;
  switch (params.type) {
    case "payment":
      return `${base}/#/pay/request/${params.targetId}`;
    case "menu":
      return `${base}/#/qr/${params.targetId}`;
    case "shop":
      return `${base}/#/s/${params.targetId}`;
    case "contact":
      return `${base}/#/orbit/contact/${params.targetId}`;
    default:
      return `${base}/#/`;
  }
}

// ── Native Share ─────────────────────────────────────────

export async function shareOrbitLink(params: {
  url: string;
  title: string;
  text?: string;
}): Promise<{ shared: boolean; method: "native" | "clipboard" | "failed" }> {
  console.log("[orbit] share_start", { url: params.url });

  if (navigator.share) {
    try {
      await navigator.share({ title: params.title, text: params.text, url: params.url });
      console.log("[orbit] share_success", { method: "native" });
      return { shared: true, method: "native" };
    } catch (e) {
      if ((e as Error).name === "AbortError") {
        return { shared: false, method: "failed" };
      }
    }
  }

  try {
    await navigator.clipboard.writeText(params.url);
    console.log("[orbit] share_success", { method: "clipboard" });
    return { shared: true, method: "clipboard" };
  } catch {
    console.warn("[orbit] share_failed");
    return { shared: false, method: "failed" };
  }
}
