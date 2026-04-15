import { useMemo } from "react";
import { encodeQr, toResolveUrl } from "@/lib/qr-engine";
import type { PayC2CQr } from "@/lib/qr-engine";
import BrandedQR from "@/components/qr/BrandedQR";

interface C2CPaymentQrCardProps {
  listingId: string;
  listingTitle: string;
  listingPhoto?: string;
  sellerId: string;
  sellerName: string;
  amount: number;
  currency: string;
  offerId: string;
}

export default function C2CPaymentQrCard({
  listingId,
  listingTitle,
  listingPhoto,
  sellerId,
  sellerName,
  amount,
  currency,
  offerId,
}: C2CPaymentQrCardProps) {
  const qrPayload = useMemo<PayC2CQr>(() => ({
    action: "pay_c2c",
    v: 1,
    listingId,
    sellerId,
    amount,
    currency,
    offerId,
    exp: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  }), [listingId, sellerId, amount, currency, offerId]);

  const qrData = useMemo(() => toResolveUrl(qrPayload), [qrPayload]);

  return (
    <div className="bg-card border border-border rounded-2xl p-5 space-y-4 max-w-sm mx-auto">
      <div className="text-center space-y-1">
        <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">QR de paiement C2C</p>
        <p className="text-lg font-bold">
          {new Intl.NumberFormat("fr-FR", { style: "currency", currency }).format(amount)}
        </p>
      </div>

      {listingPhoto && (
        <img src={listingPhoto} alt={listingTitle} className="w-full h-32 object-cover rounded-xl" />
      )}

      <p className="text-sm font-medium text-center line-clamp-2">{listingTitle}</p>

      <div className="flex justify-center">
        <BrandedQR value={qrData} size={200} />
      </div>

      <div className="text-center space-y-1">
        <p className="text-xs text-muted-foreground">Vendeur : {sellerName}</p>
        <p className="text-[11px] text-muted-foreground/60">
          Montrez ce QR à l'acheteur pour recevoir le paiement
        </p>
        <p className="text-[10px] text-muted-foreground/40">Expire dans 24h</p>
      </div>
    </div>
  );
}
