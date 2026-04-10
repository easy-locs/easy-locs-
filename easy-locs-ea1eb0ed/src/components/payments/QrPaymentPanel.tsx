import { useQrPaymentStore } from "@/stores/qrPaymentStore";

export function QrPaymentPanel() {
  const qrString = useQrPaymentStore((s) => s.qrString);
  const lastReference = useQrPaymentStore((s) => s.lastReference);
  const clear = useQrPaymentStore((s) => s.clear);

  return (
    <div className="space-y-3 p-4">
      <h3 className="text-sm font-semibold text-foreground">QR Payment</h3>

      {qrString ? (
        <>
          <pre className="whitespace-pre-wrap break-all text-xs text-muted-foreground bg-muted rounded-lg p-3">
            {qrString}
          </pre>
          <p className="text-xs text-muted-foreground">Reference: {lastReference}</p>
          <button
            className="rounded-lg bg-secondary px-3 py-1.5 text-xs font-medium text-secondary-foreground hover:bg-secondary/80 transition-colors"
            onClick={clear}
          >
            Clear
          </button>
        </>
      ) : (
        <p className="text-xs text-muted-foreground">No QR generated</p>
      )}
    </div>
  );
}
