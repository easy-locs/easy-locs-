/**
 * QR Pay — UNIFIED: delegates entirely to qr-engine for payload format.
 * Kept for backward compatibility of imports only.
 * @deprecated — Import directly from @/lib/qr-engine instead.
 */
import React from "react";
import QRCodeReact from "react-qr-code";
import { User, Store, Receipt } from "lucide-react";
import { encodeQr, qr, toResolveUrl, decodeQr, type UniversalQrPayload } from "@/lib/qr-engine";

export type QrPayloadType = "user" | "shop" | "request";

export interface QrPayload {
  type: QrPayloadType;
  id: string;
  amount?: number;
  currency?: string;
  name?: string;
}

/** Encode a QR payload into a URL — now uses qr-engine canonical format */
export function encodeQrUrl(payload: QrPayload): string {
  let canonical: UniversalQrPayload;
  switch (payload.type) {
    case "user":
      canonical = qr.payUser(payload.id, { amount: payload.amount, currency: payload.currency, name: payload.name });
      break;
    case "shop":
      canonical = qr.payShop(payload.id, { amount: payload.amount, currency: payload.currency, name: payload.name });
      break;
    case "request":
      canonical = qr.paymentRequest(payload.id);
      break;
    default:
      canonical = qr.payUser(payload.id, { amount: payload.amount, currency: payload.currency, name: payload.name });
  }
  return toResolveUrl(canonical);
}

/** Decode a QR URL back into a payload — delegates to qr-engine */
export function decodeQrUrl(url: string): QrPayload | null {
  const decoded = decodeQr(url);
  if (!decoded) return null;
  switch (decoded.action) {
    case "pay_user":
      return { type: "user", id: decoded.userId, amount: decoded.amount, currency: decoded.currency, name: decoded.name };
    case "pay_shop":
      return { type: "shop", id: decoded.shopSlug, amount: decoded.amount, currency: decoded.currency, name: decoded.name };
    case "payment_request":
      return { type: "request", id: decoded.requestId };
    default:
      return null;
  }
}

/** QR Code display component — uses canonical format */
export function PaymentQrCode({
  payload,
  size = 200,
  className = "",
}: {
  payload: QrPayload;
  size?: number;
  className?: string;
}) {
  const url = encodeQrUrl(payload);
  const Icon = payload.type === "user" ? User : payload.type === "shop" ? Store : Receipt;

  return (
    <div className={`flex flex-col items-center gap-3 ${className}`}>
      <div className="rounded-2xl border border-border bg-white p-4">
        <QRCodeReact value={url} size={size} level="M" />
      </div>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        <span>{payload.name || payload.id.slice(0, 8)}</span>
      </div>
    </div>
  );
}
