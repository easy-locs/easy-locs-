/**
 * LoyaltyPointsEngine — ORBIT V1: Points system, VIP tiers, rewards.
 * Seller: configure rewards, view members, manage tiers.
 * Buyer: view balance, redeem rewards, track history.
 */
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Star, Gift, Trophy, Crown, Plus, Loader2, ArrowUp, ArrowDown } from "lucide-react";
import { toast } from "sonner";

interface Props { shopId: string; mode?: "seller" | "buyer"; }

const VIP_TIERS = [
  { id: "bronze", label: "Bronze", min: 0, color: "text-orange-600", icon: "🥉" },
  { id: "silver", label: "Silver", min: 500, color: "text-gray-400", icon: "🥈" },
  { id: "gold", label: "Gold", min: 2000, color: "text-yellow-500", icon: "🥇" },
  { id: "platinum", label: "Platinum", min: 5000, color: "text-blue-400", icon: "💎" },
];

function getTier(points: number) {
  return [...VIP_TIERS].reverse().find(t => points >= t.min) || VIP_TIERS[0];
}

function getNextTier(points: number) {
  const idx = VIP_TIERS.findIndex(t => t.min > points);
  return idx >= 0 ? VIP_TIERS[idx] : null;
}

export default function LoyaltyPointsEngine({ shopId, mode = "buyer" }: Props) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [creatingReward, setCreatingReward] = useState(false);
  const [rewardForm, setRewardForm] = useState({ name: "", description: "", points_cost: "", reward_value: "" });
  const [saving, setSaving] = useState(false);

  const { data: myPoints } = useQuery({
    queryKey: ["loyalty-pts", shopId, user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await (supabase as any).from("storefront_loyalty_points")
        .select("*").eq("shop_id", shopId).eq("user_id", user.id).maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const { data: history = [] } = useQuery({
    queryKey: ["loyalty-hist", shopId, user?.id],
    queryFn: async () => {
      if (!user) return [];
      const q = (supabase as any).from("storefront_loyalty_history").select("*").eq("shop_id", shopId);
      if (mode === "buyer") q.eq("user_id", user.id);
      const { data } = await q.order("created_at", { ascending: false }).limit(20);
      return data || [];
    },
    enabled: !!user,
  });

  const { data: rewards = [] } = useQuery({
    queryKey: ["loyalty-rewards-v2", shopId],
    queryFn: async () => {
      const { data } = await (supabase as any).from("storefront_loyalty_rewards")
        .select("*").eq("shop_id", shopId).eq("active", true).order("points_cost");
      return data || [];
    },
  });

  const { data: allMembers = [] } = useQuery({
    queryKey: ["loyalty-members", shopId],
    queryFn: async () => {
      const { data } = await (supabase as any).from("storefront_loyalty_points")
        .select("*").eq("shop_id", shopId).order("lifetime_earned", { ascending: false }).limit(50);
      return data || [];
    },
    enabled: mode === "seller",
  });

  const ensurePoints = async () => {
    if (!user) return null;
    if (myPoints) return myPoints;
    const { data } = await (supabase as any).from("storefront_loyalty_points").upsert({
      shop_id: shopId, user_id: user.id, balance: 0, lifetime_earned: 0, lifetime_redeemed: 0,
    }, { onConflict: "shop_id,user_id" }).select().single();
    qc.invalidateQueries({ queryKey: ["loyalty-pts", shopId, user?.id] });
    return data;
  };

  const redeemReward = async (reward: any) => {
    if (!user) return;
    const pts = await ensurePoints();
    if (!pts || pts.balance < reward.points_cost) {
      toast.error("Not enough points");
      return;
    }

    await (supabase as any).from("storefront_loyalty_points").update({
      balance: pts.balance - reward.points_cost,
      lifetime_redeemed: (pts.lifetime_redeemed || 0) + reward.points_cost,
      updated_at: new Date().toISOString(),
    }).eq("id", pts.id);

    await (supabase as any).from("storefront_loyalty_history").insert({
      points_id: pts.id, shop_id: shopId, user_id: user.id,
      action: "redeem", points: -reward.points_cost,
      description: `Redeemed: ${reward.name}`,
    });

    await (supabase as any).from("storefront_loyalty_rewards").update({
      current_redemptions: (reward.current_redemptions || 0) + 1,
    }).eq("id", reward.id);

    qc.invalidateQueries({ queryKey: ["loyalty-pts", shopId, user?.id] });
    qc.invalidateQueries({ queryKey: ["loyalty-hist", shopId, user?.id] });
    toast.success(`Redeemed: ${reward.name}!`);
  };

  const createReward = async () => {
    if (!user || !rewardForm.name || !rewardForm.points_cost) return;
    setSaving(true);
    try {
      await (supabase as any).from("storefront_loyalty_rewards").insert({
        shop_id: shopId, user_id: user.id,
        name: rewardForm.name, description: rewardForm.description || null,
        points_cost: parseInt(rewardForm.points_cost),
        reward_value: parseFloat(rewardForm.reward_value) || 0,
      });
      qc.invalidateQueries({ queryKey: ["loyalty-rewards-v2", shopId] });
      setRewardForm({ name: "", description: "", points_cost: "", reward_value: "" });
      setCreatingReward(false);
      toast.success("Reward created");
    } catch { toast.error("Failed"); } finally { setSaving(false); }
  };

  if (mode === "buyer") {
    const balance = myPoints?.balance || 0;
    const lifetime = myPoints?.lifetime_earned || 0;
    const tier = getTier(lifetime);
    const nextTier = getNextTier(lifetime);
    const progress = nextTier ? ((lifetime - tier.min) / (nextTier.min - tier.min)) * 100 : 100;

    return (
      <div className="space-y-3">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Star className="h-4 w-4 text-primary" /> Loyalty Points
        </h3>

        {/* Points balance card */}
        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-foreground">{balance.toLocaleString()}</p>
                <p className="text-[10px] text-muted-foreground">Available points</p>
              </div>
              <div className="text-right">
                <p className="text-lg">{tier.icon}</p>
                <p className={`text-xs font-bold ${tier.color}`}>{tier.label}</p>
              </div>
            </div>
            {nextTier && (
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span>{tier.label}</span>
                  <span>{nextTier.label} ({nextTier.min - lifetime} pts to go)</span>
                </div>
                <Progress value={progress} className="h-1.5" />
              </div>
            )}
            <p className="text-[10px] text-muted-foreground">Lifetime earned: {lifetime.toLocaleString()} pts</p>
          </CardContent>
        </Card>

        {/* Available rewards */}
        {rewards.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold flex items-center gap-1"><Gift className="h-3 w-3" /> Available Rewards</p>
            {rewards.map((r: any) => {
              const canRedeem = balance >= r.points_cost;
              return (
                <Card key={r.id} className={canRedeem ? "" : "opacity-60"}>
                  <CardContent className="p-3 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{r.name}</p>
                      {r.description && <p className="text-[10px] text-muted-foreground">{r.description}</p>}
                      <p className="text-xs text-primary font-bold">{r.points_cost} pts</p>
                    </div>
                    <Button size="sm" variant="outline" className="text-xs" disabled={!canRedeem} onClick={() => redeemReward(r)}>
                      Redeem
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* History */}
        {history.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-xs font-semibold">History</p>
            {history.map((h: any) => (
              <div key={h.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/30 text-xs">
                <div className="flex items-center gap-2">
                  {h.points > 0 ? <ArrowUp className="h-3 w-3 text-primary" /> : <ArrowDown className="h-3 w-3 text-destructive" />}
                  <span>{h.description || h.action}</span>
                </div>
                <span className={h.points > 0 ? "text-primary font-bold" : "text-destructive font-bold"}>
                  {h.points > 0 ? "+" : ""}{h.points}
                </span>
              </div>
            ))}
          </div>
        )}

        {!myPoints && (
          <Button size="sm" variant="outline" className="w-full text-xs" onClick={ensurePoints}>
            Join Loyalty Program
          </Button>
        )}
      </div>
    );
  }

  // Seller mode
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Trophy className="h-4 w-4 text-primary" /> Loyalty Engine
        </h3>
        <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={() => setCreatingReward(!creatingReward)}>
          <Plus className="h-3 w-3" /> Add Reward
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: "Members", value: allMembers.length },
          { label: "Total Earned", value: allMembers.reduce((s: number, m: any) => s + (m.lifetime_earned || 0), 0).toLocaleString() },
          { label: "Total Redeemed", value: allMembers.reduce((s: number, m: any) => s + (m.lifetime_redeemed || 0), 0).toLocaleString() },
        ].map(s => (
          <Card key={s.label}>
            <CardContent className="p-3 text-center">
              <p className="text-sm font-bold">{s.value}</p>
              <p className="text-[10px] text-muted-foreground">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {creatingReward && (
        <Card>
          <CardContent className="p-4 space-y-3">
            <div>
              <Label className="text-xs">Reward Name</Label>
              <Input value={rewardForm.name} onChange={e => setRewardForm({ ...rewardForm, name: e.target.value })} className="mt-1" placeholder="10% Discount" />
            </div>
            <div>
              <Label className="text-xs">Description</Label>
              <Input value={rewardForm.description} onChange={e => setRewardForm({ ...rewardForm, description: e.target.value })} className="mt-1" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Points Cost</Label>
                <Input type="number" value={rewardForm.points_cost} onChange={e => setRewardForm({ ...rewardForm, points_cost: e.target.value })} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs">Discount Value (€)</Label>
                <Input type="number" value={rewardForm.reward_value} onChange={e => setRewardForm({ ...rewardForm, reward_value: e.target.value })} className="mt-1" />
              </div>
            </div>
            <Button size="sm" className="w-full" onClick={createReward} disabled={saving}>
              {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : "Create Reward"}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Rewards list */}
      {rewards.map((r: any) => (
        <Card key={r.id}>
          <CardContent className="p-3 flex items-center gap-3">
            <Gift className="h-4 w-4 text-primary shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">{r.name}</p>
              <p className="text-[10px] text-muted-foreground">{r.points_cost} pts · {r.current_redemptions || 0} redeemed</p>
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Top members */}
      {allMembers.length > 0 && (
        <Card>
          <CardContent className="p-3">
            <p className="text-xs font-semibold mb-2">Top Members</p>
            {allMembers.slice(0, 5).map((m: any, i: number) => {
              const tier = getTier(m.lifetime_earned || 0);
              return (
                <div key={m.id} className="flex items-center justify-between py-1 text-xs">
                  <div className="flex items-center gap-2">
                    <span>{tier.icon}</span>
                    <span className="text-muted-foreground">{m.user_id?.slice(0, 8)}...</span>
                  </div>
                  <span className="font-bold">{(m.lifetime_earned || 0).toLocaleString()} pts</span>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
