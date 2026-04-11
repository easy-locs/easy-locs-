import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { getLoyaltySnapshot, spendLoyaltyPoints } from "@/lib/loyalty/loyaltyEngine";
import { toast } from "sonner";

const REWARDS = [
  { id: "r1", title: "5 Credit", points: 250 },
  { id: "r2", title: "15 Credit", points: 700 },
  { id: "r3", title: "Free Delivery", points: 350 },
  { id: "r4", title: "VIP Priority", points: 1200 },
];

export default function CustomerRewardRedemptionPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data, refetch , isError } = useQuery({
    queryKey: ["redeem-loyalty", user?.id],
    queryFn: () => getLoyaltySnapshot(user?.id),
    enabled: !!user?.id,
    staleTime: 5000,
  });

  const redeem = async (points: number, title: string) => {
    if (!user?.id) return;

    const current = Number((data as any)?.points_balance ?? 0);
    if (current < points) {
      toast.error("Not enough points");
      return;
    }

    try {
      await spendLoyaltyPoints({ userId: user.id, points });
      toast.success(`${title} redeemed`);
      refetch();
    } catch (e: any) {
      toast.error("Could not redeem reward");
    }
  };

  if (isError) return (<div className="state-container"><p className="text-sm text-destructive">Something went wrong. Please try again.</p></div>);

  return (
    <div className="max-w-md mx-auto px-4 py-4 space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate("/me")} className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center">←</button>
        <div>
          <h1 className="text-lg font-bold">Redeem Rewards</h1>
          <p className="text-xs text-muted-foreground">Use your loyalty points</p>
        </div>
      </div>

      <div className="rounded-[28px] border border-border/20 bg-card p-5">
        <div className="text-[11px] uppercase font-bold text-muted-foreground">Available Points</div>
        <div className="text-3xl font-bold mt-1">{Number((data as any)?.points_balance ?? 0)}</div>
        <div className="text-xs text-muted-foreground mt-1">Tier: {(data as any)?.tier ?? "bronze"}</div>
      </div>

      <div className="space-y-3">
        {REWARDS.map((reward) => (
          <div key={reward.id} className="rounded-[28px] border border-border/20 bg-card p-4">
            <div className="text-sm font-bold">{reward.title}</div>
            <div className="text-xs text-muted-foreground mt-1">{reward.points} points</div>
            <button onClick={() => redeem(reward.points, reward.title)} className="w-full rounded-2xl bg-primary text-primary-foreground px-4 py-3 text-sm font-bold mt-4">
              Redeem
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
