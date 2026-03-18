/**
 * LoyaltyCard — Display user loyalty points and tier.
 */
export default function LoyaltyCard({ points, tier }: {
  points: number;
  tier: string;
}) {
  const tierColors: Record<string, string> = {
    bronze: "text-amber-700",
    silver: "text-slate-500",
    gold: "text-yellow-500",
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-4 space-y-1">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Loyalty</p>
      <p className="text-xl font-bold text-foreground">{points} pts</p>
      <p className={`text-sm font-semibold capitalize ${tierColors[tier] ?? "text-foreground"}`}>
        {tier}
      </p>
    </div>
  );
}
