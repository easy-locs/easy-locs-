/**
 * TrustScoreBadge — PASS117: Shows seller trust score + badges.
 * Auto-computed in DB from reviews, orders, account age, verification.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Shield, ShieldCheck, ShieldAlert, Star, Clock, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Props {
  shopId: string;
  compact?: boolean;
}

const TRUST_LEVELS = [
  { min: 0, label: "New", color: "text-muted-foreground", bg: "bg-muted/30", icon: Shield },
  { min: 25, label: "Emerging", color: "text-warning", bg: "bg-warning/10", icon: Shield },
  { min: 50, label: "Trusted", color: "text-primary", bg: "bg-primary/10", icon: ShieldCheck },
  { min: 75, label: "Highly Trusted", color: "text-success", bg: "bg-success/10", icon: ShieldCheck },
  { min: 90, label: "Top Seller", color: "text-success", bg: "bg-success/15", icon: ShieldCheck },
];

export default function TrustScoreBadge({ shopId, compact = false }: Props) {
  const { data: trust } = useQuery({
    queryKey: ["trust-score", shopId],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("storefront_trust_scores")
        .select("*")
        .eq("shop_id", shopId)
        .maybeSingle();
      return data;
    },
  });

  if (!trust) {
    if (compact) return null;
    return (
      <Badge variant="outline" className="text-[10px] gap-1">
        <Shield className="h-3 w-3" /> New Seller
      </Badge>
    );
  }

  const level = [...TRUST_LEVELS].reverse().find(l => trust.trust_score >= l.min) || TRUST_LEVELS[0];
  const Icon = level.icon;

  if (compact) {
    return (
      <Badge variant="outline" className={`text-[10px] gap-1 ${level.color} border-current/20`}>
        <Icon className="h-3 w-3" /> {trust.trust_score}
      </Badge>
    );
  }

  return (
    <div className={`rounded-xl p-3 ${level.bg} space-y-2`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className={`h-5 w-5 ${level.color}`} />
          <div>
            <p className="text-xs font-bold text-foreground">{level.label}</p>
            <p className="text-[10px] text-muted-foreground">Trust Score: {trust.trust_score}/100</p>
          </div>
        </div>
        <span className={`text-2xl font-black ${level.color}`}>{trust.trust_score}</span>
      </div>

      {/* Trust breakdown */}
      <div className="grid grid-cols-3 gap-2 pt-1">
        <div className="text-center">
          <Star className="h-3 w-3 mx-auto text-warning mb-0.5" />
          <p className="text-[10px] font-bold text-foreground">{Number(trust.avg_rating).toFixed(1)}</p>
          <p className="text-[8px] text-muted-foreground">{trust.total_reviews} reviews</p>
        </div>
        <div className="text-center">
          <CheckCircle2 className="h-3 w-3 mx-auto text-success mb-0.5" />
          <p className="text-[10px] font-bold text-foreground">
            {trust.total_orders > 0 ? Math.round((trust.completed_orders / trust.total_orders) * 100) : 0}%
          </p>
          <p className="text-[8px] text-muted-foreground">Completion</p>
        </div>
        <div className="text-center">
          <Clock className="h-3 w-3 mx-auto text-primary mb-0.5" />
          <p className="text-[10px] font-bold text-foreground">{trust.account_age_days}d</p>
          <p className="text-[8px] text-muted-foreground">Active</p>
        </div>
      </div>

      {trust.verified_identity && (
        <Badge className="text-[9px] bg-success/20 text-success border-0 w-full justify-center">
          <ShieldCheck className="h-3 w-3 mr-1" /> Identity Verified
        </Badge>
      )}
    </div>
  );
}
