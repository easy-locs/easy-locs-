import { useQuery } from "@tanstack/react-query";
import { getLoyaltySnapshot } from "@/lib/loyalty/loyaltyEngine";

export default function LoyaltyCard({ userId }: { userId?: string | null }) {
  const { data } = useQuery({
    queryKey: ["loyalty-snapshot", userId],
    queryFn: () => getLoyaltySnapshot(userId!),
    enabled: !!userId,
    staleTime: 10000,
  });

  if (!userId) return null;

  return (
    <div className="rounded-2xl border border-border/20 bg-card p-4 space-y-1">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Loyalty</p>
      <p className="text-xl font-bold text-foreground">{Number(data?.points_balance ?? 0)} pts</p>
      <p className="text-sm font-semibold text-foreground capitalize">
        Tier: {data?.tier ?? "bronze"}
      </p>
    </div>
  );
}
