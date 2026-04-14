import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getOrCreateLoyaltyAccount, addLoyaltyEntry, rebuildLoyaltyAccount } from "@/lib/loyalty/loyalty-core";
import { customerService } from "@/services";
import { motion } from "framer-motion";
import { Star, Award, TrendingUp, Gift, Zap, Ticket, ShoppingBag, Truck, Percent, ChevronRight, Loader2 } from "lucide-react";
import SubPageShell from "@/components/layout/SubPageShell";
import { toast } from "sonner";
import { useState } from "react";
import { db } from "@/services/db";
import { useUiEngine } from "@/hooks/useUiEngine";

const TIERS = [
  { name: "Bronze", min: 0, color: "hsl(25 60% 50%)", emoji: "\u{1F949}", multiplier: 1 },
  { name: "Silver", min: 500, color: "hsl(0 0% 100% / 0.45)", emoji: "\u{1F948}", multiplier: 1.25 },
  { name: "Gold", min: 2000, color: "hsl(var(--warning))", emoji: "\u{1F947}", multiplier: 1.5 },
  { name: "Platinum", min: 5000, color: "hsl(270 60% 55%)", emoji: "\u{1F48E}", multiplier: 2 },
];

const REWARDS = [
  { id: "free_delivery", icon: Truck, label: "Free Delivery", cost: 200, description: "On your next order" },
  { id: "discount_3", icon: Percent, label: "3% Discount", cost: 150, description: "Applied at checkout" },
  { id: "discount_5", icon: Percent, label: "5% Discount", cost: 300, description: "Applied at checkout" },
  { id: "priority_support", icon: Star, label: "Priority Support", cost: 100, description: "24h response" },
  { id: "gift_voucher", icon: Gift, label: "Gift Voucher", cost: 500, description: "5 AED credit" },
];

function getTierInfo(points: number) {
  let current = TIERS[0];
  let next: typeof TIERS[0] | null = TIERS[1];
  for (let i = TIERS.length - 1; i >= 0; i--) {
    if (points >= TIERS[i].min) {
      current = TIERS[i];
      next = TIERS[i + 1] ?? null;
      break;
    }
  }
  return { current, next };
}

