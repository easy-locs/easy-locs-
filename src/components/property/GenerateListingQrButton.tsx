import { useQrPaymentStore } from "@/stores/qrPaymentStore";

export function GenerateListingQrButton(props: {
  amount: number;
  reference: string;
}) {
  const generateListingPaymentQr = useQrPaymentStore(
    (s) => s.generateListingPaymentQr
  );

  return (
    <button
      className="rounded-lg border border-border px-3 py-2 text-xs font-medium text-foreground hover:bg-muted transition-colors"
      onClick={() =>
        generateListingPaymentQr({
          amount: props.amount,
          reference: props.reference,
        })
      }
    >
      Generate QR Payment
    </button>
  );
}
