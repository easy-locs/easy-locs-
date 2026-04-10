import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getAnalyticsSnapshot } from "@/lib/analytics/analyticsEngine";
import { ArrowLeft } from "lucide-react";

export default function AdminAnalyticsOpsPage() {
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ["admin-analytics-snapshot"],
    queryFn: () => getAnalyticsSnapshot(),
    staleTime: 10000,
  });

  return (
    <div className="min-h-[100dvh] bg-background p-4 space-y-4 max-w-lg mx-auto">
      <header className="flex items-center gap-3">
        <button
          onClick={() => navigate("/admin")}
          className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center active:scale-95 transition-transform"
        >
          <ArrowLeft className="w-4.5 h-4.5" />
        </button>
        <div>
          <h1 className="text-lg font-bold text-foreground">Analytics Ops</h1>
          <p className="text-xs text-muted-foreground">Behavior and conversion metrics</p>
        </div>
      </header>

      {isLoading && [1, 2, 3].map((i) => (
        <div key={i} className="rounded-2xl bg-muted/30 h-16 animate-pulse" />
      ))}

      {!isLoading && data && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <Metric title="Home Views" value={String(data.homeViews)} />
            <Metric title="Searches" value={String(data.searches)} />
            <Metric title="Merchant Views" value={String(data.merchantViews)} />
            <Metric title="Add to Cart" value={String(data.addToCart)} />
            <Metric title="Checkout Starts" value={String(data.checkoutStarts)} />
            <Metric title="Orders Created" value={String(data.ordersCreated)} />
            <Metric title="Orders Completed" value={String(data.ordersCompleted)} />
            <Metric title="Favorites" value={String(data.favoritesAdded)} />
          </div>

          <div className="space-y-2">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Recent Events</p>
            <div className="space-y-2">
              {data.recent.slice(0, 12).map((row: any, idx: number) => (
                <div key={idx} className="rounded-xl border border-border/20 bg-card px-3 py-2 flex items-center justify-between">
                  <p className="text-xs font-bold text-foreground">{row.event_type}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {row.created_at ? new Date(row.created_at).toLocaleString() : ""}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function Metric({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border/20 bg-card p-4 space-y-1">
      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">{title}</p>
      <p className="text-xl font-bold text-foreground">{value}</p>
    </div>
  );
}
