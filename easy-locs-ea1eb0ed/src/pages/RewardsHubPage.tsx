import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import SubPageShell from "@/components/layout/SubPageShell";
import { getLoyaltySnapshot, getLoyaltyTier, type LoyaltyTier } from "@/lib/loyalty/loyaltyEngine";
import { useUiEngine } from "@/hooks/useUiEngine";

interface LoyaltyAccount {
  id: string;
  user_id: string;
  points_balance: number;
  tier: LoyaltyTier;
  updated_at: string;
}

const TIER_COLORS: Record<LoyaltyTier, string> = {
  bronze: "bg-amber-700/20 text-amber-700",
  silver: "bg-gray-400/20 text-gray-500",
  gold: "bg-yellow-500/20 text-yellow-600",
  platinum: "bg-purple-500/20 text-purple-600",
};

const TIER_THRESHOLDS: { tier: LoyaltyTier; min: number }[] = [
  { tier: "platinum", min: 5000 },
  { tier: "gold", min: 2000 },
  { tier: "silver", min: 500 },
  { tier: "bronze", min: 0 },
];

export default function RewardsHubPage() {
  useUiEngine("rewardshubpage");
  const navigate = useNavigate();
  const { user } = useAuth();
  const [account, setAccount] = useState<LoyaltyAccount | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    getLoyaltySnapshot(user.id)
      .then((data) => setAccount(data as LoyaltyAccount))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user?.id]);

  const points = account?.points_balance ?? 0;
  const tier = account?.tier ?? getLoyaltyTier(points);
  const nextTier = TIER_THRESHOLDS.find((t) => t.min > points);
  const progressToNext = nextTier
    ? Math.min(100, Math.round((points / nextTier.min) * 100))
    : 100;

  return (
    <SubPageShell title="Rewards" onBack={() => navigate(-1)}>
      <div className="max-w-md mx-auto space-y-6 pb-24">
        {loading ? (
          <div className="text-center py-12 text-sm text-muted-foreground">Loading rewards...</div>
        ) : (
          <>
            <div className="rounded-2xl border border-border bg-card p-6 text-center space-y-3">
              <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold uppercase ${TIER_COLORS[tier]}`}>
                {tier}
              </span>
              <p className="text-4xl font-bold text-foreground">{points.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Total Points</p>
            </div>

            {nextTier && (
              <div className="rounded-2xl border border-border bg-card p-4 space-y-2">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Progress to {nextTier.tier}</span>
                  <span>{nextTier.min - points} pts to go</span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-500"
                    style={{ width: `${progressToNext}%` }}
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-foreground">Earn Points</h3>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Complete a booking", pts: "+50" },
                  { label: "Write a review", pts: "+20" },
                  { label: "Refer a friend", pts: "+100" },
                  { label: "Order food delivery", pts: "+30" },
                ].map((item) => (
                  <div key={item.label} className="rounded-xl border border-border bg-card p-3">
                    <p className="text-xs text-muted-foreground">{item.label}</p>
                    <p className="text-sm font-bold text-primary">{item.pts}</p>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={() => navigate("/me/redeem-rewards")}
              className="w-full rounded-xl bg-primary text-primary-foreground py-3 text-sm font-semibold"
            >
              Redeem Points
            </button>
          </>
        )}
      </div>
    </SubPageShell>
  );
}
