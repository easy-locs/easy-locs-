import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

const REWARDS = [
  { id: "1", title: "10 AED Discount", cost: 100 },
  { id: "2", title: "Free Drink", cost: 60 },
  { id: "3", title: "Free Delivery", cost: 80 },
];

export default function CustomerRewardRedemptionPage() {
  const navigate = useNavigate();

  const redeem = (title: string) => {
    toast.success(`Redeemed: ${title}`);
  };

  return (
    <div className="max-w-md mx-auto px-4 py-4 space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate("/me")} className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center">←</button>
        <div>
          <h1 className="text-lg font-bold">Redeem Rewards</h1>
          <p className="text-xs text-muted-foreground">Use loyalty points</p>
        </div>
      </div>

      <div className="space-y-3">
        {REWARDS.map((reward) => (
          <div key={reward.id} className="rounded-2xl border border-border/20 bg-card p-4">
            <div className="text-sm font-bold">{reward.title}</div>
            <div className="text-xs text-muted-foreground mt-1">{reward.cost} points</div>
            <button onClick={() => redeem(reward.title)} className="rounded-2xl bg-primary text-primary-foreground px-4 py-3 text-sm font-bold mt-4">Redeem</button>
          </div>
        ))}
      </div>
    </div>
  );
}
