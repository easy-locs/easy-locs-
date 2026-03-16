/**
 * LoyaltyProgram — Points, tiers, rewards catalog, birthday bonuses, gamification.
 * Seller: manage rewards, view members. Buyer: view points, redeem rewards.
 */
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Star, Crown, Gift, Cake, Trophy, Loader2, Plus, Sparkles } from "lucide-react";
import { toast } from "sonner";

interface Props {
  shopId: string;
  mode: "seller" | "buyer";
}

const TIER_CONFIG = {
  bronze: { label: "Bronze", color: "text-orange-600", icon: Star, next: "silver", nextAt: 1000 },
  silver: { label: "Silver", color: "text-slate-400", icon: Star, next: "gold", nextAt: 5000 },
  gold: { label: "Gold", color: "text-yellow-500", icon: Crown, next: "platinum", nextAt: 10000 },
  platinum: { label: "Platinum", color: "text-purple-500", icon: Crown, next: null, nextAt: null },
};

export default function LoyaltyProgram({ shopId, mode }: Props) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [creatingReward, setCreatingReward] = useState(false);
  const [rewardTitle, setRewardTitle] = useState("");
  const [rewardPoints, setRewardPoints] = useState("100");
  const [rewardValue, setRewardValue] = useState("5");

  // Get or create membership
  const { data: membership, isLoading: memberLoading } = useQuery({
    queryKey: ["loyalty-member", shopId, user?.id],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("storefront_loyalty_members")
        .select("*")
        .eq("shop_id", shopId)
        .eq("user_id", user!.id)
        .maybeSingle();
      return data;
    },
    enabled: !!shopId && !!user && mode === "buyer",
  });

  const { data: members = [] } = useQuery({
    queryKey: ["loyalty-members-all", shopId],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("storefront_loyalty_members")
        .select("*")
        .eq("shop_id", shopId)
        .order("lifetime_points", { ascending: false })
        .limit(50);
      return data || [];
    },
    enabled: !!shopId && mode === "seller",
  });

  const { data: rewards = [] } = useQuery({
    queryKey: ["loyalty-rewards", shopId],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("storefront_loyalty_rewards")
        .select("*")
        .eq("shop_id", shopId)
        .eq("active", true)
        .order("points_required");
      return data || [];
    },
    enabled: !!shopId,
  });

  const { data: history = [] } = useQuery({
    queryKey: ["loyalty-history", membership?.id],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("storefront_loyalty_transactions")
        .select("*")
        .eq("member_id", membership!.id)
        .order("created_at", { ascending: false })
        .limit(20);
      return data || [];
    },
    enabled: !!membership?.id,
  });

  const joinProgram = useMutation({
    mutationFn: async () => {
      await (supabase as any).from("storefront_loyalty_members").insert({
        shop_id: shopId,
        user_id: user!.id,
        points: 50,
        lifetime_points: 50,
      });
      // Welcome bonus transaction
      const { data: member } = await (supabase as any)
        .from("storefront_loyalty_members")
        .select("id")
        .eq("shop_id", shopId)
        .eq("user_id", user!.id)
        .single();
      if (member) {
        await (supabase as any).from("storefront_loyalty_transactions").insert({
          member_id: member.id,
          shop_id: shopId,
          points: 50,
          type: "bonus",
          description: "Welcome bonus! 🎉",
        });
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["loyalty-member"] }); toast.success("Welcome! +50 bonus points 🎉"); },
  });

  const createReward = useMutation({
    mutationFn: async () => {
      if (!rewardTitle.trim()) throw new Error("Title required");
      await (supabase as any).from("storefront_loyalty_rewards").insert({
        shop_id: shopId,
        title: rewardTitle,
        points_required: parseInt(rewardPoints) || 100,
        reward_value: parseFloat(rewardValue) || 0,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["loyalty-rewards"] });
      toast.success("Reward created!");
      setCreatingReward(false);
      setRewardTitle("");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const redeemReward = useMutation({
    mutationFn: async (reward: any) => {
      if (!membership || membership.points < reward.points_required) throw new Error("Not enough points");
      // Deduct points
      await (supabase as any).from("storefront_loyalty_members").update({
        points: membership.points - reward.points_required,
      }).eq("id", membership.id);
      // Record transaction
      await (supabase as any).from("storefront_loyalty_transactions").insert({
        member_id: membership.id,
        shop_id: shopId,
        points: -reward.points_required,
        type: "redeem",
        description: `Redeemed: ${reward.title}`,
      });
      // Increment redemption count
      await (supabase as any).from("storefront_loyalty_rewards").update({
        current_redemptions: (reward.current_redemptions || 0) + 1,
      }).eq("id", reward.id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["loyalty-member", "loyalty-rewards", "loyalty-history"] });
      toast.success("Reward redeemed! 🎁");
    },
    onError: (e: any) => toast.error(e.message),
  });

  if (memberLoading) return <Card><CardContent className="py-8 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></CardContent></Card>;

  // Buyer: not yet a member
  if (mode === "buyer" && !membership) {
    return (
      <Card>
        <CardContent className="p-6 text-center space-y-3">
          <Trophy className="h-10 w-10 text-primary mx-auto" />
          <h3 className="text-sm font-bold">Join Loyalty Program</h3>
          <p className="text-xs text-muted-foreground">Earn points with every purchase. Unlock exclusive rewards!</p>
          <Button size="sm" onClick={() => joinProgram.mutate()} disabled={joinProgram.isPending}>
            {joinProgram.isPending ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Sparkles className="h-3 w-3 mr-1" />}
            Join & Get 50 Bonus Points
          </Button>
        </CardContent>
      </Card>
    );
  }

  const tierInfo = membership ? TIER_CONFIG[membership.tier as keyof typeof TIER_CONFIG] : null;
  const TierIcon = tierInfo?.icon || Star;
  const progress = tierInfo?.nextAt ? Math.min(100, ((membership?.lifetime_points || 0) / tierInfo.nextAt) * 100) : 100;

  return (
    <Card>
      <CardContent className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold flex items-center gap-2">
            <Trophy className="h-4 w-4 text-primary" />
            {mode === "seller" ? "Loyalty Program" : "My Loyalty"}
          </h3>
          {mode === "seller" && (
            <Badge variant="outline" className="text-[10px]">{members.length} members</Badge>
          )}
        </div>

        {/* Buyer: membership card */}
        {mode === "buyer" && membership && (
          <div className="rounded-2xl bg-gradient-to-br from-primary to-primary/80 p-4 text-primary-foreground">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <TierIcon className={`h-5 w-5 ${tierInfo?.color || ""}`} />
                <span className="text-xs font-bold uppercase">{tierInfo?.label} Member</span>
              </div>
              <span className="text-2xl font-black">{membership.points}</span>
            </div>
            <p className="text-[10px] opacity-70">Points available</p>
            {tierInfo?.nextAt && (
              <div className="mt-3">
                <div className="flex justify-between text-[10px] opacity-70 mb-1">
                  <span>{membership.lifetime_points} lifetime pts</span>
                  <span>Next: {tierInfo.next} ({tierInfo.nextAt})</span>
                </div>
                <Progress value={progress} className="h-1.5" />
              </div>
            )}
          </div>
        )}

        {/* Rewards catalog */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-semibold">Rewards</h4>
            {mode === "seller" && !creatingReward && (
              <Button size="sm" variant="ghost" className="h-6 text-[10px]" onClick={() => setCreatingReward(true)}>
                <Plus className="h-3 w-3 mr-1" /> Add
              </Button>
            )}
          </div>

          {creatingReward && (
            <div className="space-y-2 p-3 rounded-xl border border-border bg-muted/20 mb-3">
              <Input value={rewardTitle} onChange={e => setRewardTitle(e.target.value)} placeholder="Reward name" className="h-8 text-xs" />
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-[10px]">Points Required</Label>
                  <Input type="number" value={rewardPoints} onChange={e => setRewardPoints(e.target.value)} className="h-8 text-xs mt-1" />
                </div>
                <div>
                  <Label className="text-[10px]">Value (EUR)</Label>
                  <Input type="number" value={rewardValue} onChange={e => setRewardValue(e.target.value)} className="h-8 text-xs mt-1" />
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" className="h-7 text-[10px] flex-1" disabled={createReward.isPending} onClick={() => createReward.mutate()}>Create</Button>
                <Button size="sm" variant="ghost" className="h-7 text-[10px]" onClick={() => setCreatingReward(false)}>Cancel</Button>
              </div>
            </div>
          )}

          {rewards.length === 0 ? (
            <p className="text-[10px] text-muted-foreground text-center py-3">No rewards available</p>
          ) : (
            <div className="space-y-1.5">
              {rewards.map((r: any) => {
                const canRedeem = mode === "buyer" && membership && membership.points >= r.points_required;
                return (
                  <div key={r.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/30 border border-border">
                    <Gift className="h-4 w-4 text-primary shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium">{r.title}</p>
                      <p className="text-[10px] text-muted-foreground">{r.points_required} pts • {r.reward_value} EUR value</p>
                    </div>
                    {mode === "buyer" && (
                      <Button
                        size="sm"
                        variant={canRedeem ? "default" : "outline"}
                        className="h-7 text-[10px]"
                        disabled={!canRedeem || redeemReward.isPending}
                        onClick={() => redeemReward.mutate(r)}
                      >
                        Redeem
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Buyer: recent history */}
        {mode === "buyer" && history.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold mb-2">Recent Activity</h4>
            <div className="space-y-1">
              {history.slice(0, 5).map((tx: any) => (
                <div key={tx.id} className="flex items-center justify-between text-[10px] px-2 py-1.5 rounded bg-muted/20">
                  <span className="text-muted-foreground">{tx.description || tx.type}</span>
                  <span className={tx.points > 0 ? "text-success font-bold" : "text-destructive font-bold"}>
                    {tx.points > 0 ? "+" : ""}{tx.points}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Seller: member list */}
        {mode === "seller" && members.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold mb-2">Top Members</h4>
            <div className="space-y-1">
              {members.slice(0, 10).map((m: any, i: number) => (
                <div key={m.id} className="flex items-center gap-2 text-[10px] px-2 py-1.5 rounded bg-muted/20">
                  <span className="text-muted-foreground w-4">{i + 1}.</span>
                  <span className="flex-1 font-mono">{m.user_id.slice(0, 8)}</span>
                  <Badge className={`text-[8px] ${TIER_CONFIG[m.tier as keyof typeof TIER_CONFIG]?.color || ""}`}>{m.tier}</Badge>
                  <span className="font-bold">{m.lifetime_points} pts</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
