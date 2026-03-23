/**
 * PaymentQrCard — QR code display with Easy-Locs logo at center.
 * Uses qr-engine canonical format (UniversalQrPayload).
 */
import { QRCodeSVG } from "qrcode.react";
import { AppCard } from "@/components/ui/AppCard";
import { encodeQr, qr } from "@/lib/qr-engine";

interface PaymentQrCardProps {
  recipientUserId?: string | null;
  recipientOrbitId?: string | null;
  recipientEmail?: string | null;
  amount?: number | null;
  currency?: string | null;
  note?: string | null;
}

export function PaymentQrCard(props: PaymentQrCardProps) {
  const userId = props.recipientUserId || props.recipientOrbitId || props.recipientEmail || "";
  const value = encodeQr(
    qr.payUser(userId, {
      amount: props.amount ?? undefined,
      currency: props.currency ?? "AED",
      name: props.note ?? undefined,
    })
  );

  return (
    <AppCard variant="elevated" padding="lg" className="flex flex-col items-center gap-4">
      <div className="rounded-2xl bg-white p-4">
        <QRCodeSVG
          value={value}
          size={200}
          level="M"
          bgColor="#ffffff"
          fgColor="#000000"
          imageSettings={{
            src: "/logo-icon.png",
            x: undefined,
            y: undefined,
            height: 36,
            width: 36,
            excavate: true,
          }}
        />
      </div>
      <div className="text-center space-y-0.5">
        <p className="text-sm font-bold text-foreground">
          {props.amount ? `${props.amount} ${props.currency ?? "AED"}` : "Custom amount"}
        </p>
        <p className="text-xs text-muted-foreground">
          {props.note || "Scan to pay"}
        </p>
      </div>
    </AppCard>
  );
}
