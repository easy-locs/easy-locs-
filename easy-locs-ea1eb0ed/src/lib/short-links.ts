import { db } from "@/services/db";
import { APP_BASE_URL } from "@/lib/app-domain";
import type { UniversalQrPayload, QrAction } from "@/lib/qr-engine";

function generateCode(length = 8): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  let code = "";
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  for (let i = 0; i < length; i++) {
    code += chars[array[i] % chars.length];
  }
  return code;
}

export interface ShortLinkPayload {
  action: QrAction;
  userId?: string;
  shopSlug?: string;
  productId?: string;
  orderId?: string;
  serviceId?: string;
  slug?: string;
  requestId?: string;
  amount?: number;
  currency?: string;
  name?: string;
  [key: string]: unknown;
}

export async function createShortLink(params: {
  action: QrAction;
  payload: ShortLinkPayload;
  createdBy?: string;
  expiresInHours?: number;
}): Promise<{ code: string; shortUrl: string }> {
  const code = generateCode();
  const expiresAt = params.expiresInHours
    ? new Date(Date.now() + params.expiresInHours * 60 * 60 * 1000).toISOString()
    : null;

  const { error } = await db("short_links").insert({
    code,
    action: params.action,
    payload: params.payload,
    created_by: params.createdBy || null,
    expires_at: expiresAt,
  });

  if (error) {
    if (error.code === "23505") {
      return createShortLink(params);
    }
    throw error;
  }

  return {
    code,
    shortUrl: `${APP_BASE_URL}/sl/${code}`,
  };
}

export async function resolveShortLink(code: string): Promise<{
  action: QrAction;
  payload: ShortLinkPayload;
} | null> {
  const { data, error } = await db.rpc("resolve_short_link", { p_code: code });

  if (error || !data || data.error) return null;

  return {
    action: data.action as QrAction,
    payload: data.payload as ShortLinkPayload,
  };
}

export function shortLinkPayloadToQrPayload(
  action: QrAction,
  payload: ShortLinkPayload,
): UniversalQrPayload | null {
  switch (action) {
    case "pay_user":
      return {
        action: "pay_user",
        v: 1,
        userId: payload.userId!,
        amount: payload.amount,
        currency: payload.currency,
        name: payload.name,
      };
    case "pay_shop":
      return {
        action: "pay_shop",
        v: 1,
        shopSlug: payload.shopSlug!,
        amount: payload.amount,
        currency: payload.currency,
        name: payload.name,
      };
    case "payment_request":
      return {
        action: "payment_request",
        v: 1,
        requestId: payload.requestId!,
      };
    case "profile":
      return {
        action: "profile",
        v: 1,
        userId: payload.userId!,
        name: payload.name,
      };
    case "add_contact":
      return {
        action: "add_contact",
        v: 1,
        userId: payload.userId!,
        name: payload.name,
      };
    case "shop":
      return {
        action: "shop",
        v: 1,
        shopSlug: payload.shopSlug!,
      };
    case "product":
      return {
        action: "product",
        v: 1,
        productId: payload.productId!,
        shopSlug: payload.shopSlug,
      };
    case "order":
      return {
        action: "order",
        v: 1,
        orderId: payload.orderId!,
      };
    case "service":
      return {
        action: "service",
        v: 1,
        serviceId: payload.serviceId!,
        slug: payload.slug,
      };
    default:
      return null;
  }
}

export function buildShortUrl(code: string): string {
  return `${APP_BASE_URL}/sl/${code}`;
}
