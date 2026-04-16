import { useState } from "react";
import { Shield, ChevronDown, ChevronUp, Check, Info } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { formatMoney } from "@/lib/format";
import {
  getInsuranceOffer,
  type InsuranceType,
  type InsuranceOffer,
} from "@/services/micro-insurance.service";

interface MicroInsuranceProps {
  type: InsuranceType;
  orderAmount: number;
  currency?: string;
  onToggle: (enabled: boolean, offer: InsuranceOffer | null) => void;
}

export default function MicroInsurance({
  type,
  orderAmount,
  currency = "USD",
  onToggle,
}: MicroInsuranceProps) {
  const { t } = useI18n();
  const [enabled, setEnabled] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  const offer = getInsuranceOffer(type, orderAmount);

  const handleToggle = () => {
    const newState = !enabled;
    setEnabled(newState);
    onToggle(newState, newState ? offer : null);
  };

  const titleKey = type === "package_protection" ? "insurance.package_protection" : "insurance.trip_protection";
  const descKey = type === "package_protection" ? "insurance.package_desc" : "insurance.trip_desc";

  return (
    <div className={`rounded-xl border transition-all ${
      enabled
        ? "border-green-500/30 bg-green-500/5"
        : "border-border/20 bg-card/60"
    }`}>
      <div className="flex items-center gap-3 p-3">
        <button
          onClick={handleToggle}
          className={`w-11 h-6 rounded-full relative transition-colors ${
            enabled ? "bg-green-500" : "bg-muted/40"
          }`}
        >
          <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
            enabled ? "translate-x-[22px]" : "translate-x-0.5"
          }`} />
        </button>

        <div className="flex-1 min-w-0" onClick={handleToggle}>
          <div className="flex items-center gap-2">
            <Shield className={`h-3.5 w-3.5 ${enabled ? "text-green-500" : "text-muted-foreground"}`} />
            <p className="text-sm font-semibold text-foreground">{t(titleKey)}</p>
          </div>
          <p className="text-[10px] text-muted-foreground mt-0.5">{t(descKey)}</p>
        </div>

        <div className="text-end shrink-0">
          <p className="text-sm font-bold text-foreground">
            +{formatMoney(offer.premium, currency)}
          </p>
          <p className="text-[9px] text-muted-foreground">
            {formatMoney(offer.coverageAmount, currency)} {t("insurance.coverage")}
          </p>
        </div>
      </div>

      {enabled && (
        <div className="px-3 pb-3">
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="flex items-center gap-1 text-[10px] font-medium text-primary"
          >
            <Info className="h-2.5 w-2.5" />
            {showDetails ? t("insurance.less") : t("insurance.details")}
            {showDetails ? <ChevronUp className="h-2.5 w-2.5" /> : <ChevronDown className="h-2.5 w-2.5" />}
          </button>

          {showDetails && (
            <div className="mt-2 space-y-1">
              {offer.coverageItems.map((item, i) => (
                <div key={i} className="flex items-center gap-1.5 text-[11px] text-foreground">
                  <Check className="h-3 w-3 text-green-500 shrink-0" />
                  {t(item) || item}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
