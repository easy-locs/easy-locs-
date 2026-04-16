import { memo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { dldAnalyticsService } from "@/services/dld-analytics.service";
import { TrendingUp, TrendingDown, ChevronRight, Activity, MapPin, AlertCircle } from "lucide-react";

function formatAED(value: number): string {
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)}B`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}K`;
  return value.toLocaleString();
}

const RealEstateAnalyticsCard = memo(function RealEstateAnalyticsCard() {
  const navigate = useNavigate();

  const { data: summary, isLoading, isError, refetch } = useQuery({
    queryKey: ["market-summary-card"],
    queryFn: () => dldAnalyticsService.getMarketSummary(),
    staleTime: 10 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <div className="px-4" style={{ marginBottom: "var(--section-gap)" }}>
        <div className="rounded-2xl p-4 animate-pulse" style={{ background: "hsl(var(--navy, 226 24% 14%))" }}>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 rounded-lg bg-white/10" />
            <div className="h-4 w-28 rounded bg-white/10" />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="h-16 rounded-xl bg-white/6" />
            <div className="h-16 rounded-xl bg-white/6" />
            <div className="h-16 rounded-xl bg-white/6" />
          </div>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="px-4" style={{ marginBottom: "var(--section-gap)" }}>
        <div
          className="rounded-2xl p-4 flex flex-col items-center justify-center gap-2"
          style={{ background: "hsl(var(--navy, 226 24% 14%))", border: "1px solid hsl(var(--accent) / 0.2)" }}
        >
          <AlertCircle className="h-6 w-6 text-destructive/60" />
          <p className="text-xs text-white/50">Market data unavailable</p>
          <button onClick={() => refetch()} className="text-[0.6875rem] font-semibold text-accent hover:underline">
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="px-4" style={{ marginBottom: "var(--section-gap)" }}>
        <div
          className="rounded-2xl p-4 flex flex-col items-center justify-center gap-2"
          style={{ background: "hsl(var(--navy, 226 24% 14%))", border: "1px solid hsl(var(--accent) / 0.2)" }}
        >
          <Activity className="h-6 w-6 text-accent/40" />
          <p className="text-xs text-white/50">No market data yet</p>
        </div>
      </div>
    );
  }

  const isUp = summary.data.volumeTrend >= 0;

  return (
    <div className="px-4" style={{ marginBottom: "var(--section-gap)" }}>
      <button
        onClick={() => navigate("/real-estate/dubai-analytics")}
        className="w-full text-left rounded-2xl overflow-hidden transition-transform active:scale-[0.98]"
        style={{
          background: "linear-gradient(135deg, hsl(var(--navy, 226 24% 14%)) 0%, hsl(226 24% 20%) 100%)",
          border: "1px solid hsl(var(--accent) / 0.2)",
        }}
      >
        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center"
                style={{ background: "hsl(var(--accent) / 0.15)" }}
              >
                <Activity size={14} className="text-accent" />
              </div>
              <div>
                <p className="text-[0.8125rem] font-bold text-white">Market Pulse</p>
                <p className="text-[0.5625rem] text-white/40 uppercase tracking-wider">Live Dubai DLD</p>
              </div>
            </div>
            <div className="flex items-center gap-1 text-[0.6875rem] font-semibold text-accent">
              Deep Dive <ChevronRight size={12} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 mb-3">
            <div className="p-2.5 rounded-xl" style={{ background: "rgba(255,255,255,0.06)" }}>
              <p className="text-base font-extrabold text-white">
                AED {summary.data.avgPricePerSqft.toLocaleString()}
              </p>
              <p className="text-[0.5625rem] text-white/40 uppercase tracking-wider mt-0.5">Avg/sqft</p>
            </div>
            <div className="p-2.5 rounded-xl" style={{ background: "rgba(255,255,255,0.06)" }}>
              <div className="flex items-center gap-1">
                <p className="text-base font-extrabold text-white">
                  {formatAED(summary.data.totalVolume)}
                </p>
              </div>
              <div className="flex items-center gap-1 mt-0.5">
                <span
                  className={`inline-flex items-center gap-0.5 text-[0.5625rem] font-bold ${isUp ? "text-success" : "text-destructive"}`}
                >
                  {isUp ? <TrendingUp size={8} /> : <TrendingDown size={8} />}
                  {isUp ? "+" : ""}{summary.data.volumeTrend}%
                </span>
                <p className="text-[0.5625rem] text-white/40 uppercase tracking-wider">Vol</p>
              </div>
            </div>
            <div className="p-2.5 rounded-xl" style={{ background: "rgba(255,255,255,0.06)" }}>
              <p className="text-base font-extrabold text-white">
                {summary.data.transactionCount.toLocaleString()}
              </p>
              <p className="text-[0.5625rem] text-white/40 uppercase tracking-wider mt-0.5">Txn</p>
            </div>
          </div>

          <div
            className="flex items-center gap-2 px-3 py-2 rounded-xl"
            style={{ background: "hsl(var(--accent) / 0.08)", border: "1px solid hsl(var(--accent) / 0.15)" }}
          >
            <MapPin size={12} className="text-accent" />
            <span className="text-[0.6875rem] text-white/70">
              Hottest: <span className="font-bold text-white">{summary.data.hottestDistrict}</span>
            </span>
            <span className="text-[0.625rem] text-white/40 ml-auto">This month</span>
          </div>
        </div>
      </button>
    </div>
  );
});

export default RealEstateAnalyticsCard;
