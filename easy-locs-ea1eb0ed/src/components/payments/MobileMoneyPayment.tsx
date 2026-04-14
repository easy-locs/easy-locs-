import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Smartphone, CheckCircle2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { initiateMobileMoneyPayment } from "@/repositories/payments.repository";

interface MobileMoneyPaymentProps {
  amount: number;
  currency?: string;
  orderId?: string;
  onSuccess: (transactionRef: string) => void;
  onError?: (error: string) => void;
}

type MobileProvider = "mpesa" | "orange_money" | "wave";

const PROVIDERS: { key: MobileProvider; label: string; countries: string; color: string }[] = [
  { key: "mpesa", label: "M-Pesa", countries: "Kenya, Tanzania, DRC", color: "#4CAF50" },
  { key: "orange_money", label: "Orange Money", countries: "Senegal, Cameroun, Côte d'Ivoire, Mali", color: "#FF6600" },
  { key: "wave", label: "Wave", countries: "Senegal, Côte d'Ivoire, Mali, Burkina Faso", color: "#1B3A5C" },
];

export default function MobileMoneyPayment({
  amount,
  currency = "XOF",
  orderId,
  onSuccess,
  onError,
}: MobileMoneyPaymentProps) {
  const [provider, setProvider] = useState<MobileProvider>("mpesa");
  const [phone, setPhone] = useState("");
  const [stage, setStage] = useState<"input" | "processing" | "pending" | "success" | "error">("input");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [txRef, setTxRef] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!phone || phone.length < 8) {
      toast.error("Please enter a valid phone number");
      return;
    }

    setStage("processing");
    setErrorMsg(null);

    try {
      const result = await initiateMobileMoneyPayment({
        provider,
        phone_number: phone.startsWith("+") ? phone : `+${phone}`,
        amount,
        currency: currency.toUpperCase(),
        order_id: orderId,
      });

      if (!result?.transaction_ref) {
        throw new Error("No transaction reference returned");
      }

      setTxRef(result.transaction_ref);
      setStage("pending");
      toast.info("Check your phone to confirm payment");

      pollPaymentStatus(result.transaction_ref);
    } catch (err: any) {
      const msg = err.message || "Mobile Money payment failed";
      setErrorMsg(msg);
      setStage("error");
      onError?.(msg);
    }
  };

  const pollPaymentStatus = async (ref: string) => {
    const maxAttempts = 30;
    const interval = 5000;

    for (let i = 0; i < maxAttempts; i++) {
      await new Promise((r) => setTimeout(r, interval));

      try {
        const { checkMobileMoneyStatus } = await import("@/repositories/payments.repository");
        const status = await checkMobileMoneyStatus(ref);

        if (status?.status === "completed") {
          setStage("success");
          toast.success("Mobile Money payment confirmed");
          onSuccess(ref);
          return;
        }
        if (status?.status === "failed") {
          throw new Error(status.message || "Payment was declined");
        }
      } catch (err: any) {
        if (i === maxAttempts - 1) {
          setErrorMsg("Payment verification timed out. Please check your phone.");
          setStage("error");
        }
      }
    }
  };

  if (stage === "success") {
    return (
      <div className="flex flex-col items-center gap-2 py-4">
        <CheckCircle2 className="h-8 w-8 text-green-400" />
        <p className="text-sm font-bold text-green-400">Payment confirmed</p>
        <p className="text-xs text-muted-foreground">Ref: {txRef}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        {PROVIDERS.map((p) => (
          <button
            key={p.key}
            onClick={() => setProvider(p.key)}
            disabled={stage === "processing" || stage === "pending"}
            className="p-2.5 rounded-xl border text-center transition-all"
            style={{
              borderColor: provider === p.key ? p.color : "hsl(var(--border))",
              background: provider === p.key ? `${p.color}10` : "transparent",
            }}
          >
            <p className="text-xs font-bold" style={{ color: provider === p.key ? p.color : undefined }}>
              {p.label}
            </p>
            <p className="text-[9px] text-muted-foreground mt-0.5">{p.countries}</p>
          </button>
        ))}
      </div>

      <div className="space-y-2">
        <label className="text-xs font-medium text-muted-foreground">Phone Number</label>
        <Input
          type="tel"
          placeholder="+254 7XX XXX XXX"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          disabled={stage === "processing" || stage === "pending"}
          className="rounded-xl"
        />
      </div>

      {errorMsg && (
        <div className="flex items-center gap-2 text-xs text-destructive bg-destructive/5 rounded-lg px-3 py-2">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          <span className="flex-1">{errorMsg}</span>
        </div>
      )}

      {stage === "pending" && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-500/5 border border-amber-500/20">
          <Loader2 className="h-4 w-4 animate-spin text-amber-500" />
          <div>
            <p className="text-xs font-bold text-amber-500">Waiting for confirmation</p>
            <p className="text-[10px] text-muted-foreground">Please approve the payment on your phone</p>
          </div>
        </div>
      )}

      <Button
        onClick={stage === "error" ? handleSubmit : handleSubmit}
        disabled={stage === "processing" || stage === "pending" || !phone}
        className="w-full rounded-xl h-12"
      >
        {stage === "processing" ? (
          <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Initiating...</>
        ) : stage === "pending" ? (
          <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Waiting for confirmation...</>
        ) : stage === "error" ? (
          <><Smartphone className="h-4 w-4 mr-2" /> Retry Payment</>
        ) : (
          <><Smartphone className="h-4 w-4 mr-2" /> Pay with {PROVIDERS.find(p => p.key === provider)?.label}</>
        )}
      </Button>
    </div>
  );
}
