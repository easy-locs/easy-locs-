import { memo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { dldAnalyticsService } from "@/services/dld-analytics.service";
import { TrendingUp, TrendingDown, ChevronRight, Activity, MapPin } from "lucide-react";

const navy = "hsl(226 24% 14%)";
const goldHex = "#EAB308";

function formatAED(value: number): string {
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)}B`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}K`;
  return value.toLocaleString();
}

const RealEstateAnalyticsCard = memo(function RealEstateAnalyticsCard() {
  const navigate = useNavigate();

  const { data: summary, isLoading } = useQuery({
    queryKey: ["market-summary-card"],
    queryFn: () => dldAnalyticsService.getMarketSummary(),
    staleTime: 10 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <div className="px-4" style={{ marginBottom: "var(--section-gap)" }}>
        <div className="h-4 w-48 rounded skeleton-premium mb-3" />
        <div className="h-36 rounded-2xl skeleton-premium" />
      </div>
    );
  }

  if (!summary) return null;

  const isUp = summary.volumeTrend >= 0;

  return (
    <div className="px-4" style={{ marginBottom: "var(--section-gap)" }}>
      <button
        onClick={() => navigate("/real-estate/dubai-analytics")}
        className="w-full text-left rounded-2xl overflow-hidden transition-transform active:scale-[0.98]"
        style={{
          background: `linear-gradient(135deg, ${navy} 0%, hsl(226 24% 20%) 100%)`,
          border: "1px solid rgba(234,179,8,0.2)",
        }}
      >
        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center"
                style={{ background: "rgba(234,179,8,0.15)" }}
              >
                <Activity size={14} color={goldHex} />
              </div>
              <div>
                <p className="text-[13px] font-bold text-white">Market Pulse</p>
                <p className="text-[9px] text-white/40 uppercase tracking-wider">Live Dubai DLD</p>
              </div>
            </div>
            <div className="flex items-center gap-1 text-[11px] font-semibold" style={{ color: goldHex }}>
              Deep Dive <ChevronRight size={12} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 mb-3">
            <div className="p-2.5 rounded-xl" style={{ background: "rgba(255,255,255,0.06)" }}>
              <p className="text-[16px] font-extrabold text-white">
                AED {summary.avgPricePerSqft.toLocaleString()}
              </p>
              <p className="text-[9px] text-white/40 uppercase tracking-wider mt-0.5">Avg/sqft</p>
            </div>
            <div className="p-2.5 rounded-xl" style={{ background: "rgba(255,255,255,0.06)" }}>
              <div className="flex items-center gap-1">
                <p className="text-[16px] font-extrabold text-white">
                  {formatAED(summary.totalVolume)}
                </p>
              </div>
              <div className="flex items-center gap-1 mt-0.5">
                <span
                  className="inline-flex items-center gap-0.5 text-[9px] font-bold"
                  style={{ color: isUp ? "#22c55e" : "#ef4444" }}
                >
                  {isUp ? <TrendingUp size={8} /> : <TrendingDown size={8} />}
                  {isUp ? "+" : ""}{summary.volumeTrend}%
                </span>
                <p className="text-[9px] text-white/40 uppercase tracking-wider">Vol</p>
              </div>
            </div>
            <div className="p-2.5 rounded-xl" style={{ background: "rgba(255,255,255,0.06)" }}>
              <p className="text-[16px] font-extrabold text-white">
                {summary.transactionCount.toLocaleString()}
              </p>
              <p className="text-[9px] text-white/40 uppercase tracking-wider mt-0.5">Txn</p>
            </div>
          </div>

          <div
            className="flex items-center gap-2 px-3 py-2 rounded-xl"
            style={{ background: "rgba(234,179,8,0.08)", border: "1px solid rgba(234,179,8,0.15)" }}
          >
            <MapPin size={12} color={goldHex} />
            <span className="text-[11px] text-white/70">
              Hottest: <span className="font-bold text-white">{summary.hottestDistrict}</span>
            </span>
            <span className="text-[10px] text-white/40 ml-auto">This month</span>
          </div>
        </div>
      </button>
    </div>
  );
});

export default RealEstateAnalyticsCard;
