/**
 * RentPaymentSheet — Dedicated rent payment UX within the wallet.
 * Uses unified wallet engine (wallet_accounts + unified_wallet_transactions)
 */
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Home, FileText, CheckCircle,
  CreditCard, MessageCircle, AlertTriangle, Loader2,
  Download, Shield,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useWalletBalance } from "@/payments/wallet-hooks";
import { walletTransfer } from "@/payments/wallet-hooks";
import { supabase } from "@/integrations/supabase/client";
import { markRentCallPaid } from "@/repositories/rent-payment.repository";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { formatCurrency } from "@/lib/country-config";
import { useNavigate } from "react-router-dom";

interface RentPaymentSheetProps {
  rentCallId: string;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function RentPaymentSheet({ rentCallId, onClose, onSuccess }: RentPaymentSheetProps) {
  const { user } = useAuth();
  const { balance, currency: walletCurrency, loading: walletLoading, reload: reloadBalance } = useWalletBalance();
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [step, setStep] = useState<"review" | "processing" | "success" | "error">("review");
  const [rentCall, setRentCall] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("rent_calls")
        .select("*, properties(title, address)")
        .eq("id", rentCallId)
        .single();
      setRentCall(data);
      setLoading(false);
    })();
  }, [rentCallId]);

  const handlePay = async () => {
    if (!user?.id || !rentCall) return;
    setStep("processing");
    try {
      await walletTransfer({
        senderId: user.id,
        recipientId: rentCall.org_id || rentCall.owner_id,
        amount: rentCall.amount,
        currency: rentCall.currency || "AED",
        contextType: "rent_payment",
        contextId: rentCallId,
        title: `Rent - ${rentCall.properties?.title || "Property"}`,
      });
      await markRentCallPaid(rentCallId, rentCall.amount);
      await reloadBalance();
      queryClient.invalidateQueries({ queryKey: ["rent-calls"] });
      setStep("success");
      onSuccess?.();
    } catch (err: any) {
      toast({ title: "Payment failed", description: err.message, variant: "destructive" });
      setStep("error");
    }
  };

  if (loading || walletLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-2">
        <button onClick={onClose} className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <h2 className="text-sm font-bold text-foreground">Pay Rent</h2>
      </div>

      {step === "review" && rentCall && (
        <div className="space-y-4">
          <div className="rounded-xl bg-muted p-4 space-y-2">
            <div className="flex items-center gap-2">
              <Home className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-semibold text-foreground">{rentCall.properties?.title || "Property"}</span>
            </div>
            <p className="text-2xl font-black text-foreground">
              {formatCurrency(rentCall.amount, rentCall.currency || "AED")}
            </p>
            <p className="text-xs text-muted-foreground">
              Wallet balance: {balance.toFixed(2)} {walletCurrency}
            </p>
            {balance < rentCall.amount && (
              <div className="flex items-center gap-1.5 text-destructive text-xs">
                <AlertTriangle className="w-3.5 h-3.5" />
                Insufficient balance
              </div>
            )}
          </div>
          <Button onClick={handlePay} disabled={balance < rentCall.amount} className="w-full rounded-xl">
            <Shield className="w-4 h-4 mr-2" /> Confirm Payment
          </Button>
        </div>
      )}

      {step === "processing" && (
        <div className="flex flex-col items-center gap-3 py-8">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Processing payment...</p>
        </div>
      )}

      {step === "success" && (
        <div className="flex flex-col items-center gap-3 py-8">
          <CheckCircle className="w-12 h-12 text-primary" />
          <p className="text-sm font-bold text-foreground">Payment Successful</p>
          <Button variant="outline" size="sm" onClick={onClose}>Close</Button>
        </div>
      )}

      {step === "error" && (
        <div className="flex flex-col items-center gap-3 py-8">
          <AlertTriangle className="w-12 h-12 text-destructive" />
          <p className="text-sm font-bold text-foreground">Payment Failed</p>
          <Button variant="outline" size="sm" onClick={() => setStep("review")}>Try Again</Button>
        </div>
      )}
    </div>
  );
}