export default function CustomerLoyaltyHistoryPage() {
  useUiEngine("customer-customerloyaltyhistorypage");
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [redeeming, setRedeeming] = useState<string | null>(null);

  const { data, isLoading , isError } = useQuery({
    queryKey: ["customer-loyalty-full", user?.id],
    queryFn: async () => {
      const account = await getOrCreateLoyaltyAccount({});
      const [orders, ledger] = await Promise.all([
        customerService.fetchCustomerOrders(user?.id, 100),
        account?.id
          ? db("loyalty_ledger")
              .select("*")
              .eq("loyalty_account_id", account.id)
              .order("created_at", { ascending: false })
              .limit(50)
              .then((r: any) => r.data ?? [])
              .catch(() => [])
          : Promise.resolve([]),
      ]);

      const completed = (orders ?? []).filter((row: any) =>
        ["completed", "delivered"].includes(String(row.status ?? ""))
      );

      const history = completed.map((row: any) => ({
        id: row.id,
        createdAt: row.created_at,
        spent: Number(row.total_amount ?? 0),
        currency: row.currency ?? "",
        estimatedPoints: Math.floor(Number(row.total_amount ?? 0)),
      }));

      return {
        account,
        history,
        ledger: ledger as any[],
        totalEarned: Number(account?.lifetime_points ?? 0) || history.reduce((s: number, r: any) => s + r.estimatedPoints, 0),
      };
    },
    enabled: !!user?.id,
    staleTime: 10000,
  });

  const handleRedeem = async (reward: typeof REWARDS[0]) => {
    if (!data?.account) return;
    setRedeeming(reward.id);
    try {
      const { data: freshAccount } = await db("loyalty_accounts")
        .select("points_balance")
        .eq("id", data.account.id)
        .single();
      const freshBalance = Number(freshAccount?.points_balance ?? 0);
      if (freshBalance < reward.cost) {
        toast.error(`Not enough points. You need ${reward.cost - freshBalance} more.`);
        return;
      }
      await addLoyaltyEntry({
        loyaltyAccountId: data.account.id,
        entryType: "redeem",
        points: -reward.cost,
        referenceType: "reward",
        referenceId: reward.id,
        metadata: { reward_label: reward.label },
      });
      toast.success(`Redeemed: ${reward.label}`);
      queryClient.invalidateQueries({ queryKey: ["customer-loyalty-full"] });
    } catch (err: any) {
      toast.error("Failed to redeem");
    } finally {
      setRedeeming(null);
    }
  };

  const points = Number(data?.account?.points_balance ?? 0);
  const lifetime = Number(data?.account?.lifetime_points ?? 0) || (data?.totalEarned ?? 0);
  const { current: currentTier, next: nextTier } = getTierInfo(lifetime);
  const progress = nextTier ? Math.min(100, ((lifetime - currentTier.min) / (nextTier.min - currentTier.min)) * 100) : 100;

  return (
    <SubPageShell title="Loyalty & Rewards" subtitle="Earn points on every order, unlock rewards" onBack={() => navigate("/me")} noContentPad>

      {isError && <div className="state-container"><p className="text-sm text-destructive">Something went wrong. Please try again.</p></div>}
      {isLoading && [1, 2, 3].map((i) => (
        <div key={i} className="mx-4 mb-3 h-20 rounded-2xl animate-pulse bg-muted/30" />
      ))}

      {!isLoading && data && (
        <>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mx-4 mb-4 rounded-2xl p-5 relative overflow-hidden"
            style={{ background: `linear-gradient(135deg, ${currentTier.color}18, ${currentTier.color}08)`, border: `1px solid ${currentTier.color}20` }}
          >
            <div className="absolute top-3 right-3 text-3xl opacity-30">{currentTier.emoji}</div>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: `${currentTier.color}15` }}>
                <Award className="w-6 h-6" style={{ color: currentTier.color }} />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Current Tier</p>
                <p className="text-xl font-bold" style={{ color: currentTier.color }}>{currentTier.name}</p>
              </div>
            </div>

            <div className="flex items-end justify-between mb-2.5">
              <div>
                <p className="text-[10px] text-muted-foreground font-semibold uppercase">Balance</p>
                <p className="text-3xl font-extrabold text-foreground tabular-nums">{points}<span className="text-sm font-bold text-muted-foreground ml-1">pts</span></p>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-muted-foreground font-semibold uppercase">Lifetime Earned</p>
                <p className="text-lg font-bold text-foreground">{lifetime} pts</p>
              </div>
            </div>

            {nextTier && (
              <div className="mt-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-bold" style={{ color: currentTier.color }}>{currentTier.name}</span>
                  <span className="text-[10px] font-bold" style={{ color: nextTier.color }}>{nextTier.emoji} {nextTier.name}</span>
                </div>
                <div className="w-full h-2 rounded-full overflow-hidden bg-muted/30">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className="h-full rounded-full"
                    style={{ background: `linear-gradient(90deg, ${currentTier.color}, ${nextTier.color})` }}
                  />
                </div>
                <p className="text-[10px] text-muted-foreground mt-1 text-center">
                  {nextTier.min - lifetime} points to {nextTier.name}
                </p>
              </div>
            )}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mx-4 mb-4 grid grid-cols-3 gap-2"
          >
            <div className="rounded-2xl p-3 text-center border border-emerald-500/10 bg-emerald-500/5">
              <ShoppingBag className="w-4 h-4 mx-auto mb-1 text-emerald-500" />
              <p className="text-sm font-bold text-foreground">{data.history.length}</p>
              <p className="text-[10px] text-muted-foreground font-semibold uppercase">Orders</p>
            </div>
            <div className="rounded-2xl p-3 text-center border border-blue-500/10 bg-blue-500/5">
              <TrendingUp className="w-4 h-4 mx-auto mb-1 text-blue-500" />
              <p className="text-sm font-bold text-foreground">{data.history.length > 0 ? Math.round(lifetime / data.history.length) : 0}</p>
              <p className="text-[10px] text-muted-foreground font-semibold uppercase">Avg/Order</p>
            </div>
            <div className="rounded-2xl p-3 text-center border border-purple-500/10 bg-purple-500/5">
              <Zap className="w-4 h-4 mx-auto mb-1 text-purple-500" />
              <p className="text-sm font-bold text-foreground">{currentTier.multiplier}x</p>
              <p className="text-[10px] text-muted-foreground font-semibold uppercase">Multiplier</p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="mx-4 mb-4 rounded-2xl border border-border/15 bg-card/40 p-4"
          >
            <div className="flex items-center gap-2 mb-1">
              <Zap className="w-4 h-4 text-primary" />
              <p className="text-xs font-bold text-foreground">How you earn</p>
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Earn <span className="font-bold text-foreground">1 point per 1 AED</span> spent on any order.
              {currentTier.multiplier > 1 && (
                <> As a <span className="font-bold" style={{ color: currentTier.color }}>{currentTier.name}</span> member, you earn at <span className="font-bold text-foreground">{currentTier.multiplier}x</span> rate.</>
              )}
              {" "}Plus 1% cashback on every transaction.
            </p>
          </motion.div>

          <div className="px-4 mb-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-[13px] font-bold text-foreground flex items-center gap-1.5">
                <Ticket className="w-3.5 h-3.5 text-primary" /> Redeem Rewards
              </h2>
              <span className="text-[10px] text-muted-foreground">{points} pts available</span>
            </div>
            <div className="space-y-2">
              {REWARDS.map((reward) => {
                const canAfford = points >= reward.cost;
                const Icon = reward.icon;
                const isRedeeming = redeeming === reward.id;
                return (
                  <motion.button
                    key={reward.id}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => canAfford && handleRedeem(reward)}
                    disabled={!canAfford || isRedeeming}
                    className="w-full rounded-xl bg-card p-3 flex items-center gap-3 border border-border/15 disabled:opacity-40 transition-all"
                  >
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 bg-primary/10">
                      <Icon className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0 text-left">
                      <p className="text-xs font-bold text-foreground">{reward.label}</p>
                      <p className="text-[10px] text-muted-foreground">{reward.description}</p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {isRedeeming ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                      ) : (
                        <>
                          <span className="text-[11px] font-bold text-primary">{reward.cost} pts</span>
                          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                        </>
                      )}
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </div>

          <div className="px-4 mb-4">
            <h2 className="text-[13px] font-bold text-foreground mb-3 flex items-center gap-1.5">
              <Award className="w-3.5 h-3.5 text-primary" /> Tier Benefits
            </h2>
            <div className="grid grid-cols-2 gap-2">
              {TIERS.map(tier => (
                <div
                  key={tier.name}
                  className="rounded-xl p-3 border transition-all"
                  style={{
                    borderColor: tier.name === currentTier.name ? `${tier.color}` : "hsl(var(--border) / 0.1)",
                    background: tier.name === currentTier.name ? `${tier.color}10` : "hsl(var(--card) / 0.4)",
                  }}
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-base">{tier.emoji}</span>
                    <span className="text-[11px] font-bold" style={{ color: tier.color }}>{tier.name}</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground">{tier.min}+ pts</p>
                  <p className="text-[10px] font-semibold text-foreground">{tier.multiplier}x multiplier</p>
                </div>
              ))}
            </div>
          </div>

          <div className="px-4">
            <h2 className="text-[11px] font-extrabold uppercase tracking-widest text-muted-foreground/50 mb-3">Points History</h2>
            {data.ledger.length > 0 ? (
              <div className="space-y-2">
                {data.ledger.map((row: any, idx: number) => (
                  <motion.div
                    key={row.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.15 + idx * 0.03 }}
                    className="rounded-xl bg-card p-3 flex items-center gap-3 border border-border/10"
                  >
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{
                      background: row.entry_type === "earn" ? "hsl(152 60% 42% / 0.08)"
                        : row.entry_type === "redeem" ? "hsl(0 65% 50% / 0.08)"
                        : "hsl(var(--warning) / 0.08)"
                    }}>
                      {row.entry_type === "earn" ? <Star className="w-4 h-4" style={{ color: "hsl(152 60% 42%)" }} />
                        : row.entry_type === "redeem" ? <Gift className="w-4 h-4" style={{ color: "hsl(0 65% 50%)" }} />
                        : <Zap className="w-4 h-4" style={{ color: "hsl(var(--warning))" }} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-foreground capitalize">{row.entry_type}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {row.reference_type ? `${row.reference_type} ` : ""}
                        {row.created_at ? new Date(row.created_at).toLocaleDateString() : ""}
                      </p>
                    </div>
                    <span className="text-xs font-bold shrink-0" style={{
                      color: Number(row.points) >= 0 ? "hsl(152 60% 42%)" : "hsl(0 65% 50%)"
                    }}>
                      {Number(row.points) >= 0 ? "+" : ""}{row.points}
                    </span>
                  </motion.div>
                ))}
              </div>
            ) : data.history.length > 0 ? (
              <div className="space-y-2">
                {data.history.map((row: any, idx: number) => (
                  <motion.div
                    key={row.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.15 + idx * 0.03 }}
                    className="rounded-xl bg-card p-3 flex items-center gap-3 border border-border/10"
                  >
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-amber-500/10">
                      <Star className="w-4 h-4 text-amber-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-foreground">Order #{String(row.id).slice(0, 8)}</p>
                      <p className="text-[10px] text-muted-foreground">
                        Spent {row.spent.toFixed(2)} {row.currency} · {row.createdAt ? new Date(row.createdAt).toLocaleDateString() : ""}
                      </p>
                    </div>
                    <span className="text-xs font-bold shrink-0 text-emerald-500">+{row.estimatedPoints}</span>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Star className="w-8 h-8 mx-auto mb-2 text-amber-500/30" />
                <p className="text-sm font-bold text-foreground">No loyalty activity yet</p>
                <p className="text-xs text-muted-foreground mt-1">Complete orders to earn points and rewards</p>
              </div>
            )}
          </div>
        </>
      )}
    </SubPageShell>
  );
}
