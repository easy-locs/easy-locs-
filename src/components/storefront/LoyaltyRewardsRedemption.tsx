/**
 * LoyaltyRewardsRedemption — PASS118: Buyer redeems rewards from the catalog.
 * Connects to storefront_loyalty_rewards table.
 */
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Gift, Loader2, Star, Lock } from "lucide-react";
import { toast } from "sonner";

interface Props {
  shopId: string;
  programId: string;
  userPoints: number;
}

export default function LoyaltyRewardsRedemption({ shopId, programId, userPoints }: Props) {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: rewards = [], isLoading } = useQuery({
    queryKey: ["loyalty-rewards", shopId],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("storefront_loyalty_rewards")
        .select("*")
        .eq("shop_id", shopId)
        .eq("active", true)
        .order("points_cost");
      return data || [];
    },
  });

  const redeem = async (reward: any) => {
    if (!user) return toast.error("Sign in first");
    if (userPoints < reward.points_cost) return toast.error("Not enough points");

    // Deduct points
    const { error: pointsErr } = await (supabase as any)
      .from("storefront_loyalty_points")
      .update({ points: userPoints - reward.points_cost, updated_at: new Date().toISOString() })
      .eq("program_id", programId)
      .eq("user_id", user.id);

    if (pointsErr) return toast.error(pointsErr.message);

    // Log in history
    await (supabase as any).from("storefront_loyalty_history").insert({
      program_id: programId,
      user_id: user.id,
      points_change: -reward.points_cost,
      reason: `Redeemed: ${reward.title}`,
    });

    // Log transaction
    const { data: member } = await (supabase as any)
      .from("storefront_loyalty_members")
      .select("id")
      .eq("shop_id", shopId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (member) {
      await (supabase as any).from("storefront_loyalty_transactions").insert({
        shop_id: shopId,
        member_id: member.id,
        points: -reward.points_cost,
        type: "redeem",
        description: `Redeemed: ${reward.title}`,
      });
    }

    qc.invalidateQueries({ queryKey: ["my-loyalty-points"] });
    qc.invalidateQueries({ queryKey: ["my-loyalty-history"] });
    toast.success(`🎁 ${reward.title} redeemed!`);
  };

  if (isLoading) return <div className="py-2 text-center"><Loader2 className="h-4 w-4 animate-spin mx-auto text-muted-foreground" /></div>;
  if (rewards.length === 0) return null;

  return (
    <div className="space-y-2">
      <p className="text-[10px] font-semibold text-muted-foreground flex items-center gap-1">
        <Gift className="h-3 w-3" /> Rewards Catalog
      </p>
      {rewards.map((r: any) => {
        const canRedeem = userPoints >= r.points_cost;
        return (
          <Card key={r.id} className={!canRedeem ? "opacity-50" : ""}>
            <CardContent className="p-3 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-lg">{r.emoji || "🎁"}</span>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-foreground truncate">{r.title}</p>
                  <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                    <Star className="h-2.5 w-2.5" /> {r.points_cost} pts
                    {r.discount_type === "percent" && <span>• {r.discount_value}% off</span>}
                    {r.discount_type === "fixed" && <span>• {r.discount_value} off</span>}
                  </p>
                </div>
              </div>
              <Button size="sm" className="h-7 text-[10px] shrink-0" disabled={!canRedeem} onClick={() => redeem(r)}>
                {canRedeem ? <><Gift className="h-3 w-3 mr-1" /> Redeem</> : <><Lock className="h-3 w-3 mr-1" /> {r.points_cost - userPoints} more</>}
              </Button>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
