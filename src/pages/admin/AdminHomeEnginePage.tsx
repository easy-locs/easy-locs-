import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getHomeEngineSnapshot } from "@/lib/home/homeEngine";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function AdminHomeEnginePage() {
  const navigate = useNavigate();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["admin-home-engine"],
    queryFn: () => getHomeEngineSnapshot({ limit: 8 }),
    staleTime: 10000,
  });

  const rerun = async () => {
    try {
      const res = await refreshMerchantVisibilityScores(150);
      const ok = res.filter((r) => r.ok).length;
      toast.success(`Home engine refreshed · ${ok} merchants updated`);
      refetch();
    } catch (err: any) {
      toast.error(err.message || "Home engine refresh failed");
    }
  };

  return (
    <div className="min-h-[100dvh] bg-background pb-24">
      <div className="flex items-center gap-3 px-4 pt-6 pb-4">
        <button
          onClick={() => navigate("/admin")}
          className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center"
        >
          ←
        </button>
        <div>
          <h1 className="text-lg font-bold text-foreground">Home Engine</h1>
          <p className="text-xs text-muted-foreground">
            Featured, trending, open-now and promo orchestration
          </p>
        </div>
      </div>

      <button
        onClick={rerun}
        className="mx-4 mb-4 w-[calc(100%-2rem)] rounded-2xl bg-primary text-primary-foreground px-4 py-3 text-sm font-bold"
      >
        Refresh Home Ranking
      </button>

      {isLoading &&
        [1, 2, 3].map((i) => (
          <div key={i} className="mx-4 mb-3 h-20 rounded-2xl bg-muted animate-pulse" />
        ))}

      {!isLoading && data && (
        <>
          <div className="grid grid-cols-2 gap-3 px-4 py-4">
            <Metric title="Featured" value={String(data.featuredMerchants.length)} />
            <Metric title="Recommended" value={String(data.recommendedMerchants.length)} />
            <Metric title="Trending" value={String(data.trendingMerchants.length)} />
            <Metric title="Open Now" value={String(data.openNowMerchants.length)} />
          </div>

          <Section title="Featured Merchants" rows={data.featuredMerchants} />
          <Section title="Active Promos" rows={data.promos} promoMode />
        </>
      )}
    </div>
  );
}

function Metric({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border/20 bg-card p-4">
      <p className="text-xs text-muted-foreground">{title}</p>
      <p className="text-lg font-bold text-foreground">{value}</p>
    </div>
  );
}

function Section({
  title,
  rows,
  promoMode = false,
}: {
  title: string;
  rows: any[];
  promoMode?: boolean;
}) {
  return (
    <div className="px-4 py-3 space-y-2">
      <p className="text-sm font-bold text-foreground">{title}</p>
      {rows.length === 0 ? (
        <p className="text-xs text-muted-foreground">No data</p>
      ) : (
        rows.slice(0, 8).map((row: any, idx: number) => (
          <div key={idx} className="rounded-xl border border-border/20 bg-card p-3">
            <p className="text-sm font-semibold text-foreground">
              {promoMode ? row.title : row.name}
            </p>
            <p className="text-xs text-muted-foreground">
              {promoMode
                ? `${Number(row.discount_value ?? 0)} ${row.discount_type === "percent" ? "%" : "AED"}`
                : `${row.subcategory || row.category || "merchant"} · rating ${Number(row.rating ?? 0).toFixed(1)}`}
            </p>
          </div>
        ))
      )}
    </div>
  );
}
