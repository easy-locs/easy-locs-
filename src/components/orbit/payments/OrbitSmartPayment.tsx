/**
 * OrbitSmartPayment — Premium dynamic payment screen
 * Fiat: routes through orbit-payment/pay_fiat (Stripe 3DS)
 * LOCS: routes through orbit-payment/pay_locs (atomic RPC)
 * Currency detection: preference → country → locale
 */
import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeftRight, Wallet, CreditCard, Coins, ChevronDown, Shield, Loader2, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { useWallet } from "@/hooks/useWallet";
import { usePaymentFX } from "@/hooks/usePaymentFX";
import { supabase } from "@/integrations/supabase/client";
import {
  detectLocalCurrency,
  formatCurrency,
  formatLocs,
  SUPPORTED_CURRENCIES,
} from "@/lib/orbit-payments";
import type { PaymentMethod, PaymentContext } from "@/lib/orbit-payments/types";

interface OrbitSmartPaymentProps {
  recipientUserId: string;
  recipientName: string;
  context?: PaymentContext;
  threadId?: string;
  defaultAmount?: number;
  defaultCurrency?: string;
  onSuccess?: (txnId: string) => void;
  onCancel?: () => void;
}

export default function OrbitSmartPayment({
  recipientUserId,
  recipientName,
  context,
  threadId,
  defaultAmount,
  defaultCurrency,
  onSuccess,
  onCancel,
}: OrbitSmartPaymentProps) {
  const { userCurrency, userCountry } = useAuth();
  const detected = detectLocalCurrency({
    preferredCurrency: userCurrency || null,
    accountCountry: userCountry || null,
  });
  const { balance, loading: walletLoading } = useWallet();
  const { preview, loading: fxLoading, convert, fetchRates } = usePaymentFX();

  const [method, setMethod] = useState<PaymentMethod>("fiat");
  const [amount, setAmount] = useState(defaultAmount?.toString() || "");
  const [currency, setCurrency] = useState(defaultCurrency || detected.code);
  const [description, setDescription] = useState("");
  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchRates();
  }, [fetchRates]);

  useEffect(() => {
    const num = parseFloat(amount);
    if (num > 0 && currency !== "EUR") {
      convert(num, currency);
    }
  }, [amount, currency, convert]);

  const numericAmount = parseFloat(amount) || 0;

  const handlePay = useCallback(async () => {
    if (numericAmount <= 0) return;
    setProcessing(true);
    setError(null);

    try {
      if (method === "locs") {
        // LOCS transfer via atomic server RPC
        const { data, error: fnErr } = await supabase.functions.invoke("orbit-payment", {
          body: {
            action: "pay_locs",
            recipient_user_id: recipientUserId,
            amount: numericAmount,
            description: description || `Payment to ${recipientName}`,
            thread_id: threadId || null,
            context: context || null,
          },
        });

        if (fnErr) throw new Error(fnErr.message);
        if (data?.error) throw new Error(data.error);

        setSuccess(true);
        setTimeout(() => onSuccess?.(data?.tx_out_id || "locs-transfer"), 1500);
      } else {
        // Fiat payment via Stripe checkout (3DS)
        const { data, error: fnErr } = await supabase.functions.invoke("orbit-payment", {
          body: {
            action: "pay_fiat",
            recipient_user_id: recipientUserId,
            recipient_name: recipientName,
            amount: numericAmount,
            currency,
            description: description || `Payment to ${recipientName}`,
            thread_id: threadId || null,
            context: context || null,
          },
        });

        if (fnErr) throw new Error(fnErr.message);
        if (data?.error) throw new Error(data.error);
        if (data?.url) {
          window.open(data.url, "_blank");
        }
      }
    } catch (err: any) {
      setError(err.message || "Payment failed");
    } finally {
      setProcessing(false);
    }
  }, [numericAmount, method, recipientUserId, recipientName, description, threadId, context, currency, onSuccess]);

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
        <p className="text-lg font-semibold text-foreground">Payment sent!</p>
        <p className="text-sm text-muted-foreground">
          {method === "locs" ? formatLocs(numericAmount) : formatCurrency(numericAmount, currency)} → {recipientName}
        </p>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col gap-5 p-4 max-w-md mx-auto"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-foreground">Send Payment</h2>
          <p className="text-sm text-muted-foreground">to {recipientName}</p>
        </div>
        {onCancel && (
          <Button variant="ghost" size="icon" onClick={onCancel} className="rounded-full">
            <X className="w-5 h-5" />
          </Button>
        )}
      </div>

      {/* Context badge */}
      {context && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-accent/10 border border-accent/20">
          <Shield className="w-4 h-4 text-accent" />
          <span className="text-xs text-accent font-medium capitalize">
            {context.type}: {context.label || context.id.slice(0, 8)}
          </span>
        </div>
      )}

      {/* Method toggle */}
      <div className="flex rounded-xl bg-muted p-1 gap-1">
        <button
          onClick={() => setMethod("fiat")}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
            method === "fiat"
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <CreditCard className="w-4 h-4" />
          Fiat
        </button>
        <button
          onClick={() => setMethod("locs")}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
            method === "locs"
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Coins className="w-4 h-4" />
          LOCS
        </button>
      </div>

      {/* Wallet balance (LOCS mode) */}
      <AnimatePresence>
        {method === "locs" && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-primary/5 border border-primary/10">
              <div className="flex items-center gap-2">
                <Wallet className="w-4 h-4 text-primary" />
                <span className="text-sm text-muted-foreground">Balance</span>
              </div>
              <span className="text-sm font-bold text-foreground">
                {walletLoading ? "..." : formatLocs(balance?.balance || 0)}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Amount input */}
      <div className="space-y-2">
        <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Amount</Label>
        <div className="relative">
          <Input
            type="number"
            inputMode="decimal"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="text-3xl font-bold h-16 text-center pr-20 bg-card border-border"
            min="0.01"
            step="0.01"
          />
          {method === "fiat" ? (
            <button
              onClick={() => setShowCurrencyPicker(!showCurrencyPicker)}
              className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 px-2 py-1 rounded-lg bg-muted hover:bg-muted/80 transition-colors"
            >
              <span className="text-sm font-semibold text-foreground">{currency}</span>
              <ChevronDown className="w-3 h-3 text-muted-foreground" />
            </button>
          ) : (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 px-2 py-1">
              <span className="text-sm font-semibold text-foreground">LOCS</span>
            </div>
          )}
        </div>
      </div>

      {/* Currency picker dropdown */}
      <AnimatePresence>
        {showCurrencyPicker && method === "fiat" && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="grid grid-cols-3 gap-1.5 p-2 rounded-xl bg-card border border-border max-h-48 overflow-y-auto">
              {Object.entries(SUPPORTED_CURRENCIES).map(([code, info]) => (
                <button
                  key={code}
                  onClick={() => { setCurrency(code); setShowCurrencyPicker(false); }}
                  className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs transition-colors ${
                    currency === code
                      ? "bg-accent/15 text-accent font-semibold"
                      : "hover:bg-muted text-foreground"
                  }`}
                >
                  <span className="font-medium">{info.symbol}</span>
                  <span className="truncate">{code}</span>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* FX conversion preview */}
      {method === "fiat" && numericAmount > 0 && currency !== "EUR" && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center justify-between px-4 py-3 rounded-xl bg-accent/5 border border-accent/15"
        >
          <div className="flex items-center gap-2">
            <ArrowLeftRight className="w-4 h-4 text-accent" />
            <span className="text-xs text-muted-foreground">LOCS equivalent</span>
          </div>
          {fxLoading ? (
            <Loader2 className="w-4 h-4 animate-spin text-accent" />
          ) : (
            <div className="text-right">
              <p className="text-sm font-bold text-foreground">
                {preview ? formatLocs(preview.locs_amount) : "—"}
              </p>
              {preview && (
                <p className="text-[10px] text-muted-foreground">
                  1 {currency} = {preview.fx_rate_used.toFixed(4)} EUR • {preview.fx_source.toUpperCase()}
                </p>
              )}
            </div>
          )}
        </motion.div>
      )}

      {/* Description */}
      <div className="space-y-2">
        <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Note (optional)</Label>
        <Textarea
          placeholder="What's this payment for?"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="resize-none h-16 text-sm bg-card border-border"
          maxLength={200}
        />
      </div>

      {/* Error */}
      {error && (
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-sm text-destructive text-center">
          {error}
        </motion.p>
      )}

      {/* Pay button */}
      <Button
        onClick={handlePay}
        disabled={numericAmount <= 0 || processing || (method === "locs" && (balance?.balance || 0) < numericAmount)}
        className="h-14 text-base font-bold rounded-xl bg-accent text-accent-foreground hover:bg-accent/90 shadow-md"
      >
        {processing ? (
          <Loader2 className="w-5 h-5 animate-spin mr-2" />
        ) : (
          <Shield className="w-5 h-5 mr-2" />
        )}
        {processing
          ? "Processing..."
          : method === "locs"
            ? `Pay ${numericAmount > 0 ? formatLocs(numericAmount) : ""}`
            : `Pay ${numericAmount > 0 ? formatCurrency(numericAmount, currency) : ""}`}
      </Button>

      {/* Security footer */}
      <div className="flex items-center justify-center gap-1.5 text-[10px] text-muted-foreground">
        <Shield className="w-3 h-3" />
        <span>3D Secure • Atomic transfers • Server-signed • Orbit Payments</span>
      </div>
    </motion.div>
  );
}
