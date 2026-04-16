import { useState, useEffect } from "react";
import { CreditCard, Clock, Loader2, AlertCircle, ChevronDown, ChevronUp, Calendar } from "lucide-react";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/contexts/AuthContext";
import {
  checkBnplEligibility,
  createBnplPlan,
  approveBnplPlan,
  activateBnplPlan,
  calculateInstallmentBreakdown,
  type BnplEligibility,
} from "@/services/bnpl.service";
import { formatMoney } from "@/lib/format";

interface BnplCheckoutProps {
  orderId: string;
  orderAmount: number;
  currency?: string;
  merchantName?: string;
  onPlanCreated?: (planId: string) => void;
}

export default function BnplCheckout({
  orderId,
  orderAmount,
  currency = "USD",
  merchantName,
  onPlanCreated,
}: BnplCheckoutProps) {
  const { t } = useI18n();
  const { user } = useAuth();
  const [eligibility, setEligibility] = useState<BnplEligibility | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [selectedInstallments, setSelectedInstallments] = useState(3);
  const [expanded, setExpanded] = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    setLoading(true);
    checkBnplEligibility(user.id, orderAmount)
      .then(setEligibility)
      .finally(() => setLoading(false));
  }, [user?.id, orderAmount]);

  const handleCreate = async () => {
    setCreating(true);
    try {
      const result = await createBnplPlan({
        orderId,
        totalAmount: orderAmount,
        currency,
        installmentCount: selectedInstallments,
        merchantName,
      });
      if (!result.ok || !result.plan) {
        toast.error(result.error || "Failed to create plan");
        return;
      }

      const approveResult = await approveBnplPlan(result.plan.id);
      if (!approveResult.ok) {
        toast.error(approveResult.error || "Failed to approve plan");
        return;
      }

      const activateResult = await activateBnplPlan(result.plan.id);
      if (!activateResult.ok) {
        toast.error(activateResult.error || "Failed to activate plan");
        return;
      }

      toast.success(t("bnpl.plan_created") || "BNPL plan created");
      onPlanCreated?.(result.plan.id);
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-3 text-sm text-muted-foreground">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        {t("bnpl.checking")}
      </div>
    );
  }

  if (!eligibility?.eligible) {
    return null;
  }

  const breakdown = calculateInstallmentBreakdown(orderAmount, selectedInstallments);

  const scheduleItems = Array.from({ length: selectedInstallments }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() + (i + 1) * 30);
    const amount =
      i === selectedInstallments - 1
        ? Math.round((orderAmount - breakdown.perInstallment * (selectedInstallments - 1)) * 100) / 100
        : breakdown.perInstallment;
    return {
      number: i + 1,
      date: date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }),
      amount,
      isFirst: i === 0,
    };
  });

  return (
    <div className="rounded-xl border border-border/20 bg-card/60 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 text-left"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-purple-500/10 flex items-center justify-center">
            <CreditCard className="h-4.5 w-4.5 text-purple-500" />
          </div>
          <div>
            <p className="text-sm font-bold text-foreground">{t("bnpl.title")}</p>
            <p className="text-xs text-muted-foreground">
              {selectedInstallments}x {formatMoney(breakdown.perInstallment, currency)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-green-500/10 text-green-500">
            {t("bnpl.no_interest")}
          </span>
          {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-4 border-t border-border/10 pt-4">
          <p className="text-xs text-muted-foreground">{t("bnpl.split_payment")}</p>

          <div className="flex gap-2">
            {eligibility.availableInstallments.map((count) => {
              const inst = calculateInstallmentBreakdown(orderAmount, count);
              return (
                <button
                  key={count}
                  onClick={() => setSelectedInstallments(count)}
                  className={`flex-1 py-2.5 rounded-lg text-center transition-all ${
                    selectedInstallments === count
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "bg-muted/20 text-foreground border border-border/20"
                  }`}
                >
                  <p className="text-sm font-bold">{count}x</p>
                  <p className="text-[10px]">{formatMoney(inst.perInstallment, currency)}</p>
                </button>
              );
            })}
          </div>

          <button
            onClick={() => setShowSchedule(!showSchedule)}
            className="flex items-center gap-1.5 text-xs font-medium text-primary"
          >
            <Calendar className="h-3 w-3" />
            {t("bnpl.payment_schedule")}
            {showSchedule ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>

          {showSchedule && (
            <div className="space-y-1.5">
              {scheduleItems.map((item) => (
                <div
                  key={item.number}
                  className="flex items-center justify-between px-3 py-2 rounded-lg bg-muted/10"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold bg-muted/30 text-muted-foreground">
                      {item.number}
                    </div>
                    <span className="text-xs text-foreground">
                      {item.date}
                    </span>
                  </div>
                  <span className="text-xs font-semibold text-foreground">
                    {formatMoney(item.amount, currency)}
                  </span>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <AlertCircle className="h-3 w-3" />
            {t("bnpl.no_fees")}
          </div>

          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <Clock className="h-3 w-3" />
            {t("bnpl.first_payment_30_days") || "First payment in 30 days"}
          </div>

          <button
            onClick={handleCreate}
            disabled={creating}
            className="w-full py-3 rounded-xl text-sm font-bold bg-primary text-primary-foreground active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {creating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CreditCard className="h-4 w-4" />
            )}
            {t("bnpl.pay_in_installments") || `Pay in ${selectedInstallments} installments`}
          </button>
        </div>
      )}
    </div>
  );
}
