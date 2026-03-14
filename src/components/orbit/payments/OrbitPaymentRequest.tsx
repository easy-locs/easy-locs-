/**
 * OrbitPaymentRequest — Send a payment request to another user
 */
import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { HandCoins, Loader2, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useWallet } from "@/hooks/useWallet";
import { detectLocalCurrency, formatCurrency, SUPPORTED_CURRENCIES } from "@/lib/orbit-payments";
import type { PaymentContext } from "@/lib/orbit-payments/types";

interface OrbitPaymentRequestProps {
  recipientUserId?: string;
  recipientName?: string;
  threadId?: string;
  context?: PaymentContext;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function OrbitPaymentRequest({
  recipientUserId,
  recipientName,
  threadId,
  context,
  onSuccess,
  onCancel,
}: OrbitPaymentRequestProps) {
  const detected = detectLocalCurrency();
  const { requestMoney } = useWallet();
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState(detected.code);
  const [description, setDescription] = useState("");
  const [processing, setProcessing] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const numericAmount = parseFloat(amount) || 0;

  const handleRequest = useCallback(async () => {
    if (numericAmount <= 0) return;
    setProcessing(true);
    setError(null);

    try {
      const result = await requestMoney({
        fromUserId: recipientUserId,
        amount: numericAmount,
        description: description || `Payment request`,
        threadId,
      });

      if (!result.success) throw new Error(result.error);
      setSuccess(true);
      setTimeout(() => onSuccess?.(), 1500);
    } catch (err: any) {
      setError(err.message || "Request failed");
    } finally {
      setProcessing(false);
    }
  }, [numericAmount, recipientUserId, description, threadId, requestMoney, onSuccess]);

  if (success) {
    return (
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="flex flex-col items-center justify-center py-12 gap-4"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", delay: 0.2 }}
          className="w-16 h-16 rounded-full bg-success/20 flex items-center justify-center"
        >
          <Check className="w-8 h-8 text-success" />
        </motion.div>
        <p className="text-lg font-semibold text-foreground">Request sent!</p>
        <p className="text-sm text-muted-foreground">
          {formatCurrency(numericAmount, "EUR")} requested
          {recipientName ? ` from ${recipientName}` : ""}
        </p>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col gap-5 p-4"
    >
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-foreground">Request Payment</h2>
          {recipientName && (
            <p className="text-sm text-muted-foreground">from {recipientName}</p>
          )}
        </div>
        {onCancel && (
          <Button variant="ghost" size="icon" onClick={onCancel} className="rounded-full">
            <X className="w-5 h-5" />
          </Button>
        )}
      </div>

      <div className="space-y-2">
        <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Amount (LOCS)
        </Label>
        <Input
          type="number"
          inputMode="decimal"
          placeholder="0.00"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="text-3xl font-bold h-16 text-center bg-card border-border"
          min="0.01"
          step="0.01"
        />
      </div>

      <div className="space-y-2">
        <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Description
        </Label>
        <Textarea
          placeholder="What is this for?"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="resize-none h-16 text-sm bg-card border-border"
          maxLength={200}
        />
      </div>

      {error && (
        <p className="text-sm text-destructive text-center">{error}</p>
      )}

      <Button
        onClick={handleRequest}
        disabled={numericAmount <= 0 || processing}
        className="h-14 text-base font-bold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90"
      >
        {processing ? (
          <Loader2 className="w-5 h-5 animate-spin mr-2" />
        ) : (
          <HandCoins className="w-5 h-5 mr-2" />
        )}
        {processing ? "Sending..." : `Request ${numericAmount > 0 ? `${numericAmount} LOCS` : ""}`}
      </Button>
    </motion.div>
  );
}
