import { useState } from "react";
import { useBnplEligibility, calculateInstallmentBreakdown } from "@/hooks/useBnpl";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Check, CreditCard, Info, Loader2 } from "lucide-react";

interface BnplOptionProps {
  userId: string;
  orderAmount: number;
  currency?: string;
  onSelect?: (installmentCount: number) => void;
  onDeselect?: () => void;
}

export default function BnplOption({
  userId,
  orderAmount,
  currency = "USD",
  onSelect,
  onDeselect,
}: BnplOptionProps) {
  const { eligibility, loading } = useBnplEligibility(userId, orderAmount);
  const [selectedPlan, setSelectedPlan] = useState<number | null>(null);

  if (loading) {
    return (
      <Card className="border-dashed">
        <CardContent className="p-3 flex items-center gap-2">
          <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
          <span className="text-xs text-muted-foreground">
            Checking BNPL eligibility...
          </span>
        </CardContent>
      </Card>
    );
  }

  if (!eligibility?.eligible) return null;

  const handleSelect = (count: number) => {
    if (selectedPlan === count) {
      setSelectedPlan(null);
      onDeselect?.();
    } else {
      setSelectedPlan(count);
      onSelect?.(count);
    }
  };

  return (
    <Card className={selectedPlan ? "border-primary/40 bg-primary/5" : ""}>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold">Buy Now, Pay Later</span>
          </div>
          <Badge variant="secondary" className="text-[10px]">
            0% Interest
          </Badge>
        </div>

        <p className="text-xs text-muted-foreground">
          Split your payment into easy installments
        </p>

        <div className="grid grid-cols-3 gap-2">
          {eligibility.availableInstallments.map((count) => {
            const breakdown = calculateInstallmentBreakdown(
              orderAmount,
              count,
            );
            const isSelected = selectedPlan === count;

            return (
              <button
                key={count}
                onClick={() => handleSelect(count)}
                className={`relative rounded-xl p-3 text-center border transition-all ${
                  isSelected
                    ? "border-primary bg-primary/10 shadow-sm"
                    : "border-border/40 hover:border-primary/30"
                }`}
              >
                {isSelected && (
                  <div className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                    <Check className="h-2.5 w-2.5 text-white" />
                  </div>
                )}
                <p className="text-lg font-bold text-foreground">{count}x</p>
                <p className="text-[10px] text-muted-foreground">payments of</p>
                <p className="text-xs font-semibold text-primary">
                  {currency === "USD" ? "$" : currency}{" "}
                  {breakdown.perInstallment.toFixed(2)}
                </p>
              </button>
            );
          })}
        </div>

        {selectedPlan && (
          <div className="rounded-lg bg-muted/40 p-3 space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Calendar className="h-3 w-3" />
              Payment schedule
            </div>
            {Array.from({ length: selectedPlan }).map((_, i) => {
              const breakdown = calculateInstallmentBreakdown(
                orderAmount,
                selectedPlan,
              );
              const date = new Date();
              date.setDate(date.getDate() + (i + 1) * 30);
              return (
                <div
                  key={i}
                  className="flex items-center justify-between text-xs"
                >
                  <span className="text-muted-foreground">
                    {date.toLocaleDateString()}
                  </span>
                  <span className="font-medium">
                    {currency === "USD" ? "$" : currency}{" "}
                    {breakdown.perInstallment.toFixed(2)}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        <div className="flex items-start gap-1.5">
          <Info className="h-3 w-3 text-muted-foreground mt-0.5 shrink-0" />
          <p className="text-[10px] text-muted-foreground leading-relaxed">
            No interest or hidden fees. All installments are charged monthly
            starting 30 days after activation.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
