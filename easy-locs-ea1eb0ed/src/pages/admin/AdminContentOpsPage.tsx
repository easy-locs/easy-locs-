import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { adminOpsService } from "@/services";
import { ArrowLeft } from "lucide-react";
import { useUiEngine } from "@/hooks/useUiEngine";

export default function AdminContentOpsPage() {
  useUiEngine("admin-admincontentopspage");
  const navigate = useNavigate();

  const { data: reviews = [] } = useQuery({
    queryKey: ["admin-content-reviews"],
    queryFn: () => adminOpsService.fetchAllReviews(500) as Promise<any[]>,
    staleTime: 10000,
  });

  const { data: loyalty = [] } = useQuery({
    queryKey: ["admin-content-loyalty"],
    queryFn: () => adminOpsService.fetchAllLoyaltyAccounts(500) as Promise<any[]>,
    staleTime: 10000,
  });

  const avgRating =
    reviews.length > 0
      ? (
          reviews.reduce((sum: number, r: any) => sum + Number(r.rating ?? 0), 0) / reviews.length
        ).toFixed(2)
      : "0.00";

  const totalPoints = loyalty.reduce((sum: number, r: any) => sum + Number(r.points_balance ?? 0), 0);

  return (
    <div className="min-h-[100dvh] bg-background p-4 space-y-4 max-w-lg mx-auto">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate("/admin")}
          className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="text-lg font-bold text-foreground">Content Ops</h1>
          <p className="text-xs text-muted-foreground">Reviews, loyalty, search health</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Metric title="Reviews" value={String(reviews.length)} />
        <Metric title="Avg Rating" value={avgRating} />
        <Metric title="Loyalty Accounts" value={String(loyalty.length)} />
        <Metric title="Total Points" value={String(totalPoints)} />
      </div>

      <div className="space-y-2">
        <button
          onClick={() => navigate("/admin/home-engine")}
          className="w-full rounded-2xl bg-card border border-border/20 px-4 py-4 text-left text-sm font-bold text-foreground"
        >
          Home Engine
        </button>
        <button
          onClick={() => navigate("/admin/marketplace-engine")}
          className="w-full rounded-2xl bg-card border border-border/20 px-4 py-4 text-left text-sm font-bold text-foreground"
        >
          Marketplace Engine
        </button>
        <button
          onClick={() => navigate("/admin/map-engine")}
          className="w-full rounded-2xl bg-card border border-border/20 px-4 py-4 text-left text-sm font-bold text-foreground"
        >
          Map Engine
        </button>
        <button
          onClick={() => navigate("/admin/notification-engine")}
          className="w-full rounded-2xl bg-card border border-border/20 px-4 py-4 text-left text-sm font-bold text-foreground"
        >
          Notification Engine
        </button>
      </div>
    </div>
  );
}

function Metric({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border/20 bg-card p-4 space-y-1">
      <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{title}</p>
      <p className="text-lg font-bold text-foreground">{value}</p>
    </div>
  );
}
