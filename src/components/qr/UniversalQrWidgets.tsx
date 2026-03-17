/**
 * UniversalQrWidgets — Reusable QR display + scan entry point widgets.
 * Used across profile, wallet, shop, and chat for universal QR payment.
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import QRCode from "react-qr-code";
import { QrCode, ScanLine, Copy, Check } from "lucide-react";
import { encodeQrPayload, type QrPayload } from "@/payments/payment-request-hooks";
import { Button } from "@/components/ui/button";

/* ── Scan QR Button ──────────────────────────────────────────── */

export function ScanQrButton({
  className,
  size = "sm",
  variant = "outline",
  label = "Scan QR",
}: {
  className?: string;
  size?: "sm" | "default" | "lg" | "icon";
  variant?: "default" | "outline" | "ghost" | "secondary";
  label?: string;
}) {
  const navigate = useNavigate();

  return (
    <Button
      size={size}
      variant={variant}
      className={className}
      onClick={() => navigate("/pay/scan")}
    >
      <ScanLine className="h-4 w-4 mr-1.5" />
      {label}
    </Button>
  );
}

/* ── My QR Code Card ─────────────────────────────────────────── */

export function MyQrCodeCard({
  payload,
  title,
  subtitle,
  size = 160,
  compact = false,
}: {
  payload: QrPayload;
  title: string;
  subtitle?: string;
  size?: number;
  compact?: boolean;
}) {
  const raw = encodeQrPayload(payload);
  const link = `${window.location.origin}/qr/resolve?data=${encodeURIComponent(raw)}`;
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`flex flex-col items-center gap-3 ${compact ? "p-3" : "p-5"} rounded-2xl border border-border bg-card`}>
      <div className="text-center">
        <p className={`${compact ? "text-xs" : "text-sm"} font-semibold text-foreground`}>{title}</p>
        {subtitle && (
          <p className="text-[10px] text-muted-foreground mt-0.5">{subtitle}</p>
        )}
      </div>

      <div className="p-3 bg-white rounded-xl">
        <QRCode value={link} size={size} level="M" />
      </div>

      <button
        type="button"
        onClick={handleCopy}
        className="flex items-center gap-1.5 rounded-xl bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary transition hover:bg-primary/20"
      >
        {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
        {copied ? "Copied" : "Copy link"}
      </button>
    </div>
  );
}

/* ── User Profile QR ─────────────────────────────────────────── */

export function UserProfileQr({
  userId,
  displayName,
  compact = false,
}: {
  userId: string;
  displayName?: string;
  compact?: boolean;
}) {
  return (
    <MyQrCodeCard
      payload={{ type: "user_pay", userId }}
      title={displayName ? `Pay ${displayName}` : "My payment QR"}
      subtitle="Scan to send payment"
      size={compact ? 120 : 160}
      compact={compact}
    />
  );
}

/* ── Shop QR ─────────────────────────────────────────────────── */

export function ShopQr({
  shopSlug,
  shopName,
  amount,
  currency,
  compact = false,
}: {
  shopSlug: string;
  shopName?: string;
  amount?: number;
  currency?: string;
  compact?: boolean;
}) {
  return (
    <MyQrCodeCard
      payload={{
        type: "shop_pay",
        shopSlug,
        ...(amount ? { amount } : {}),
        ...(currency ? { currency } : {}),
      }}
      title={shopName ? `Pay ${shopName}` : "Shop QR"}
      subtitle="Scan to pay this shop"
      size={compact ? 120 : 160}
      compact={compact}
    />
  );
}

/* ── Payment Request QR ──────────────────────────────────────── */

export function PaymentRequestQr({
  requestId,
  title,
  compact = false,
}: {
  requestId: string;
  title?: string;
  compact?: boolean;
}) {
  return (
    <MyQrCodeCard
      payload={{ type: "payment_request", requestId }}
      title={title || "Payment request"}
      subtitle="Scan to fulfill this request"
      size={compact ? 120 : 160}
      compact={compact}
    />
  );
}

/* ── QR Action Row (Scan + Show) ─────────────────────────────── */

export function QrActionRow({
  payload,
  qrTitle,
  className,
}: {
  payload: QrPayload;
  qrTitle: string;
  className?: string;
}) {
  const [showQr, setShowQr] = useState(false);
  const navigate = useNavigate();

  return (
    <div className={className}>
      <div className="flex gap-2">
        <Button
          size="sm"
          variant="outline"
          className="flex-1 gap-1.5"
          onClick={() => navigate("/pay/scan")}
        >
          <ScanLine className="h-4 w-4" /> Scan
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="flex-1 gap-1.5"
          onClick={() => setShowQr(!showQr)}
        >
          <QrCode className="h-4 w-4" /> {showQr ? "Hide QR" : "My QR"}
        </Button>
      </div>

      {showQr && (
        <div className="mt-3">
          <MyQrCodeCard payload={payload} title={qrTitle} compact />
        </div>
      )}
    </div>
  );
}
