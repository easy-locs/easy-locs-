import { useEffect, useState } from "react";
import { BackCard } from "@/components/ui/back-card";
import { getOrCreateLoyaltyAccount } from "@/lib/loyalty/loyalty-core";
import { redeemPoints } from "@/lib/loyalty/redeem";
import { formatMoneyByCountry } from "@/lib/currency-engine";
import { Button } from "@/components/ui/button";
import { Gift, Star } from "lucide-react";
import { toast } from "sonner";

export default function LoyaltyRedeemPage() {
  const [account, setAccount] = useState<any>(null);

  const load = async () => {
    try {
      const data = await getOrCreateLoyaltyAccount({});
      setAccount(data);
    } catch (e: any) {
      console.error(e);
    }
  };

  useEffect(() => { load(); }, []);

  const redeem = async (pts: number) => {
    if (!account) return;
    if (account.points_balance < pts) {
      toast.error("Not enough points");
      return;
    }
    await redeemPoints({ loyaltyAccountId: account.id, points: pts });
    toast.success(`Redeemed ${pts} points`);
    await load();
  };

  return (
    <div className="app-mobile-page bg-background p-4 space-y-4 max-w-lg mx-auto">
      <BackCard />
      <div>
        <h1 className="text-xl font-bold text-foreground">Loyalty Rewards</h1>
        <p className="text-sm text-muted-foreground">Use your points for rewards</p>
      </div>
      {account && (
        <div className="rounded-xl border border-border bg-card p-4 space-y-1">
          <p className="text-sm text-muted-foreground flex items-center gap-1">
            <Star className="h-3.5 w-3.5" /> Points: <span className="font-bold text-foreground">{account.points_balance}</span>
          </p>
          <p className="text-sm text-muted-foreground">Tier: <span className="font-bold text-foreground capitalize">{account.tier}</span></p>
          <p className="text-sm text-muted-foreground">Cashback: <span className="font-bold text-foreground">{formatMoneyByCountry(account.total_cashback, account.country)}</span></p>
        </div>
      )}
      <div className="space-y-2">
        {[50, 100, 250, 500].map((pts) => (
          <Button key={pts} onClick={() => redeem(pts)} variant="outline" className="w-full rounded-xl justify-between">
            <span className="flex items-center gap-2"><Gift className="h-4 w-4" /> Redeem {pts} pts</span>
            <span className="text-xs text-muted-foreground">{formatMoneyByCountry(pts * 0.01, account?.country)}</span>
          </Button>
        ))}
      </div>
    </div>
  );
}
