import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { CreditCard, Banknote, Building2, Globe, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";

export type PaymentMethod = "card" | "cash" | "bank_transfer" | "paypal" | "custom";

interface PaymentOption {
  method: PaymentMethod;
  label: string;
  icon: React.ElementType;
  description: string;
  available: boolean;
}

interface Props {
  selectedMethod: PaymentMethod | null;
  onSelect: (method: PaymentMethod) => void;
  hasStripe?: boolean;
  hasPaypal?: boolean;
  hasBankDetails?: boolean;
  hasCustomLink?: boolean;
  /** Always show cash + bank transfer */
  showOffline?: boolean;
  className?: string;
}

export default function PaymentMethodSelector({
  selectedMethod, onSelect,
  hasStripe, hasPaypal, hasBankDetails, hasCustomLink,
  showOffline = true,
  className,
}: Props) {
  const { t } = useI18n();

  const options: PaymentOption[] = [
    ...(hasStripe ? [{
      method: "card" as PaymentMethod,
      label: t("payment.card") || "Credit Card",
      icon: CreditCard,
      description: t("payment.card_desc") || "Pay securely with Stripe",
      available: true,
    }] : []),
    ...(showOffline ? [{
      method: "cash" as PaymentMethod,
      label: t("payment.cash") || "Cash",
      icon: Banknote,
      description: t("payment.cash_desc") || "Pay in person on arrival",
      available: true,
    }] : []),
    ...(showOffline || hasBankDetails ? [{
      method: "bank_transfer" as PaymentMethod,
      label: t("payment.bank_transfer") || "Bank Transfer",
      icon: Building2,
      description: t("payment.bank_transfer_desc") || "Pay via wire transfer / IBAN",
      available: true,
    }] : []),
    ...(hasPaypal ? [{
      method: "paypal" as PaymentMethod,
      label: "PayPal",
      icon: Globe,
      description: t("payment.paypal_desc") || "Pay with PayPal",
      available: true,
    }] : []),
  ];

  if (options.length === 0) return null;

  return (
    <div className={cn("space-y-1.5", className)}>
      <p className="text-2xs font-semibold text-muted-foreground uppercase tracking-wider">
        {t("payment.method") || "Payment Method"}
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
        {options.map(({ method, label, icon: Icon, description }) => {
          const selected = selectedMethod === method;
          return (
            <button
              key={method}
              type="button"
              onClick={() => onSelect(method)}
              className={cn(
                "relative flex items-center gap-2 p-2.5 rounded-lg border text-left transition-all duration-200 min-h-[44px]",
                selected
                  ? "border-accent bg-accent/8 ring-1 ring-accent/30"
                  : "border-border bg-card hover:border-accent/30 hover:bg-accent/4"
              )}
            >
              <div className={cn(
                "w-7 h-7 rounded-md flex items-center justify-center shrink-0 transition-colors",
                selected ? "bg-accent/15 text-accent" : "bg-muted/50 text-muted-foreground"
              )}>
                <Icon className="h-3.5 w-3.5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className={cn(
                  "text-xs font-medium line-clamp-1 break-words",
                  selected ? "text-accent" : "text-foreground"
                )}>
                  {label}
                </p>
                <p className="text-[9px] text-muted-foreground line-clamp-1 break-words">{description}</p>
              </div>
              {selected && (
                <Check className="h-3 w-3 text-accent shrink-0 absolute top-1.5 right-1.5" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
