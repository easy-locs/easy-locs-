/**
 * SellerListingLifecycleCard — Shows listing lifecycle info with expiry, renew, boost controls.
 * All renew/boost actions route through paid Stripe Checkout.
 */
import { useState } from "react";
import { Clock, Zap, RefreshCw, ToggleLeft, ToggleRight, TrendingUp, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusChip } from "@/components/ui/system";
import { cleanUiText } from "@/lib/text-format";
import { createRenewalCheckout, createBoostCheckout, BOOST_TIER_INFO, RENEWAL_PRICE_AED, type BoostTier } from "@/lib/real-estate/listingCheckout";
import { setAutoRenew } from "@/lib/real-estate/renewListing";
import { toast } from "sonner";

interface ListingLifecycleProps {
  id: string;
  title: string;
  status?: string;
  active?: boolean;
  listing_expires_at?: string | null;
  auto_renew_enabled?: boolean;
  boost_enabled?: boolean;
  boost_multiplier?: number;
  boost_expires_at?: string | null;
  renewal_count?: number;
  onRefresh?: () => void;
}

function getDaysRemaining(expiresAt: string | null | undefined): number | null {
  if (!expiresAt) return null;
  const diff = new Date(expiresAt).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / 86400000));
}

function getLifecycleStatus(props: ListingLifecycleProps): {
  label: string;
  variant: "success" | "warning" | "neutral" | "destructive";
} {
  const days = getDaysRemaining(props.listing_expires_at);
  if (!props.active && props.status === "archived") return { label: "Archived", variant: "neutral" };
  if (!props.active && props.status === "draft") return { label: "Draft", variant: "neutral" };
  if (days !== null && days <= 0) return { label: "Expired", variant: "destructive" };
  if (days !== null && days <= 5) return { label: `Expires in ${days}d`, variant: "warning" };
  if (props.active) return { label: "Active", variant: "success" };
  return { label: props.status || "Unknown", variant: "neutral" };
}

export default function SellerListingLifecycleCard(props: ListingLifecycleProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const days = getDaysRemaining(props.listing_expires_at);
  const lifecycle = getLifecycleStatus(props);
  const boostActive = props.boost_enabled && props.boost_expires_at && new Date(props.boost_expires_at).getTime() > Date.now();
  const boostDays = getDaysRemaining(props.boost_expires_at);

  const handleRenew = async () => {
    setLoading("renew");
    try {
      const result = await createRenewalCheckout(props.id);
      if (result.success && result.url) {
        window.open(result.url, "_blank");
      } else {
        toast.error(result.error || "Could not start renewal");
      }
    } catch { toast.error("Renewal failed"); }
    finally { setLoading(null); }
  };

  const handleBoost = async (tier: BoostTier) => {
    setLoading(`boost_${tier}`);
    try {
      const result = await createBoostCheckout(props.id, tier);
      if (result.success && result.url) {
        window.open(result.url, "_blank");
      } else {
        toast.error(result.error || "Could not start boost");
      }
    } catch { toast.error("Boost failed"); }
    finally { setLoading(null); }
  };

  const handleAutoRenew = async () => {
    setLoading("autorenew");
    try {
      const newVal = !props.auto_renew_enabled;
      const result = await setAutoRenew(props.id, newVal);
      if (result.success) {
        toast.success(newVal ? "Auto-renew enabled" : "Auto-renew disabled");
        props.onRefresh?.();
      } else {
        toast.error(result.error || "Could not update");
      }
    } catch { toast.error("Failed"); }
    finally { setLoading(null); }
  };

  return (
    <div className="rounded-2xl border border-border/40 bg-card p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-bold text-foreground min-w-0 break-words leading-snug">{cleanUiText(props.title)}</h4>
        <StatusChip label={lifecycle.label} variant={lifecycle.variant as any} size="sm" />
      </div>

      {/* Expiry info */}
      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
        {days !== null && (
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            {days > 0 ? `${days} days remaining` : "Expired"}
          </span>
        )}
        {props.listing_expires_at && (
          <span>Expires: {new Date(props.listing_expires_at).toLocaleDateString()}</span>
        )}
        {(props.renewal_count ?? 0) > 0 && (
          <span>Renewed {props.renewal_count}x</span>
        )}
      </div>

      {/* Boost status */}
      {boostActive && (
        <div className="flex items-center gap-2 text-xs px-2 py-1.5 rounded-xl bg-primary/10 text-primary">
          <TrendingUp className="w-3.5 h-3.5" />
          <span>Boosted {props.boost_multiplier}x — {boostDays}d left</span>
        </div>
      )}

      {/* Warning */}
      {days !== null && days <= 5 && days > 0 && (
        <div className="flex items-center gap-2 text-xs px-2 py-1.5 rounded-xl bg-destructive/10 text-destructive">
          <AlertTriangle className="w-3.5 h-3.5" />
          <span>Listing expires soon! Renew to stay visible.</span>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        {/* Renew */}
        <Button
          variant="outline"
          size="sm"
          className="h-8 text-xs rounded-xl active:scale-[0.97]"
          onClick={handleRenew}
          disabled={loading === "renew"}
        >
          <RefreshCw className={`w-3.5 h-3.5 mr-1 ${loading === "renew" ? "animate-spin" : ""}`} />
          Renew ({RENEWAL_PRICE_AED} AED)
        </Button>

        {/* Auto-renew toggle */}
        <Button
          variant="ghost"
          size="sm"
          className="h-8 text-xs rounded-xl active:scale-[0.97]"
          onClick={handleAutoRenew}
          disabled={loading === "autorenew"}
        >
          {props.auto_renew_enabled ? (
            <ToggleRight className="w-3.5 h-3.5 mr-1 text-primary" />
          ) : (
            <ToggleLeft className="w-3.5 h-3.5 mr-1" />
          )}
          Auto-renew {props.auto_renew_enabled ? "ON" : "OFF"}
        </Button>
      </div>

      {/* Boost tiers */}
      {!boostActive && (
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground">Boost visibility</p>
          <div className="flex gap-2">
            {(Object.entries(BOOST_TIER_INFO) as [BoostTier, typeof BOOST_TIER_INFO["basic"]][]).map(([tier, info]) => (
              <Button
                key={tier}
                variant="outline"
                size="sm"
                className="h-7 text-[11px] rounded-lg active:scale-[0.97] flex-1"
                onClick={() => handleBoost(tier)}
                disabled={loading === `boost_${tier}`}
              >
                <Zap className={`w-3 h-3 mr-0.5 ${loading === `boost_${tier}` ? "animate-spin" : ""}`} />
                {info.label} ({info.priceAed} AED)
              </Button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
