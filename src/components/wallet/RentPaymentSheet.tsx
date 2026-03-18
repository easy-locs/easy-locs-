/**
 * RentPaymentSheet — Dedicated rent payment UX within the wallet.
 * Shows lease/property context, amount breakdown, executes wallet transfer.
 * Canonical chain: lease → rent_call → wallet → accounting → documents
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
import { useAuth } from "@/contexts/AuthContext";
import { useWallet } from "@/hooks/useWallet";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { formatCurrency } from "@/lib/country-config";
import { useNavigate } from "react-router-dom";
import RentStatusBadge from "@/components/rent/RentStatusBadge";

interface RentCallDetail {
  id: string;
  month: string;
  rent_amount: number;
  charges_amount: number;
  total_amount: number;
  paid_amount: number;
  paid: boolean;
  payment_status: string;
  receipt_pdf_url: string | null;
  receipt_validated: boolean;
  lease_id: string | null;
  tenant_id: string;
  property_id: string;
  org_id: string;
  tenants?: { name: string; email: string | null } | null;
  properties?: { label: string; city: string; country: string; address: string } | null;
  leases?: { lease_type: string; start_date: string; end_date: string; payment_day: number } | null;
}

interface RentPaymentSheetProps {
  rentCallId: string;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function RentPaymentSheet({ rentCallId, onClose, onSuccess }: RentPaymentSheetProps) {
  const { user } = useAuth();
  const { balance, sendMoney, loadWallet } = useWallet();
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [rentCall, setRentCall] = useState<RentCallDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from("rent_calls")
        .select("id, month, rent_amount, charges_amount, total_amount, paid_amount, paid, payment_status, receipt_pdf_url, receipt_validated, lease_id, tenant_id, property_id, org_id, tenants(name, email), properties(label, city, country, address), leases(lease_type, start_date, end_date, payment_day)")
        .eq("id", rentCallId)
        .single();
      setRentCall(data as any);
      setLoading(false);
    };
    fetch();
  }, [rentCallId]);

  const remaining = rentCall ? rentCall.total_amount - (rentCall.paid_amount || 0) : 0;
  const country = (rentCall?.properties as any)?.country || "FR";
  const fmt = (n: number) => formatCurrency(n, country);
  const hasEnoughBalance = (balance?.balance || 0) >= remaining;

  const handlePay = async () => {
    if (!rentCall || !user?.id || paying) return;
    setPaying(true);

    try {
      // Get org owner to send payment to
      const { data: org } = await supabase
        .from("orgs")
        .select("owner_user_id")
        .eq("id", rentCall.org_id)
        .single();

      if (!org?.owner_user_id) throw new Error("Cannot resolve landlord");

      const result = await sendMoney({
        recipientUserId: org.owner_user_id,
        amount: remaining,
        description: `Rent payment — ${(rentCall.properties as any)?.label || ""} — ${rentCall.month}`,
        referenceType: "rent_call",
        referenceId: rentCall.id,
      });

      if (!result.success) throw new Error(result.error || "Payment failed");

      // Update rent_call payment status
      await supabase.from("rent_calls").update({
        paid_amount: rentCall.total_amount,
        payment_status: "paid",
        paid: true,
        paid_date: new Date().toISOString().slice(0, 10),
        payment_method: "wallet",
        wallet_transaction_id: (result.data as any)?.transaction_id || null,
      }).eq("id", rentCall.id);

      // Trigger receipt generation
      try {
        await supabase.functions.invoke("generate-rent-receipt", {
          body: { rentCallId: rentCall.id },
        });
      } catch { /* receipt generation is async, non-blocking */ }

      setPaymentSuccess(true);
      queryClient.invalidateQueries({ queryKey: ["rent-cockpit"] });
      queryClient.invalidateQueries({ queryKey: ["tenant-rent"] });
      await loadWallet();

      toast({ title: "Payment successful", description: `${fmt(remaining)} paid for ${rentCall.month}` });
      onSuccess?.();
    } catch (err: any) {
      toast({ title: "Payment failed", description: err.message, variant: "destructive" });
    } finally {
      setPaying(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!rentCall) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Rent call not found</p>
        <Button variant="ghost" onClick={onClose} className="mt-4">Go back</Button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full shrink-0">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-bold text-foreground">Rent Payment</h2>
          <p className="text-xs text-muted-foreground">{rentCall.month}</p>
        </div>
        <RentStatusBadge status={paymentSuccess ? "paid" : rentCall.payment_status || "pending"} />
      </div>

      <AnimatePresence mode="wait">
        {paymentSuccess ? (
          /* ─── Success state ─── */
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-4"
          >
            <div className="text-center py-8">
              <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="h-8 w-8 text-success" />
              </div>
              <h3 className="text-xl font-bold text-foreground">Payment Confirmed</h3>
              <p className="text-sm text-muted-foreground mt-1">{fmt(remaining)} — {rentCall.month}</p>
            </div>

            <div className="space-y-2">
              {rentCall.receipt_pdf_url && (
                <Button
                  variant="outline"
                  className="w-full gap-2"
                  onClick={() => window.open(rentCall.receipt_pdf_url!, "_blank")}
                >
                  <Download className="h-4 w-4" /> Open Receipt
                </Button>
              )}
              <Button
                variant="outline"
                className="w-full gap-2"
                onClick={() => navigate(`/app/orbit?context=rent_call&contextId=${rentCall.id}`)}
              >
                <MessageCircle className="h-4 w-4" /> Open Conversation
              </Button>
              <Button variant="ghost" className="w-full" onClick={onClose}>
                Back to Wallet
              </Button>
            </div>
          </motion.div>
        ) : (
          /* ─── Payment form ─── */
          <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            {/* Property & Lease context */}
            <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Home className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">
                    {(rentCall.properties as any)?.label || "Property"}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {(rentCall.properties as any)?.city || ""} · {country}
                  </p>
                </div>
              </div>

              {rentCall.leases && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground px-1">
                  <FileText className="h-3.5 w-3.5" />
                  <span>
                    {(rentCall.leases as any)?.lease_type || "Lease"} ·
                    Due day {(rentCall.leases as any)?.payment_day || "—"}
                  </span>
                </div>
              )}
            </div>

            {/* Amount breakdown */}
            <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Amount Breakdown</h4>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Rent</span>
                  <span className="font-medium text-foreground">{fmt(rentCall.rent_amount)}</span>
                </div>
                {rentCall.charges_amount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Charges</span>
                    <span className="font-medium text-foreground">{fmt(rentCall.charges_amount)}</span>
                  </div>
                )}
                <div className="border-t border-border pt-2 flex justify-between text-sm">
                  <span className="font-semibold text-foreground">Total</span>
                  <span className="font-bold text-foreground">{fmt(rentCall.total_amount)}</span>
                </div>
                {(rentCall.paid_amount || 0) > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Already paid</span>
                    <span className="text-success font-medium">- {fmt(rentCall.paid_amount)}</span>
                  </div>
                )}
                {remaining !== rentCall.total_amount && (
                  <div className="flex justify-between text-sm pt-1 border-t border-border">
                    <span className="font-semibold text-foreground">Remaining</span>
                    <span className="font-bold text-primary">{fmt(remaining)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Wallet balance */}
            <div className="rounded-2xl border border-border bg-card p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Wallet Balance</span>
                </div>
                <span className={`text-sm font-bold ${hasEnoughBalance ? "text-foreground" : "text-destructive"}`}>
                  {(balance?.balance || 0).toFixed(0)} LOCS
                </span>
              </div>
              {!hasEnoughBalance && (
                <p className="text-xs text-destructive mt-2 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  Insufficient balance. Top up {fmt(remaining - (balance?.balance || 0))} more.
                </p>
              )}
            </div>

            {/* Pay button */}
            <Button
              className="w-full h-12 text-base font-bold gap-2 rounded-2xl"
              disabled={!hasEnoughBalance || paying || rentCall.paid}
              onClick={handlePay}
            >
              {paying ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Processing...</>
              ) : rentCall.paid ? (
                <><CheckCircle className="h-4 w-4" /> Already Paid</>
              ) : (
                <>Pay {fmt(remaining)}</>
              )}
            </Button>

            {/* Security footer */}
            <div className="flex items-center justify-center gap-2 text-[10px] text-muted-foreground">
              <Shield className="w-3 h-3" />
              <span>Atomic transfer · Automatic receipt · Legal traceability</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
