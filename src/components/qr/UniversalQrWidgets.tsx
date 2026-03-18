/**
 * UniversalQrWidgets — Reusable QR display + scan entry point widgets.
 * Powered by the unified QR engine (src/lib/qr-engine.ts).
 * All QR codes render with the Easy-Locs branded logo overlay in the center.
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import QRCode from "react-qr-code";
import { QrCode, ScanLine, Copy, Check } from "lucide-react";
import {
  type UniversalQrPayload,
  toResolveUrl,
  qr,
} from "@/lib/qr-engine";
import { Button } from "@/components/ui/button";

/* ── Branded QR Logo Overlay ─────────────────────────────────── */

function BrandedQrLogo({ size = 36 }: { size?: number }) {
  return (
    <div
      className="absolute inset-0 flex items-center justify-center pointer-events-none"
      style={{ zIndex: 2 }}
    >
      <div
        className="rounded-lg bg-white flex items-center justify-center shadow-sm"
        style={{ width: size + 8, height: size + 8, padding: 4 }}
      >
        <div className="flex items-baseline gap-0.5 select-none">
          <span className="font-black tracking-tight text-[10px]" style={{ color: "hsl(220 20% 15%)" }}>
            Easy
          </span>
          <span
            className="font-black tracking-tight text-[10px]"
            style={{
              background: "linear-gradient(135deg, hsl(45 90% 48%), hsl(35 90% 42%))",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            -Locs
          </span>
        </div>
      </div>
    </div>
  );
}

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
  payload: UniversalQrPayload;
  title: string;
  subtitle?: string;
  size?: number;
  compact?: boolean;
}) {
  const link = toResolveUrl(payload);
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

      {/* QR with branded logo overlay */}
      <div className="relative p-3 bg-white rounded-xl">
        <QRCode value={link} size={size} level="H" />
        <BrandedQrLogo size={Math.round(size * 0.22)} />
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
      payload={qr.payUser(userId, { name: displayName })}
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
      payload={qr.payShop(shopSlug, { amount, currency, name: shopName })}
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
      payload={qr.paymentRequest(requestId)}
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
  payload: UniversalQrPayload;
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
