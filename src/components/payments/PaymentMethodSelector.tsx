import { useState } from "react";
import CardPayment from "@/components/payments/CardPayment";

interface PaymentMethodSelectorProps {
  amount?: number;
  currency?: string;
  orderId?: string;
  onWalletSelect: (walletId: string) => void;
  onCashSelect: () => void;
  onCardSelect: () => void;
}

export default function PaymentMethodSelector({
  amount,
  currency = "AED",
  orderId,
  onWalletSelect,
  onCashSelect,
  onCardSelect,
}: PaymentMethodSelectorProps) {
  const [method, setMethod] = useState<"wallet" | "cash" | "card" | null>(null);

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <button
          onClick={() => setMethod("wallet")}
          className={`flex-1 border rounded-xl p-3 text-sm font-medium transition-colors ${
            method === "wallet" ? "border-primary bg-primary/5 text-primary" : "border-border text-foreground hover:border-primary/50"
          }`}
        >
          Wallet
        </button>
        <button
          onClick={() => setMethod("card")}
          className={`flex-1 border rounded-xl p-3 text-sm font-medium transition-colors ${
            method === "card" ? "border-primary bg-primary/5 text-primary" : "border-border text-foreground hover:border-primary/50"
          }`}
        >
          Card
        </button>
        <button
          onClick={() => setMethod("cash")}
          className={`flex-1 border rounded-xl p-3 text-sm font-medium transition-colors ${
            method === "cash" ? "border-primary bg-primary/5 text-primary" : "border-border text-foreground hover:border-primary/50"
          }`}
        >
          Cash
        </button>
      </div>

      {method === "wallet" && (
        <p className="text-sm text-muted-foreground">Wallet selector coming soon</p>
      )}
      {method === "card" && amount ? (
        <CardPayment
          amount={amount}
          currency={currency}
          orderId={orderId}
          onSuccess={onCardSelect}
        />
      ) : method === "card" ? (
        <button
          onClick={onCardSelect}
          className="w-full bg-primary text-primary-foreground rounded-xl p-3 text-sm font-medium"
        >
          Continue with card
        </button>
      ) : null}
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
