/**
 * LoyaltyRewards — Points, tiers, cashback, rewards management
 * Seller: configure program, view members
 * Buyer: view points, tier, redeem rewards
 */
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Crown, Star, Gift, TrendingUp, Users, Loader2, Coins, ArrowUpRight, Trophy } from "lucide-react";
import { toast } from "sonner";

interface Props {
  shopId: string;
  mode: "seller" | "buyer";
}

const TIER_COLORS: Record<string, string> = {
  Bronze: "bg-amber-700/20 text-amber-700",
  Silver: "bg-slate-400/20 text-slate-500",
  Gold: "bg-yellow-500/20 text-yellow-600",
  Platinum: "bg-purple-500/20 text-purple-600",
};

export default function LoyaltyRewards({ shopId, mode }: Props) {
  const { user } = useAuth();
  const qc = useQueryClient();

  // Load program config
  const { data: program, isLoading: loadingProgram } = useQuery({
    queryKey: ["loyalty-program-v2", shopId],
    queryFn: async () => {
      const { data } = await (supabase as any).from("storefront_loyalty_programs")
        .select("*").eq("shop_id", shopId).maybeSingle();
      return data;
    },
  });

  // Load membership (buyer)
  const { data: membership } = useQuery({
    queryKey: ["loyalty-member-v2", shopId, user?.id],
    queryFn: async () => {
      const { data } = await (supabase as any).from("storefront_loyalty_members")
        .select("*").eq("shop_id", shopId).eq("user_id", user!.id).maybeSingle();
      return data;
    },
    enabled: mode === "buyer" && !!user,
  });

  // Load transactions
  const { data: transactions = [] } = useQuery({
    queryKey: ["loyalty-tx-v2", shopId, user?.id],
    queryFn: async () => {
      const query = (supabase as any).from("storefront_loyalty_transactions")
        .select("*").eq("shop_id", shopId).order("created_at", { ascending: false }).limit(20);
      if (mode === "buyer") query.eq("user_id", user!.id);
      const { data } = await query;
      return data || [];
    },
    enabled: !!user,
  });

  // Seller: members list
  const { data: members = [] } = useQuery({
    queryKey: ["loyalty-members-list", shopId],
    queryFn: async () => {
      const { data } = await (supabase as any).from("storefront_loyalty_members")
        .select("*").eq("shop_id", shopId).order("lifetime_points", { ascending: false }).limit(50);
      return data || [];
    },
    enabled: mode === "seller",
  });

  // SELLER: Setup / update program
  const [setupForm, setSetupForm] = useState({ pointsPerCurrency: 1, cashbackEnabled: false, cashbackPercent: 2 });

  const setupMutation = useMutation({
    mutationFn: async () => {
      if (program) {
        await (supabase as any).from("storefront_loyalty_programs").update({
          points_per_currency: setupForm.pointsPerCurrency,
          cashback_enabled: setupForm.cashbackEnabled,
          cashback_percent: setupForm.cashbackPercent,
          updated_at: new Date().toISOString(),
        }).eq("id", program.id);
      } else {
        await (supabase as any).from("storefront_loyalty_programs").insert({
          shop_id: shopId,
          user_id: user!.id,
          points_per_currency: setupForm.pointsPerCurrency,
          cashback_enabled: setupForm.cashbackEnabled,
          cashback_percent: setupForm.cashbackPercent,
        });
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["loyalty-program-v2", shopId] }); toast.success("Loyalty program saved"); },
  });

  // BUYER: Join program
  const joinMutation = useMutation({
    mutationFn: async () => {
      await (supabase as any).from("storefront_loyalty_members").insert({
        shop_id: shopId, user_id: user!.id,
      });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["loyalty-member-v2"] }); toast.success("Joined loyalty program!"); },
  });

  // BUYER: Redeem points
  const [redeemAmount, setRedeemAmount] = useState("");
  const redeemMutation = useMutation({
    mutationFn: async (pts: number) => {
      if (!membership || membership.points < pts) throw new Error("Not enough points");
      await (supabase as any).from("storefront_loyalty_members").update({
        points: membership.points - pts, updated_at: new Date().toISOString(),
      }).eq("id", membership.id);
      await (supabase as any).from("storefront_loyalty_transactions").insert({
        shop_id: shopId, user_id: user!.id, type: "redeem", points: -pts, description: `Redeemed ${pts} points`,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["loyalty-member-v2"] });
      qc.invalidateQueries({ queryKey: ["loyalty-tx-v2"] });
      setRedeemAmount("");
      toast.success("Points redeemed!");
    },
  });

  if (loadingProgram) return <div className="py-4 text-center"><Loader2 className="h-4 w-4 animate-spin mx-auto text-muted-foreground" /></div>;

  const tiers = program?.tiers || [];

  // ═══════ SELLER VIEW ═══════
  if (mode === "seller") {
    return (
      <div className="space-y-4">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Crown className="h-4 w-4 text-yellow-500" /> Loyalty & Rewards
        </h3>

        <Card>
          <CardContent className="p-4 space-y-3">
            <h4 className="text-xs font-semibold text-muted-foreground">Program Configuration</h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-[10px]">Points per 1€ spent</Label>
                <Input type="number" min={1} value={setupForm.pointsPerCurrency}
                  onChange={e => setSetupForm(p => ({ ...p, pointsPerCurrency: Number(e.target.value) }))}
                  className="mt-1 h-8 text-xs" />
              </div>
              <div>
                <Label className="text-[10px]">Cashback %</Label>
                <Input type="number" min={0} max={50} value={setupForm.cashbackPercent}
                  onChange={e => setSetupForm(p => ({ ...p, cashbackPercent: Number(e.target.value) }))}
                  className="mt-1 h-8 text-xs" disabled={!setupForm.cashbackEnabled} />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={setupForm.cashbackEnabled} onCheckedChange={v => setSetupForm(p => ({ ...p, cashbackEnabled: v }))} />
              <span className="text-xs">Enable LOCS cashback</span>
            </div>
            <Button size="sm" className="w-full" onClick={() => setupMutation.mutate()} disabled={setupMutation.isPending}>
              {program ? "Update Program" : "Activate Program"}
            </Button>
          </CardContent>
        </Card>

        {/* Tiers */}
        {tiers.length > 0 && (
          <Card>
            <CardContent className="p-4 space-y-2">
              <h4 className="text-xs font-semibold text-muted-foreground">Tier Levels</h4>
              {tiers.map((t: any, i: number) => (
                <div key={i} className="flex items-center justify-between">
                  <Badge className={`text-[10px] ${TIER_COLORS[t.name] || ""}`}>{t.name}</Badge>
                  <span className="text-[10px] text-muted-foreground">{t.min_points}+ pts → {t.discount_percent}% discount</span>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Members */}
        <Card>
          <CardContent className="p-4 space-y-2">
            <h4 className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
              <Users className="h-3 w-3" /> Members ({members.length})
            </h4>
            {members.slice(0, 10).map((m: any, i: number) => (
              <div key={m.id} className="flex items-center justify-between text-[11px]">
                <span className="text-muted-foreground">#{i + 1} {m.user_id?.slice(0, 8)}...</span>
                <div className="flex items-center gap-2">
                  <Badge className={`text-[9px] ${TIER_COLORS[m.tier] || ""}`}>{m.tier}</Badge>
                  <span className="font-medium">{m.lifetime_points} pts</span>
                </div>
              </div>
            ))}
            {members.length === 0 && <p className="text-[10px] text-muted-foreground text-center py-2">No members yet</p>}
          </CardContent>
        </Card>
      </div>
    );
  }

  // ═══════ BUYER VIEW ═══════
  if (!program || !program.active) {
    return null; // No loyalty program for this shop
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold flex items-center gap-2">
        <Crown className="h-4 w-4 text-yellow-500" /> Loyalty Rewards
      </h3>

      {!membership ? (
        <Card>
          <CardContent className="p-4 text-center space-y-3">
            <Trophy className="h-8 w-8 text-yellow-500 mx-auto" />
            <p className="text-sm font-medium">Join the loyalty program</p>
            <p className="text-xs text-muted-foreground">Earn {program.points_per_currency} point per 1€ spent</p>
            <Button size="sm" onClick={() => joinMutation.mutate()} disabled={joinMutation.isPending}>
              {joinMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Star className="h-3 w-3 mr-1" />}
              Join Now
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Points card */}
          <Card className="overflow-hidden">
            <CardContent className="p-0">
              <div className="bg-gradient-to-br from-primary to-primary/80 p-4 text-primary-foreground">
                <div className="flex items-center justify-between mb-2">
                  <Badge className={`text-[10px] ${TIER_COLORS[membership.tier] || "bg-muted"}`}>{membership.tier}</Badge>
                  <Coins className="h-4 w-4 opacity-60" />
                </div>
                <p className="text-2xl font-black">{membership.points} pts</p>
                <p className="text-[10px] opacity-60 mt-1">Lifetime: {membership.lifetime_points} pts</p>
                {membership.cashback_balance > 0 && (
                  <p className="text-xs mt-1 flex items-center gap-1">
                    <Gift className="h-3 w-3" /> Cashback: {membership.cashback_balance.toFixed(2)} LOCS
                  </p>
                )}
              </div>

              {/* Quick redeem */}
              <div className="p-3 space-y-2">
                <div className="flex gap-2">
                  <Input type="number" min={1} max={membership.points} placeholder="Points to redeem"
                    value={redeemAmount} onChange={e => setRedeemAmount(e.target.value)}
                    className="h-8 text-xs flex-1" />
                  <Button size="sm" variant="outline" className="h-8 text-xs"
                    disabled={!redeemAmount || Number(redeemAmount) > membership.points || redeemMutation.isPending}
                    onClick={() => redeemMutation.mutate(Number(redeemAmount))}>
                    Redeem
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tier progress */}
          {tiers.length > 0 && (
            <Card>
              <CardContent className="p-3 space-y-2">
                <h4 className="text-xs font-semibold text-muted-foreground">Tier Progress</h4>
                {tiers.map((t: any, i: number) => {
                  const isActive = membership.tier === t.name;
                  const nextTier = tiers[i + 1];
                  return (
                    <div key={i} className={`flex items-center justify-between text-[11px] ${isActive ? "font-bold" : "opacity-60"}`}>
                      <div className="flex items-center gap-1.5">
                        {isActive && <ArrowUpRight className="h-3 w-3 text-primary" />}
                        <span>{t.name}</span>
                      </div>
                      <span>{t.min_points} pts • {t.discount_percent}% off</span>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}

          {/* Recent transactions */}
          {transactions.length > 0 && (
            <Card>
              <CardContent className="p-3 space-y-1.5">
                <h4 className="text-xs font-semibold text-muted-foreground">Recent Activity</h4>
                {transactions.slice(0, 5).map((tx: any) => (
                  <div key={tx.id} className="flex items-center justify-between text-[11px]">
                    <span className="text-muted-foreground truncate flex-1">{tx.description || tx.type}</span>
                    <span className={`font-medium ${tx.points > 0 ? "text-success" : "text-destructive"}`}>
                      {tx.points > 0 ? "+" : ""}{tx.points}
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
