import { V1PrimaryAppBridge } from "@/components/v1/V1PrimaryAppBridge";

function MerchantQrBody({ merchantId }: { merchantId: string }) {
  const qrPayload = `${window.location.origin}/merchant/qr-pay/${merchantId}`;

  return (
    <div className="max-w-md mx-auto px-4 py-4 pb-28 space-y-5">
      <h1 className="text-lg font-bold text-foreground">Merchant QR</h1>

      <div className="rounded-[28px] border border-border/20 bg-card p-6 text-center space-y-4">
        <div className="w-40 h-40 mx-auto rounded-2xl bg-muted flex items-center justify-center text-4xl font-bold text-muted-foreground">
          QR
        </div>
        <p className="text-xs text-muted-foreground break-all">{qrPayload}</p>
      </div>
    </div>
  );
}

export default function V1MerchantQrPage() {
  return (
    <V1PrimaryAppBridge module="merchant_qr" requireMerchantContext>
      {(ctx) => <MerchantQrBody merchantId={ctx.merchantId!} />}
    </V1PrimaryAppBridge>
  );
}
