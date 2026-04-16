import { useState } from "react";
import { useInsuranceOffer } from "@/hooks/useMicroInsurance";
import { AppCard, CardContent } from "@/components/ui/AppCard";
import { Badge } from "@/components/ui/badge";
import { Shield, Check, ChevronDown, ChevronUp } from "lucide-react";
import type { InsuranceType } from "@/services/micro-insurance.service";

interface MicroInsuranceOptionProps {
  type: InsuranceType;
  orderAmount?: number;
  currency?: string;
  onToggle?: (selected: boolean, premium: number, coverageAmount: number) => void;
}

export default function MicroInsuranceOption({
  type,
  orderAmount,
  currency = "USD",
  onToggle,
}: MicroInsuranceOptionProps) {
  const offer = useInsuranceOffer(type, orderAmount);
  const [selected, setSelected] = useState(false);
  const [expanded, setExpanded] = useState(false);

  if (!offer) return null;

  const handleToggle = () => {
    const next = !selected;
    setSelected(next);
    onToggle?.(next, offer.premium, offer.coverageAmount);
  };

  const symbol = currency === "USD" ? "$" : currency;

  return (
    <AppCard
      className={`cursor-pointer transition-all ${
        selected ? "border-green-500/40 bg-green-500/5" : "border-border/40"
      }`}
      onClick={handleToggle}
    >
      <CardContent className="p-3">
        <div className="flex items-start gap-3">
          <div
            className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
              selected ? "bg-green-500/20" : "bg-muted"
            }`}
          >
            {selected ? (
              <Check className="h-4 w-4 text-green-600" />
            ) : (
              <Shield className="h-4 w-4 text-muted-foreground" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-0.5">
              <span className="text-xs font-semibold">{offer.title}</span>
              <Badge
                variant="secondary"
                className="text-[0.625rem] font-bold"
              >
                +{symbol}{offer.premium.toFixed(2)}
              </Badge>
            </div>
            <p className="text-[0.625rem] text-muted-foreground mb-1.5">
              {offer.description}
            </p>

            <div className="flex items-center justify-between">
              <span className="text-[0.625rem] text-muted-foreground">
                Up to {symbol}{offer.coverageAmount.toLocaleString()} coverage
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setExpanded(!expanded);
                }}
                className="text-[0.625rem] text-primary flex items-center gap-0.5"
              >
                {expanded ? "Less" : "Details"}
                {expanded ? (
                  <ChevronUp className="h-3 w-3" />
                ) : (
                  <ChevronDown className="h-3 w-3" />
                )}
              </button>
            </div>

            {expanded && (
              <div className="mt-2 space-y-1">
                {offer.coverageItems.map((item, i) => (
                  <div key={i} className="flex items-center gap-1.5">
                    <Check className="h-2.5 w-2.5 text-green-500 shrink-0" />
                    <span className="text-[0.625rem] text-muted-foreground">
                      {item}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </AppCard>
  );
}
