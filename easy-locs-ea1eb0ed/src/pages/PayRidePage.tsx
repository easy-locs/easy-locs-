import { useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import SubPageShell from "@/components/layout/SubPageShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { platformBus, generateCorrelationId } from "@/lib/shared/platform-bus";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, CreditCard, CheckCircle, XCircle } from "lucide-react";
import { useUiEngine } from "@/hooks/useUiEngine";

type PaymentState = "idle" | "processing" | "success" | "error";

export default function PayRidePage() {
  useUiEngine("payridepage");
  const { threadId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [amount, setAmount] = useState("");
  const [paymentState, setPaymentState] = useState<PaymentState>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const handlePay = useCallback(async () => {
    const numericAmount = parseFloat(amount);
    if (!numericAmount || numericAmount <= 0) {
      setErrorMsg("Please enter a valid amount");
      return;
    }
    if (!user?.id) {
      setErrorMsg("Please sign in to make a payment");
      return;
    }
    if (!threadId) {
      setErrorMsg("Missing conversation reference — please reopen this payment from the chat.");
      return;
    }

    setPaymentState("processing");
    setErrorMsg("");

    const correlationId = generateCorrelationId("ride");

    platformBus.emit("wallet:payment_requested", {
      amount: numericAmount,
      currency: "AED",
      context: "ride_payment",
      threadId,
      payerId: user.id,
      correlationId,
    }, "payride", { userId: user.id, correlationId });

    const result = await new Promise<{ success: boolean; error?: string }>((resolve) => {
      let settled = false;

      const timeout = setTimeout(() => {
        if (settled) return;
        settled = true;
        unsubSuccess();
        unsubFail();
        resolve({ success: false, error: "Payment timed out. Please try again." });
      }, 15000);

      const unsubSuccess = platformBus.on("wallet:payment_success", (event) => {
        const p = event.payload as Record<string, unknown>;
        if (p?.correlationId !== correlationId) return;
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        unsubFail();
        resolve({ success: true });
      });

      const unsubFail = platformBus.on("wallet:payment_failed", (event) => {
        const p = event.payload as Record<string, unknown>;
        if (p?.correlationId !== correlationId) return;
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        unsubSuccess();
        resolve({ success: false, error: (p?.reason as string) ?? "Payment failed" });
      });
    });

    if (result.success) {
      setPaymentState("success");
      platformBus.emit("transaction:completed", {
        transactionId: `ride_${Date.now()}`,
        amount: numericAmount,
        currency: "AED",
        type: "ride_payment",
        threadId,
        payerId: user.id,
        correlationId,
      }, "payride", { userId: user.id, correlationId });
      // Close the loop: notify Orbit so the chat thread receives a payment confirmation message.
      platformBus.emit("orbit:notify_payment", {
        threadId,
        amount: numericAmount,
        currency: "AED",
        kind: "ride_payment",
        payerId: user.id,
        correlationId,
      }, "payride", { userId: user.id, correlationId });
    } else {
      setPaymentState("error");
      setErrorMsg(result.error ?? "Payment could not be processed");
    }
  }, [amount, user?.id, threadId]);

  return (
    <SubPageShell title="Pay for Ride" subtitle={`Thread: ${threadId ?? "—"}`} onBack={() => navigate(-1)}>
      <div className="max-w-lg mx-auto space-y-4">

        {paymentState === "success" ? (
          <div className="rounded-2xl border border-green-200 bg-green-50 dark:bg-green-950/30 dark:border-green-800 p-6 text-center space-y-3">
            <CheckCircle className="h-10 w-10 text-green-600 mx-auto" />
            <p className="text-sm font-semibold text-green-700 dark:text-green-400">Payment Successful</p>
            <p className="text-xs text-muted-foreground">{amount} AED sent</p>
            <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
              Back to conversation
            </Button>
          </div>
        ) : (
          <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Amount (AED)</label>
              <Input
                type="number"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                disabled={paymentState === "processing"}
                min="0"
                step="0.01"
              />
            </div>

            {errorMsg && (
              <div className="flex items-center gap-2 text-xs text-destructive">
                <XCircle className="h-3.5 w-3.5 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <Button
              className="w-full gap-2"
              onClick={handlePay}
              disabled={paymentState === "processing" || !amount}
            >
              {paymentState === "processing" ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <CreditCard className="h-4 w-4" />
                  Pay {amount ? `${amount} AED` : ""}
                </>
              )}
            </Button>

            {paymentState === "error" && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full"
                onClick={() => { setPaymentState("idle"); setErrorMsg(""); }}
              >
                Try again
              </Button>
            )}
          </div>
        )}
      </div>
    </SubPageShell>
  );
}
