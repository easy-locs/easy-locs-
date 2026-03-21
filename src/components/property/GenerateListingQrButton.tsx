import { useQrPaymentStore } from "@/stores/qrPaymentStore";
import { useAuth } from "@/contexts/AuthContext";

export function GenerateListingQrButton(props: {
  amount: number;
  reference: string;
}) {
  const { user } = useAuth();
  const generateReceiveQr = useQrPaymentStore((s) => s.generateReceiveQr);

  return (
    <button
      className="rounded-lg border border-border px-3 py-2 text-xs font-medium text-foreground hover:bg-muted transition-colors"
      onClick={() => {
        if (!user?.id) return;
        generateReceiveQr({
          userId: user.id,
          amount: props.amount,
          currency: "AED",
          name: props.reference,
        });
      }}
    >
      Generate QR Payment
    </button>
  );
}
