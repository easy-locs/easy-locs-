import { useNavigate } from "react-router-dom";
import { useBnplPlans } from "@/hooks/useBnpl";
import { useI18n } from "@/lib/i18n";
import SubPageShell from "@/components/layout/SubPageShell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Calendar,
  Check,
  Clock,
  CreditCard,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

const STATUS_COLORS: Record<string, string> = {
  created: "bg-gray-500/20 text-gray-600",
  approved: "bg-yellow-500/20 text-yellow-600",
  active: "bg-blue-500/20 text-blue-600",
  completed: "bg-green-500/20 text-green-600",
  overdue: "bg-red-500/20 text-red-600",
  defaulted: "bg-red-700/20 text-red-700",
};

const INSTALLMENT_ICONS: Record<string, typeof Check> = {
  paid: Check,
  pending: Clock,
  overdue: AlertTriangle,
};

export default function InstallmentsPage() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const { plans, loading, pay } = useBnplPlans();

  const handlePay = async (planId: string, installmentId: string) => {
    const result = await pay(planId, installmentId);
    if (result.ok) {
      toast.success("Installment paid");
    } else {
      toast.error(result.error || "Payment failed");
    }
  };

  return (
    <SubPageShell className="bg-background">
      <div className="flex items-center gap-3 px-4 pt-6 pb-4">
        <button
          onClick={() => navigate("/wallet")}
          className="w-9 h-9 rounded-xl flex items-center justify-center active:scale-95 transition-transform bg-muted/60"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="text-lg font-bold text-foreground">{t("bnpl.installments")}</h1>
          <p className="text-xs text-muted-foreground">
            {t("bnpl.installments_desc")}
          </p>
        </div>
      </div>

      <div className="px-4 space-y-4 pb-8">
        {loading ? (
          <div className="py-12 text-center">
            <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
          </div>
        ) : plans.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <CreditCard className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
              <p className="text-sm font-medium mb-1">{t("bnpl.no_plans")}</p>
              <p className="text-xs text-muted-foreground">
                {t("bnpl.no_plans_desc")}
              </p>
            </CardContent>
          </Card>
        ) : (
          plans.map((plan, idx) => {
            const paidCount = plan.installments.filter(
              (i) => i.status === "paid",
            ).length;
            const progress = (paidCount / plan.installmentCount) * 100;

            return (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.08 }}
              >
                <Card>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold">
                          {plan.merchantName || `Order ${plan.orderId.slice(0, 8)}`}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {new Date(plan.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <Badge className={`text-[10px] ${STATUS_COLORS[plan.status] || ""}`}>
                        {plan.status}
                      </Badge>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">
                        Total
                      </span>
                      <span className="text-sm font-bold">
                        ${plan.totalAmount.toFixed(2)} {plan.currency}
                      </span>
                    </div>

                    <div>
                      <div className="flex items-center justify-between text-[10px] mb-1">
                        <span className="text-muted-foreground">
                          {paidCount}/{plan.installmentCount} paid
                        </span>
                        <span className="font-medium">{Math.round(progress)}%</span>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full transition-all"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      {plan.installments.map((inst) => {
                        const Icon = INSTALLMENT_ICONS[inst.status] || Clock;
                        const isPaid = inst.status === "paid";
                        return (
                          <div
                            key={inst.id}
                            className={`flex items-center gap-3 p-2 rounded-lg ${
                              isPaid ? "bg-green-500/5" : "bg-muted/30"
                            }`}
                          >
                            <div
                              className={`w-6 h-6 rounded-full flex items-center justify-center ${
                                isPaid
                                  ? "bg-green-500/20"
                                  : inst.status === "overdue"
                                    ? "bg-red-500/20"
                                    : "bg-muted"
                              }`}
                            >
                              <Icon
                                className={`h-3 w-3 ${
                                  isPaid
                                    ? "text-green-600"
                                    : inst.status === "overdue"
                                      ? "text-red-600"
                                      : "text-muted-foreground"
                                }`}
                              />
                            </div>
                            <div className="flex-1">
                              <p className="text-xs font-medium">
                                Installment {inst.number}
                              </p>
                              <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                                <Calendar className="h-2.5 w-2.5" />
                                {isPaid
                                  ? `Paid ${new Date(inst.paidAt!).toLocaleDateString()}`
                                  : `Due ${new Date(inst.dueDate).toLocaleDateString()}`}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-xs font-bold">
                                ${inst.amount.toFixed(2)}
                              </p>
                              {!isPaid && inst.status !== "overdue" && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-6 text-[10px] mt-1"
                                  onClick={() => handlePay(plan.id, inst.id)}
                                >
                                  Pay Now
                                </Button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })
        )}
      </div>
    </SubPageShell>
  );
}
