import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, ExternalLink, CheckCircle2, AlertTriangle, Copy } from "lucide-react";
import { toast } from "sonner";
import { createCryptoCharge, checkCryptoChargeStatus } from "@/repositories/payments.repository";

interface CryptoPaymentProps {
  amount: number;
  currency?: string;
  orderId?: string;
  description?: string;
  onSuccess: (chargeId: string) => void;
  onError?: (error: string) => void;
}

export default function CryptoPayment({
  amount,
  currency = "USD",
  orderId,
  description,
  onSuccess,
  onError,
}: CryptoPaymentProps) {
  const [stage, setStage] = useState<"idle" | "creating" | "pending" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [chargeData, setChargeData] = useState<{
    id: string;
    hosted_url: string;
    expires_at: string;
    addresses?: Record<string, string>;
  } | null>(null);

  const handleCreateCharge = async () => {
    setStage("creating");
    setErrorMsg(null);

    try {
      const result = await createCryptoCharge({
        amount,
        currency: currency.toUpperCase(),
        order_id: orderId,
        description: description || "Easy-Locs Payment",
      });

      if (!result?.charge_id || !result?.hosted_url) {
        throw new Error("Failed to create crypto charge");
      }

      setChargeData({
        id: result.charge_id,
        hosted_url: result.hosted_url,
        expires_at: result.expires_at,
        addresses: result.addresses,
      });

      setStage("pending");

      window.open(result.hosted_url, "_blank", "noopener,noreferrer");

      pollChargeStatus(result.charge_id);
    } catch (err: any) {
      const msg = err.message || "Crypto payment initiation failed";
      setErrorMsg(msg);
      setStage("error");
      onError?.(msg);
    }
  };

  const pollChargeStatus = async (chargeId: string) => {
    const maxAttempts = 60;
    const interval = 10000;

    for (let i = 0; i < maxAttempts; i++) {
      await new Promise((r) => setTimeout(r, interval));

      try {
        const status = await checkCryptoChargeStatus(chargeId);

        if (status?.status === "completed" || status?.status === "confirmed") {
          setStage("success");
          toast.success("Crypto payment confirmed");
          onSuccess(chargeId);
          return;
        }
        if (status?.status === "expired" || status?.status === "canceled") {
          throw new Error("Payment expired or was cancelled");
        }
      } catch (err: any) {
        if (err.message?.includes("expired") || err.message?.includes("cancelled")) {
          setErrorMsg(err.message);
          setStage("error");
          return;
        }
      }
    }

    setErrorMsg("Payment verification timed out. If you completed the payment, it will be confirmed shortly.");
    setStage("error");
  };

  const copyAddress = (address: string) => {
    navigator.clipboard.writeText(address);
    toast.success("Address copied to clipboard");
  };

  if (stage === "success") {
    return (
      <div className="flex flex-col items-center gap-2 py-4">
        <CheckCircle2 className="h-8 w-8 text-green-400" />
        <p className="text-sm font-bold text-green-400">Crypto payment confirmed</p>
        <p className="text-xs text-muted-foreground">
          Your wallet balance has been updated.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="p-3 rounded-xl bg-muted/30 border border-border/20">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 rounded-lg bg-[#0052FF]/10 flex items-center justify-center">
            <span className="text-sm font-bold text-[#0052FF]">₿</span>
          </div>
          <div>
            <p className="text-xs font-bold text-foreground">Pay with Crypto</p>
            <p className="text-[10px] text-muted-foreground">Bitcoin, Ethereum, USDC, and more</p>
          </div>
        </div>
        <p className="text-[10px] text-muted-foreground">
          Powered by Coinbase Commerce. You&apos;ll be redirected to a secure payment page.
        </p>
      </div>

      {chargeData && stage === "pending" && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-500/5 border border-amber-500/20">
            <Loader2 className="h-4 w-4 animate-spin text-amber-500" />
            <div>
              <p className="text-xs font-bold text-amber-500">Waiting for blockchain confirmation</p>
              <p className="text-[10px] text-muted-foreground">This may take a few minutes</p>
            </div>
          </div>

          <Button
            variant="outline"
            onClick={() => window.open(chargeData.hosted_url, "_blank", "noopener,noreferrer")}
            className="w-full rounded-xl text-xs"
          >
            <ExternalLink className="h-3.5 w-3.5 mr-2" />
            Reopen payment page
          </Button>

          {chargeData.addresses && Object.entries(chargeData.addresses).length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                Or send directly to:
              </p>
              {Object.entries(chargeData.addresses).map(([network, address]) => (
                <button
                  key={network}
                  onClick={() => copyAddress(address)}
                  className="w-full flex items-center gap-2 p-2 rounded-lg bg-card border border-border/20 text-left"
                >
                  <span className="text-[10px] font-bold uppercase text-muted-foreground w-12">{network}</span>
                  <span className="text-[10px] font-mono text-foreground flex-1 truncate">{address}</span>
                  <Copy className="h-3 w-3 text-muted-foreground shrink-0" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {errorMsg && (
        <div className="flex items-center gap-2 text-xs text-destructive bg-destructive/5 rounded-lg px-3 py-2">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          <span className="flex-1">{errorMsg}</span>
        </div>
      )}

      {(stage === "idle" || stage === "error") && (
        <Button
          onClick={handleCreateCharge}
          className="w-full rounded-xl h-12"
          style={{ background: "#0052FF" }}
        >
          <span className="mr-2 text-lg">₿</span>
          {stage === "error" ? "Retry Crypto Payment" : `Pay ${amount} ${currency} with Crypto`}
        </Button>
      )}

      {stage === "creating" && (
        <Button disabled className="w-full rounded-xl h-12">
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
          Creating payment...
        </Button>
      )}
    </div>
  );
}
