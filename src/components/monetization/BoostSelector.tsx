/**
 * BoostSelector — PASS141: UI for merchants to boost their listings with LOCS.
 * Clean 3-tier selection with instant purchase.
 */
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Zap, Crown, Loader2 } from "lucide-react";
import { useBoostPurchase, BOOST_TIERS, type BoostTier } from "@/hooks/useBoostPurchase";
import { formatLocs } from "@/lib/locs-wallet";

interface BoostSelectorProps {
  targetType: string;
  targetId: string;
  shopId?: string;
  onSuccess?: () => void;
}

const TIER_ICONS = {
  basic: Zap,
  premium: Sparkles,
  featured: Crown,
} as const;

const TIER_COLORS = {
  basic: "border-muted",
  premium: "border-primary/40",
  featured: "border-primary",
} as const;

export function BoostSelector({ targetType, targetId, shopId, onSuccess }: BoostSelectorProps) {
  const { purchaseBoost, purchasing } = useBoostPurchase();
  const [selected, setSelected] = useState<BoostTier>("basic");

  const handlePurchase = async () => {
    const result = await purchaseBoost({ targetType, targetId, shopId, tier: selected });
    if (result.success) onSuccess?.();
  };

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-foreground">Boost this listing</p>
      <div className="grid grid-cols-3 gap-2">
        {(Object.keys(BOOST_TIERS) as BoostTier[]).map((tier) => {
          const config = BOOST_TIERS[tier];
          const Icon = TIER_ICONS[tier];
          const isSelected = selected === tier;

          return (
            <Card
              key={tier}
              className={`cursor-pointer transition-all ${TIER_COLORS[tier]} ${
                isSelected ? "ring-2 ring-primary shadow-md" : "hover:shadow-sm"
              }`}
              onClick={() => setSelected(tier)}
            >
              <CardContent className="p-3 text-center space-y-1.5">
                <Icon className={`h-5 w-5 mx-auto ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
                <p className="text-xs font-semibold capitalize">{tier}</p>
                <Badge variant="outline" className="text-[10px] px-1.5">
                  {config.durationDays}d
                </Badge>
                <p className="text-sm font-bold text-primary">{config.locs} LOCS</p>
                <p className="text-[10px] text-muted-foreground">{config.impressions.toLocaleString()} views</p>
              </CardContent>
            </Card>
          );
        })}
      </div>
      <Button
        className="w-full"
        onClick={handlePurchase}
        disabled={purchasing}
      >
        {purchasing ? (
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
        ) : (
          <Sparkles className="h-4 w-4 mr-2" />
        )}
        Boost for {formatLocs(BOOST_TIERS[selected].locs)}
      </Button>
    </div>
  );
}
