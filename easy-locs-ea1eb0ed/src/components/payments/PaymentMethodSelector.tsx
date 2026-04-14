import { useState, lazy, Suspense } from "react";
import CardPayment from "@/components/payments/CardPayment";
import { Loader2 } from "lucide-react";

const AppleGooglePayButton = lazy(() => import("@/components/payments/AppleGooglePayButton"));
const MobileMoneyPayment = lazy(() => import("@/components/payments/MobileMoneyPayment"));
const CryptoPayment = lazy(() => import("@/components/payments/CryptoPayment"));

interface PaymentMethodSelectorProps {
  amount?: number;
  currency?: string;
  orderId?: string;
  onWalletSelect: (walletId: string) => void;
  onCashSelect: () => void;
  onCardSelect: (paymentRef?: string) => void;
  onMobileMoneySelect?: (txRef: string) => void;
  onCryptoSelect?: (chargeId: string) => void;
}

type Method = "wallet" | "cash" | "card" | "mobile_money" | "crypto" | null;

export default function PaymentMethodSelector({
  amount,
  currency = "AED",
  orderId,
  onWalletSelect,
  onCashSelect,
  onCardSelect,
  onMobileMoneySelect,
  onCryptoSelect,
}: PaymentMethodSelectorProps) {
  const [method, setMethod] = useState<Method>(null);

  const methods: { key: Method; label: string }[] = [
    { key: "wallet", label: "Wallet" },
    { key: "card", label: "Card" },
    { key: "mobile_money", label: "Mobile Money" },
    { key: "crypto", label: "Crypto" },
    { key: "cash", label: "Cash" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {methods.map((m) => (
          <button
            key={m.key}
            onClick={() => setMethod(m.key)}
            className={`flex-1 min-w-[80px] border rounded-xl p-3 text-sm font-medium transition-all duration-200 active:scale-[0.97] ${
              method === m.key
                ? "border-accent/25 bg-accent/6 text-accent shadow-[0_0_0_1px_hsl(var(--accent)/0.1),0_4px_12px_hsl(var(--accent)/0.08)]"
                : "border-border/10 text-foreground hover:border-border/20 bg-card"
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      {method === "card" && amount && (
        <div className="space-y-3">
          <Suspense fallback={null}>
            <AppleGooglePayButton
              amount={amount}
              currency={currency}
              orderId={orderId}
              onSuccess={(ref) => onCardSelect(ref)}
            />
          </Suspense>
          <CardPayment
            amount={amount}
            currency={currency}
            orderId={orderId}
            onSuccess={onCardSelect}
          />
        </div>
      )}

      {method === "wallet" && (
        <button
          onClick={() => onWalletSelect("default")}
          className="w-full rounded-2xl p-3.5 text-sm font-bold active:scale-[0.97] transition-transform"
          style={{ background: "linear-gradient(135deg, hsl(168 72% 44%), hsl(168 72% 38%))", color: "hsl(228 28% 7%)", boxShadow: "0 4px 16px hsl(168 72% 44% / 0.2)" }}
        >
          Pay with Easy-Locs Wallet
        </button>
      )}
      {method === "card" && !amount && (
        <button
          onClick={() => onCardSelect()}
          className="w-full rounded-2xl p-3.5 text-sm font-bold active:scale-[0.97] transition-transform"
          style={{ background: "linear-gradient(135deg, hsl(168 72% 44%), hsl(168 72% 38%))", color: "hsl(228 28% 7%)", boxShadow: "0 4px 16px hsl(168 72% 44% / 0.2)" }}
        >
          Continue with card
        </button>
      )}
      {method === "mobile_money" && amount && (
        <Suspense fallback={<div className="flex justify-center py-4"><Loader2 className="h-4 w-4 animate-spin" /></div>}>
          <MobileMoneyPayment
            amount={amount}
            currency={currency}
            orderId={orderId}
            onSuccess={(ref) => (onMobileMoneySelect || onCardSelect)(ref)}
          />
        </Suspense>
      )}
      {method === "crypto" && amount && (
        <Suspense fallback={<div className="flex justify-center py-4"><Loader2 className="h-4 w-4 animate-spin" /></div>}>
          <CryptoPayment
            amount={amount}
            currency={currency}
            orderId={orderId}
            onSuccess={(ref) => (onCryptoSelect || onCardSelect)(ref)}
          />
        </Suspense>
      )}
      {method === "cash" && (
        <button
          onClick={onCashSelect}
          className="w-full bg-secondary text-secondary-foreground rounded-xl p-3 text-sm font-medium"
        >
          Pay cash on delivery
        </button>
      )}
    </div>
  );
}
