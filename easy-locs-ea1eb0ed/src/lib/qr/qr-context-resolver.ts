import type { QrAction, UniversalQrPayload } from "@/lib/qr-engine";

export type QrContext =
  | "wallet_receive"
  | "wallet_transfer"
  | "profile"
  | "shop_pay"
  | "conversation_pay"
  | "default";

interface QrContextInput {
  currentRoute: string;
  userId: string;
  userName?: string;
  shopSlug?: string;
  recipientId?: string;
  amount?: number;
  currency?: string;
}

export interface ResolvedQrContext {
  action: QrAction;
  payload: UniversalQrPayload;
  label: string;
  refreshIntervalMs: number;
}

export function resolveQrContext(input: QrContextInput): ResolvedQrContext {
  const { currentRoute, userId, userName, shopSlug, recipientId, amount, currency } = input;

  if (currentRoute.startsWith("/storefront/") && shopSlug) {
    return {
      action: "pay_shop",
      payload: { action: "pay_shop", v: 1, shopSlug, amount, currency },
      label: "Pay merchant",
      refreshIntervalMs: 60_000,
    };
  }

  if (currentRoute.startsWith("/orbit/") && recipientId) {
    return {
      action: "pay_user",
      payload: { action: "pay_user", v: 1, userId: recipientId, amount, currency },
      label: "Pay contact",
      refreshIntervalMs: 60_000,
    };
  }

  if (currentRoute.startsWith("/wallet/transfer")) {
    return {
      action: "pay_user",
      payload: { action: "pay_user", v: 1, userId, name: userName, amount, currency },
      label: "Send payment",
      refreshIntervalMs: 60_000,
    };
  }

  if (currentRoute.startsWith("/me") || currentRoute.startsWith("/profile")) {
    return {
      action: "add_contact",
      payload: { action: "add_contact", v: 1, userId, name: userName },
      label: "Add contact",
      refreshIntervalMs: 300_000,
    };
  }

  return {
    action: "receive",
    payload: { action: "receive", v: 1, userId, name: userName },
    label: "Receive payment",
    refreshIntervalMs: 60_000,
  };
}

export function getContextFromRoute(route: string): QrContext {
  if (route.startsWith("/wallet/transfer")) return "wallet_transfer";
  if (route.startsWith("/wallet")) return "wallet_receive";
  if (route.startsWith("/storefront/")) return "shop_pay";
  if (route.startsWith("/orbit/")) return "conversation_pay";
  if (route.startsWith("/me") || route.startsWith("/profile")) return "profile";
  return "default";
}
