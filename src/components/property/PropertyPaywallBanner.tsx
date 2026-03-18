/**
 * PropertyPaywallBanner — Shows upgrade prompt when user hits 1 free property limit.
 */
import { Building2, Crown, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { PROPERTY_PAYWALL } from "@/hooks/usePropertyPaywall";

interface Props {
  propertyCount: number;
}

export default function PropertyPaywallBanner({ propertyCount }: Props) {
  const navigate = useNavigate();

  return (
    <div className="mx-4 my-4 rounded-2xl border border-primary/20 bg-primary/5 p-5 text-center space-y-3">
      <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
        <Lock className="h-7 w-7 text-primary" />
      </div>

      <h3 className="text-base font-bold text-foreground">
        Property Limit Reached
      </h3>

      <p className="text-xs text-muted-foreground max-w-xs mx-auto leading-relaxed">
        You have <strong>{propertyCount}</strong> propert{propertyCount !== 1 ? "ies" : "y"}.
        The free plan includes {PROPERTY_PAYWALL.freeLimit} property.
        Upgrade to manage unlimited properties.
      </p>

      <div className="flex items-center justify-center gap-3">
        <div className="text-center">
          <p className="text-lg font-bold text-primary">{PROPERTY_PAYWALL.monthlyPrice}€</p>
          <p className="text-[10px] text-muted-foreground">/month</p>
        </div>
        <span className="text-muted-foreground text-xs">or</span>
        <div className="text-center">
          <p className="text-lg font-bold text-primary">{PROPERTY_PAYWALL.yearlyPrice}€</p>
          <p className="text-[10px] text-muted-foreground">/year <span className="text-primary font-semibold">(save 17%)</span></p>
        </div>
      </div>

      <Button
        onClick={() => navigate("/dashboard/subscription")}
        className="w-full gap-2"
      >
        <Crown className="h-4 w-4" />
        Upgrade Now
      </Button>
    </div>
  );
}
