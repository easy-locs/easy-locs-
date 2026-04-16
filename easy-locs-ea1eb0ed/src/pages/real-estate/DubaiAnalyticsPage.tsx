import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useI18n } from "@/lib/i18n";
import SubPageShell from "@/components/layout/SubPageShell";
import { dldAnalyticsService, type DLDAnalyticsFilters, type PaginatedResult, getDataSource, resetDataSourceTracking } from "@/services/dld-analytics.service";
import type {
  DLDMarketKPI,
  DLDDistrictSummary,
  DLDMonthlyTrend,
  DLDTransaction,
  DLDPropertyType,
} from "@/domains/real-estate/canonical-types";
import {
  ArrowLeft, TrendingUp, TrendingDown, BarChart3,
  MapPin, ChevronRight, X, SlidersHorizontal, Activity, Share2,
} from "lucide-react";
import ShareButtons from "@/components/public/ShareButtons";
import BuildingPriceHistory from "@/components/analytics/BuildingPriceHistory";
import ComparableSales from "@/components/analytics/ComparableSales";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend,
} from "recharts";
import { motion, AnimatePresence } from "framer-motion";
import type mapboxgl from "mapbox-gl";
import { loadMapbox, getMapboxgl } from "@/lib/mapbox/mapbox-loader";
import { MAPBOX_ACCESS_TOKEN } from "@/lib/mapbox/config";

const navy = "hsl(226 24% 14%)";
const goldHex = "#EAB308";

type PeriodMode = "month" | "quarter" | "year";

const PERIOD_MODE_KEYS: { value: PeriodMode; i18nKey: string }[] = [
  { value: "month", i18nKey: "dld.mode_month" },
  { value: "quarter", i18nKey: "dld.mode_quarter" },
  { value: "year", i18nKey: "dld.mode_year" },
];

const MONTH_OPTIONS = [
  { value: "2026-04", i18nKey: "dld.period_apr_2026" },
  { value: "2026-03", i18nKey: "dld.period_mar_2026" },
  { value: "2026-02", i18nKey: "dld.period_feb_2026" },
  { value: "2026-01", i18nKey: "dld.period_jan_2026" },
  { value: "2025-12", i18nKey: "dld.period_dec_2025" },
  { value: "2025-11", i18nKey: "dld.period_nov_2025" },
  { value: "2025-10", i18nKey: "dld.period_oct_2025" },
  { value: "2025-09", i18nKey: "dld.period_sep_2025" },
  { value: "2025-06", i18nKey: "dld.period_jun_2025" },
  { value: "2025-03", i18nKey: "dld.period_mar_2025" },
  { value: "2024-12", i18nKey: "dld.period_dec_2024" },
  { value: "2024-06", i18nKey: "dld.period_jun_2024" },
];

const QUARTER_OPTIONS = [
  { value: "2026-Q1", i18nKey: "dld.period_q1_2026" },
  { value: "2025-Q4", i18nKey: "dld.period_q4_2025" },
  { value: "2025-Q3", i18nKey: "dld.period_q3_2025" },
  { value: "2025-Q2", i18nKey: "dld.period_q2_2025" },
  { value: "2025-Q1", i18nKey: "dld.period_q1_2025" },
  { value: "2024-Q4", i18nKey: "dld.period_q4_2024" },
  { value: "2024-Q3", i18nKey: "dld.period_q3_2024" },
  { value: "2024-Q2", i18nKey: "dld.period_q2_2024" },
  { value: "2024-Q1", i18nKey: "dld.period_q1_2024" },
  { value: "2023-Q4", i18nKey: "dld.period_q4_2023" },
  { value: "2023-Q2", i18nKey: "dld.period_q2_2023" },
  { value: "2022-Q4", i18nKey: "dld.period_q4_2022" },
  { value: "2021-Q4", i18nKey: "dld.period_q4_2021" },
];

const YEAR_OPTIONS = [
  { value: "2026", i18nKey: "dld.period_2026" },
  { value: "2025", i18nKey: "dld.period_2025" },
  { value: "2024", i18nKey: "dld.period_2024" },
  { value: "2023", i18nKey: "dld.period_2023" },
  { value: "2022", i18nKey: "dld.period_2022" },
  { value: "2021", i18nKey: "dld.period_2021" },
];

const TYPE_OPTION_KEYS: { value: DLDPropertyType | "all"; i18nKey: string }[] = [
  { value: "all", i18nKey: "dld.all_types" },
  { value: "apartment", i18nKey: "dld.type_apartment" },
  { value: "villa", i18nKey: "dld.type_villa" },
  { value: "townhouse", i18nKey: "dld.type_townhouse" },
  { value: "penthouse", i18nKey: "dld.type_penthouse" },
  { value: "office", i18nKey: "dld.type_office" },
  { value: "land", i18nKey: "dld.type_land" },
];

const PROPERTY_TYPE_I18N: Record<string, string> = {
  apartment: "dld.type_apartment",
  villa: "dld.type_villa",
  townhouse: "dld.type_townhouse",
  penthouse: "dld.type_penthouse",
  office: "dld.type_office",
  land: "dld.type_land",
};

function localizeType(type: string, t: (key: string) => string): string {
  return PROPERTY_TYPE_I18N[type] ? t(PROPERTY_TYPE_I18N[type]) : type;
}

function formatAED(value: number): string {
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)}B`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}K`;
  return value.toLocaleString();
}

function ChangeIndicator({ value }: { value: number }) {
  const isPositive = value >= 0;
  return (
    <span
      className="inline-flex items-center gap-0.5 text-[11px] font-bold px-1.5 py-0.5 rounded-full"
      style={{
        background: isPositive ? "rgba(34,197,94,0.12)" : "rgba(239,68,68,0.12)",
        color: isPositive ? "#16a34a" : "#dc2626",
      }}
    >
      {isPositive ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
      {isPositive ? "+" : ""}{value}%
    </span>
  );
}

function KPICard({ label, value, change, icon }: {
  label: string;
  value: string;
  change?: number;
  icon: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-3 rounded-xl"
      style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}
    >
      <div className="flex items-center gap-2 mb-1.5">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "rgba(234,179,8,0.15)" }}>
          {icon}
        </div>
        {change !== undefined && <ChangeIndicator value={change} />}
      </div>
      <p className="text-[20px] font-extrabold text-white leading-tight">{value}</p>
      <p className="text-[10px] text-white/50 mt-0.5 uppercase tracking-wider font-medium">{label}</p>
    </motion.div>
  );
}

function DistrictRankingTable({
  summaries,
  onSelectDistrict,
  t,
}: {
  summaries: DLDDistrictSummary[];
  onSelectDistrict: (d: string) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
}) {
  const [sortKey, setSortKey] = useState<"transactionCount" | "totalAmount" | "avgPricePerSqft">("transactionCount");

  const sorted = useMemo(() => {
    return [...summaries].sort((a, b) => (b[sortKey] as number) - (a[sortKey] as number));
  }, [summaries, sortKey]);

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-bold text-foreground">
          {t("dld.district_ranking")}
        </h2>
        <select
          value={sortKey}
          onChange={e => setSortKey(e.target.value as typeof sortKey)}
          className="text-[11px] px-2 py-1 rounded-lg border"
          style={{ background: "hsl(var(--card))", borderColor: "hsl(var(--border))", color: "hsl(var(--foreground))" }}
        >
          <option value="transactionCount">{t("dld.sort_by_volume")}</option>
          <option value="totalAmount">{t("dld.sort_by_amount")}</option>
          <option value="avgPricePerSqft">{t("dld.sort_by_price")}</option>
        </select>
      </div>

      <div className="space-y-2">
        {sorted.map((d, i) => (
          <motion.button
            key={d.district}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.03 }}
            onClick={() => onSelectDistrict(d.district)}
            className="w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all active:scale-[0.98]"
            style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border) / 0.5)" }}
          >
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-extrabold shrink-0"
              style={{
                background: i < 3 ? "rgba(234,179,8,0.15)" : "hsl(var(--muted))",
                color: i < 3 ? goldHex : "hsl(var(--muted-foreground))",
              }}
            >
              {i + 1}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-bold truncate text-foreground">
                {d.district}
              </p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[10px] text-muted-foreground">
                  {d.transactionCount} {t("dld.txn")} · AED {formatAED(d.totalAmount)}
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full capitalize"
                  style={{ background: "hsl(var(--muted))", color: "hsl(var(--muted-foreground))" }}>
                  {localizeType(d.dominantType, t)}
                </span>
              </div>
            </div>
            <div className="text-right shrink-0">
              <p className="text-[12px] font-bold text-foreground">
                AED {d.avgPricePerSqft.toLocaleString()}
              </p>
              <p className="text-[10px] text-muted-foreground">{t("dld.per_sqft")}</p>
              <ChangeIndicator value={d.changePercent} />
            </div>
            <ChevronRight size={14} className="text-muted-foreground shrink-0" />
          </motion.button>
        ))}
      </div>
    </div>
  );
}

function TrendCharts({
  trends,
  t,
}: {
  trends: DLDMonthlyTrend[];
  t: (key: string) => string;
}) {
  const chartData = useMemo(() => {
    const districtMap = new Map<string, Map<string, DLDMonthlyTrend>>();
    for (const tr of trends) {
      if (!districtMap.has(tr.district)) districtMap.set(tr.district, new Map());
      districtMap.get(tr.district)!.set(tr.month, tr);
    }

    const months = [...new Set(trends.map(tr => tr.month))].sort();
    const districts = [...districtMap.keys()];

    return months.map(month => {
      const row: Record<string, string | number> = { month: month.slice(2) };
      for (const d of districts) {
        const tr = districtMap.get(d)?.get(month);
        row[d] = tr?.avgPricePerSqft || 0;
      }
      return row;
    });
  }, [trends]);

  const districts = useMemo(() => [...new Set(trends.map(tr => tr.district))], [trends]);
  const colors = ["#EAB308", "#3B82F6", "#10B981", "#F97316", "#8B5CF6", "#EC4899"];

  return (
    <div className="mt-6">
      <h2 className="text-sm font-bold mb-3 text-foreground">
        {t("dld.price_trends")}
      </h2>
      <div className="rounded-xl p-3" style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border) / 0.5)" }}>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#888" }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fontSize: 10, fill: "#888" }} tickLine={false} axisLine={false} tickFormatter={v => `${v}`} />
            <Tooltip
              contentStyle={{
                background: navy,
                border: "none",
                borderRadius: "10px",
                color: "#fff",
                fontSize: "11px",
              }}
              formatter={(value: number) => [`AED ${value.toLocaleString()}${t("dld.per_sqft")}`, ""]}
            />
            <Legend wrapperStyle={{ fontSize: "10px" }} />
            {districts.map((d, i) => (
              <Line
                key={d}
                type="monotone"
                dataKey={d}
                stroke={colors[i % colors.length]}
                strokeWidth={2}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function VolumeChart({
  trends,
  t,
}: {
  trends: DLDMonthlyTrend[];
  t: (key: string) => string;
}) {
  const chartData = useMemo(() => {
    const allDubai = trends.filter(tr => tr.district === "All Dubai");
    if (allDubai.length > 0) {
      return allDubai.map(tr => ({
        month: tr.month.slice(2),
        transactions: tr.transactionCount,
        volume: Math.round(tr.totalVolume / 1_000_000),
      }));
    }
    const months = [...new Set(trends.map(tr => tr.month))].sort();
    return months.map(m => {
      const monthTrends = trends.filter(tr => tr.month === m);
      return {
        month: m.slice(2),
        transactions: monthTrends.reduce((s, tr) => s + tr.transactionCount, 0),
        volume: Math.round(monthTrends.reduce((s, tr) => s + tr.totalVolume, 0) / 1_000_000),
      };
    });
  }, [trends]);

  return (
    <div className="mt-6">
      <h2 className="text-sm font-bold mb-3 text-foreground">
        {t("dld.volume_trends")}
      </h2>
      <div className="rounded-xl p-3" style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border) / 0.5)" }}>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#888" }} tickLine={false} axisLine={false} />
            <YAxis yAxisId="left" tick={{ fontSize: 10, fill: "#888" }} tickLine={false} axisLine={false} />
            <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fill: "#888" }} tickLine={false} axisLine={false} />
            <Tooltip
              contentStyle={{
                background: navy,
                border: "none",
                borderRadius: "10px",
                color: "#fff",
                fontSize: "11px",
              }}
            />
            <Legend wrapperStyle={{ fontSize: "10px" }} />
            <Bar yAxisId="left" dataKey="transactions" fill={goldHex} radius={[4, 4, 0, 0]} name={t("dld.chart_transactions")} />
            <Bar yAxisId="right" dataKey="volume" fill="#3B82F6" radius={[4, 4, 0, 0]} name={t("dld.chart_volume_m")} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function DistrictHeatmap({ summaries, onSelect, t }: { summaries: DLDDistrictSummary[]; onSelect: (d: string) => void; t: (key: string) => string }) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState(false);
  const maxTx = Math.max(...summaries.map(s => s.transactionCount), 1);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    let cancelled = false;
    loadMapbox().then(mapboxgl => {
      if (cancelled || !mapContainerRef.current) return;
      mapboxgl.accessToken = MAPBOX_ACCESS_TOKEN;
      if (!mapboxgl.accessToken) { setMapError(true); return; }

      const map = new mapboxgl.Map({
        container: mapContainerRef.current,
        style: "mapbox://styles/mapbox/dark-v11",
        center: [55.27, 25.20],
        zoom: 10.5,
        attributionControl: false,
        interactive: true,
      });

      mapRef.current = map;

      map.on("load", () => {
        if (cancelled) return;
        setMapLoaded(true);
      });
    }).catch(() => {
      if (!cancelled) setMapError(true);
    });

    return () => {
      cancelled = true;
      markersRef.current.forEach(m => m.remove());
      markersRef.current = [];
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!mapLoaded || !mapRef.current) return;
    const map = mapRef.current;
    const mapboxgl = getMapboxgl();
    if (!mapboxgl) return;

    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    for (const s of summaries) {
      if (!s.lat || !s.lng) continue;
      const intensity = s.transactionCount / maxTx;
      const size = 28 + intensity * 32;
      const opacity = 0.3 + intensity * 0.5;

      const el = document.createElement("div");
      el.className = "dld-marker";
      el.style.cssText = `
        width: ${size}px; height: ${size}px; border-radius: 50%;
        background: rgba(234,179,8,${opacity}); border: 2px solid rgba(234,179,8,0.8);
        cursor: pointer; display: flex; align-items: center; justify-content: center;
        font-size: 9px; font-weight: 700; color: #fff; text-align: center;
        line-height: 1.1; padding: 2px; box-shadow: 0 0 ${size/2}px rgba(234,179,8,${opacity * 0.5});
      `;
      el.innerHTML = `<span>${s.transactionCount}</span>`;
      el.title = `${s.district}: ${s.transactionCount} ${t("dld.tx_label")} — AED ${formatAED(s.avgPricePerSqft)}${t("dld.per_sqft")}`;
      el.addEventListener("click", () => onSelect(s.district));

      const marker = new mapboxgl.Marker({ element: el })
        .setLngLat([s.lng, s.lat])
        .addTo(map);
      markersRef.current.push(marker);
    }
  }, [mapLoaded, summaries, maxTx, onSelect, t]);

  if (mapError) {
    return <HeatmapGrid summaries={summaries} onSelect={onSelect} t={t} />;
  }

  return (
    <div className="mt-4 rounded-xl overflow-hidden" style={{ background: navy, border: "1px solid rgba(255,255,255,0.08)" }}>
      <div className="p-3">
        <p className="text-[11px] text-white/50 font-medium mb-2 uppercase tracking-wider">{t("dld.heatmap_title")}</p>
        <div ref={mapContainerRef} className="rounded-lg overflow-hidden" style={{ height: 280 }} />
      </div>
      <div className="px-3 pb-3 flex items-center gap-2">
        <span className="text-[9px] text-white/40">{t("dld.heatmap_low")}</span>
        <div className="flex-1 h-1.5 rounded-full" style={{
          background: "linear-gradient(to right, rgba(234,179,8,0.1), rgba(234,179,8,0.7))"
        }} />
        <span className="text-[9px] text-white/40">{t("dld.heatmap_high")}</span>
      </div>
    </div>
  );
}

function HeatmapGrid({ summaries, onSelect, t }: { summaries: DLDDistrictSummary[]; onSelect: (d: string) => void; t: (key: string) => string }) {
  const maxTx = Math.max(...summaries.map(s => s.transactionCount), 1);

  return (
    <div className="mt-4 rounded-xl overflow-hidden" style={{ background: navy, border: "1px solid rgba(255,255,255,0.08)" }}>
      <div className="p-3">
        <p className="text-[11px] text-white/50 font-medium mb-2 uppercase tracking-wider">{t("dld.heatmap_title")}</p>
        <div className="grid grid-cols-3 gap-1.5">
          {summaries.map(s => {
            const intensity = s.transactionCount / maxTx;
            const bg = `rgba(234,179,8,${0.1 + intensity * 0.6})`;
            return (
              <button
                key={s.district}
                onClick={() => onSelect(s.district)}
                className="p-2 rounded-lg text-left transition-all hover:scale-[1.02] active:scale-[0.98]"
                style={{ background: bg }}
              >
                <p className="text-[10px] font-bold text-white truncate">{s.district}</p>
                <p className="text-[9px] text-white/60">{s.transactionCount} {t("dld.tx_label")}</p>
                <p className="text-[9px] text-white/60">AED {formatAED(s.avgPricePerSqft)}{t("dld.per_sqft")}</p>
              </button>
            );
          })}
        </div>
      </div>
      <div className="px-3 pb-3 flex items-center gap-2">
        <span className="text-[9px] text-white/40">{t("dld.heatmap_low")}</span>
        <div className="flex-1 h-1.5 rounded-full" style={{
          background: "linear-gradient(to right, rgba(234,179,8,0.1), rgba(234,179,8,0.7))"
        }} />
        <span className="text-[9px] text-white/40">{t("dld.heatmap_high")}</span>
      </div>
    </div>
  );
}

const TX_PAGE_SIZE = 10;

function DistrictDetailDrawer({
  district,
  onClose,
  paginatedTx,
  txPage,
  txPageLoading,
  onPageChange,
  districtSummary,
  trends,
  t,
}: {
  district: string;
  onClose: () => void;
  paginatedTx: PaginatedResult<DLDTransaction>;
  txPage: number;
  txPageLoading: boolean;
  onPageChange: (page: number) => void;
  districtSummary: DLDDistrictSummary | undefined;
  trends: DLDMonthlyTrend[];
  t: (key: string) => string;
}) {
  const totalPages = Math.max(1, Math.ceil(paginatedTx.total / TX_PAGE_SIZE));

  const stats = useMemo(() => {
    let typeBreakdown: { type: string; count: number; pct: number }[];
    if (districtSummary?.typeBreakdown && districtSummary.typeBreakdown.length > 0) {
      typeBreakdown = districtSummary.typeBreakdown;
    } else {
      const typeCount = new Map<string, number>();
      for (const tx of paginatedTx.data) {
        typeCount.set(tx.propertyType, (typeCount.get(tx.propertyType) || 0) + 1);
      }
      typeBreakdown = [...typeCount.entries()]
        .sort((a, b) => b[1] - a[1])
        .map(([type, count]) => ({ type, count, pct: Math.round((count / paginatedTx.data.length) * 100) }));
    }

    return {
      totalTx: districtSummary?.transactionCount ?? paginatedTx.total,
      totalAmount: districtSummary?.totalAmount ?? paginatedTx.data.reduce((s, tx) => s + tx.amount, 0),
      avgPrice: districtSummary?.avgPricePerSqft ?? (paginatedTx.data.length > 0
        ? Math.round(paginatedTx.data.reduce((s, tx) => s + tx.pricePerSqft, 0) / paginatedTx.data.length)
        : 0),
      typeBreakdown,
    };
  }, [paginatedTx, districtSummary]);

  const districtTrends = useMemo(() => {
    return trends.filter(tr => tr.district === district).map(tr => ({
      month: tr.month.slice(2),
      price: tr.avgPricePerSqft,
      txn: tr.transactionCount,
    }));
  }, [trends, district]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/50"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        onClick={e => e.stopPropagation()}
        className="absolute bottom-0 left-0 right-0 max-h-[85vh] overflow-y-auto rounded-t-2xl"
        style={{ background: "hsl(var(--background))" }}
      >
        <div className="sticky top-0 z-10 px-4 pt-4 pb-3 flex items-center justify-between"
          style={{ background: navy }}>
          <div>
            <h2 className="text-base font-bold text-white">{district}</h2>
            <p className="text-[11px] text-white/50">{t("dld.district_details")}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center bg-white/10">
            <X size={16} color="#fff" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div className="grid grid-cols-3 gap-2">
            <div className="p-3 rounded-xl text-center" style={{ background: "hsl(var(--muted))" }}>
              <p className="text-[18px] font-extrabold text-foreground">{stats.totalTx}</p>
              <p className="text-[10px] text-muted-foreground">{t("dld.transactions")}</p>
            </div>
            <div className="p-3 rounded-xl text-center" style={{ background: "hsl(var(--muted))" }}>
              <p className="text-[18px] font-extrabold text-foreground">AED {formatAED(stats.totalAmount)}</p>
              <p className="text-[10px] text-muted-foreground">{t("dld.total_volume")}</p>
            </div>
            <div className="p-3 rounded-xl text-center" style={{ background: "hsl(var(--muted))" }}>
              <p className="text-[18px] font-extrabold text-foreground">{stats.avgPrice.toLocaleString()}</p>
              <p className="text-[10px] text-muted-foreground">AED {t("dld.per_sqft")}</p>
            </div>
          </div>

          <div>
            <h3 className="text-xs font-bold mb-2 text-foreground">{t("dld.type_breakdown")}</h3>
            <div className="space-y-1.5">
              {stats.typeBreakdown.map(tb => (
                <div key={tb.type} className="flex items-center gap-2">
                  <span className="text-[11px] capitalize w-20 text-muted-foreground">{localizeType(tb.type, t)}</span>
                  <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: "hsl(var(--muted))" }}>
                    <div className="h-full rounded-full" style={{ width: `${tb.pct}%`, background: goldHex }} />
                  </div>
                  <span className="text-[11px] font-bold w-10 text-right text-foreground">{tb.pct}%</span>
                </div>
              ))}
            </div>
          </div>

          {districtTrends.length > 0 && (
            <div>
              <h3 className="text-xs font-bold mb-2 text-foreground">{t("dld.price_history")}</h3>
              <div className="rounded-xl p-2" style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border) / 0.5)" }}>
                <ResponsiveContainer width="100%" height={160}>
                  <LineChart data={districtTrends}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="month" tick={{ fontSize: 9, fill: "#888" }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 9, fill: "#888" }} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={{ background: navy, border: "none", borderRadius: "8px", color: "#fff", fontSize: "10px" }} />
                    <Line type="monotone" dataKey="price" stroke={goldHex} strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-bold text-foreground">{t("dld.top_transactions")}</h3>
              {paginatedTx.total > 0 && (
                <span className="text-[10px] text-muted-foreground">
                  {paginatedTx.offset + 1}–{Math.min(paginatedTx.offset + paginatedTx.data.length, paginatedTx.total)} of {paginatedTx.total}
                </span>
              )}
            </div>
            <div className="space-y-2" style={{ opacity: txPageLoading ? 0.5 : 1, transition: "opacity 0.15s ease" }}>
              {paginatedTx.data.map(tx => (
                <motion.div
                  key={tx.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-3 rounded-xl"
                  style={{ background: "hsl(var(--muted))" }}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] font-bold text-foreground">
                      AED {tx.amount.toLocaleString()}
                    </span>
                    <span className="text-[10px] capitalize text-muted-foreground">{localizeType(tx.propertyType, t)}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground">
                    <span>{tx.areaSqft.toLocaleString()} {t("dld.sqft")}</span>
                    <span>·</span>
                    <span>AED {tx.pricePerSqft.toLocaleString()} {t("dld.per_sqft")}</span>
                    {tx.bedrooms && <><span>·</span><span>{tx.bedrooms} {t("dld.br")}</span></>}
                    <span>·</span>
                    <span>{tx.transactionDate}</span>
                  </div>
                  {tx.buildingName && (
                    <p className="text-[10px] text-muted-foreground mt-0.5">{tx.buildingName}</p>
                  )}
                </motion.div>
              ))}
            </div>
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-3">
                <button
                  onClick={() => onPageChange(txPage - 1)}
                  disabled={txPage <= 0}
                  className="px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all disabled:opacity-30"
                  style={{ background: "hsl(var(--muted))", color: "hsl(var(--foreground))" }}
                >
                  {t("dld.prev_page")}
                </button>
                <span className="text-[11px] font-medium text-muted-foreground">
                  {txPage + 1} / {totalPages}
                </span>
                <button
                  onClick={() => onPageChange(txPage + 1)}
                  disabled={txPage >= totalPages - 1}
                  className="px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all disabled:opacity-30"
                  style={{ background: "hsl(var(--muted))", color: "hsl(var(--foreground))" }}
                >
                  {t("dld.next_page")}
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="h-8" />
      </motion.div>
    </motion.div>
  );
}

function FilterPanel({
  filters,
  onFiltersChange,
  districts,
  periodMode,
  onPeriodModeChange,
  t,
}: {
  filters: DLDAnalyticsFilters;
  onFiltersChange: (f: DLDAnalyticsFilters) => void;
  districts: string[];
  periodMode: PeriodMode;
  onPeriodModeChange: (m: PeriodMode) => void;
  t: (key: string) => string;
}) {
  const periodOptions = periodMode === "month" ? MONTH_OPTIONS
    : periodMode === "quarter" ? QUARTER_OPTIONS
    : YEAR_OPTIONS;

  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: "auto", opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      className="overflow-hidden"
    >
      <div className="py-3 space-y-3">
        <div>
          <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-1 block">
            {t("dld.period")}
          </label>
          <div className="flex gap-1.5 mb-2">
            {PERIOD_MODE_KEYS.map(m => (
              <button
                key={m.value}
                onClick={() => {
                  onPeriodModeChange(m.value);
                  const opts = m.value === "month" ? MONTH_OPTIONS
                    : m.value === "quarter" ? QUARTER_OPTIONS
                    : YEAR_OPTIONS;
                  onFiltersChange({ ...filters, period: opts[0].value });
                }}
                className="px-2.5 py-1 rounded-md text-[10px] font-medium transition-all"
                style={{
                  background: periodMode === m.value ? navy : "transparent",
                  color: periodMode === m.value ? goldHex : "hsl(var(--muted-foreground))",
                  border: `1px solid ${periodMode === m.value ? navy : "hsl(var(--border))"}`,
                }}
              >
                {t(m.i18nKey)}
              </button>
            ))}
          </div>
          <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {periodOptions.map(p => (
              <button
                key={p.value}
                onClick={() => onFiltersChange({ ...filters, period: p.value })}
                className="px-3 py-1.5 rounded-lg text-[11px] font-medium whitespace-nowrap transition-all"
                style={{
                  background: filters.period === p.value ? goldHex : "hsl(var(--muted))",
                  color: filters.period === p.value ? navy : "hsl(var(--muted-foreground))",
                }}
              >
                {t(p.i18nKey)}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-1 block">
            {t("dld.property_type")}
          </label>
          <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {TYPE_OPTION_KEYS.map(opt => (
              <button
                key={opt.value}
                onClick={() => onFiltersChange({
                  ...filters,
                  propertyType: opt.value === "all" ? undefined : opt.value,
                })}
                className="px-3 py-1.5 rounded-lg text-[11px] font-medium whitespace-nowrap transition-all"
                style={{
                  background: (filters.propertyType || "all") === opt.value ? goldHex : "hsl(var(--muted))",
                  color: (filters.propertyType || "all") === opt.value ? navy : "hsl(var(--muted-foreground))",
                }}
              >
                {t(opt.i18nKey)}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-1 block">
            {t("dld.district")}
          </label>
          <select
            value={filters.district || ""}
            onChange={e => onFiltersChange({ ...filters, district: e.target.value || undefined })}
            className="w-full text-[12px] px-3 py-2 rounded-lg border"
            style={{ background: "hsl(var(--card))", borderColor: "hsl(var(--border))", color: "hsl(var(--foreground))" }}
          >
            <option value="">{t("dld.all_districts")}</option>
            {districts.map(d => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-1 block">
            {t("dld.price_range")}
          </label>
          <div className="flex gap-2 items-center">
            <input
              type="number"
              placeholder={t("dld.min_price")}
              value={filters.minPrice || ""}
              onChange={e => onFiltersChange({ ...filters, minPrice: e.target.value ? Number(e.target.value) : undefined })}
              className="flex-1 text-[12px] px-3 py-2 rounded-lg border"
              style={{ background: "hsl(var(--card))", borderColor: "hsl(var(--border))", color: "hsl(var(--foreground))" }}
            />
            <span className="text-[10px] text-muted-foreground">–</span>
            <input
              type="number"
              placeholder={t("dld.max_price")}
              value={filters.maxPrice || ""}
              onChange={e => onFiltersChange({ ...filters, maxPrice: e.target.value ? Number(e.target.value) : undefined })}
              className="flex-1 text-[12px] px-3 py-2 rounded-lg border"
              style={{ background: "hsl(var(--card))", borderColor: "hsl(var(--border))", color: "hsl(var(--foreground))" }}
            />
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default function DubaiAnalyticsPage() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const [searchParams, setSearchParams] = useSearchParams();

  const urlDistrict = searchParams.get("district") || undefined;
  const urlBuilding = searchParams.get("building") || undefined;
  const urlType = searchParams.get("type") || undefined;
  const urlBedrooms = searchParams.get("bedrooms") ? Number(searchParams.get("bedrooms")) : undefined;
  const urlSubjectPrice = searchParams.get("subjectPrice") ? Number(searchParams.get("subjectPrice")) : undefined;

  const [kpis, setKpis] = useState<DLDMarketKPI | null>(null);
  const [summaries, setSummaries] = useState<DLDDistrictSummary[]>([]);
  const [trends, setTrends] = useState<DLDMonthlyTrend[]>([]);
  const [allTrends, setAllTrends] = useState<DLDMonthlyTrend[]>([]);
  const [selectedDistrict, setSelectedDistrict] = useState<string | null>(null);
  const [districtTxResult, setDistrictTxResult] = useState<PaginatedResult<DLDTransaction>>({ data: [], total: 0, offset: 0, limit: TX_PAGE_SIZE });
  const [districtTxPage, setDistrictTxPage] = useState(0);
  const [districtTxPageLoading, setDistrictTxPageLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [periodMode, setPeriodMode] = useState<PeriodMode>("month");
  const [filters, setFilters] = useState<DLDAnalyticsFilters>({
    period: "2026-04",
    district: urlDistrict,
    propertyType: urlType as DLDPropertyType | undefined,
  });
  const [loading, setLoading] = useState(true);
  const [dataSource, setDataSource] = useState<"live" | "demo">("demo");

  const [activeBuilding, setActiveBuilding] = useState<string>(urlBuilding || "");
  const [activeBuildingDistrict, setActiveBuildingDistrict] = useState<string>(urlDistrict || "");
  const [activeBuildingPricePerSqft, setActiveBuildingPricePerSqft] = useState<number | undefined>(urlSubjectPrice);
  const [activeBuildingPropertyType, setActiveBuildingPropertyType] = useState<string | undefined>(urlType);
  const [activeBuildingBedrooms, setActiveBuildingBedrooms] = useState<number | undefined>(urlBedrooms);
  const hasSubjectContext = useRef(Boolean(urlType || urlBedrooms !== undefined || urlSubjectPrice));

  const [districts, setDistricts] = useState<string[]>([]);
  const districtRequestVersion = useRef(0);

  useEffect(() => {
    dldAnalyticsService.getAvailableDistricts().then(setDistricts);
    dldAnalyticsService.getAvailableDistrictsFromDb().then((dbDistricts) => {
      if (dbDistricts && dbDistricts.length > 0) {
        setDistricts(dbDistricts);
      }
    });
  }, []);

  const loadData = useCallback(async (f: DLDAnalyticsFilters) => {
    setLoading(true);
    resetDataSourceTracking();
    try {
      const [kpiData, summaryData, trendData, allTrendData] = await Promise.all([
        dldAnalyticsService.getMarketKPIs(f),
        dldAnalyticsService.getDistrictSummaries(f),
        dldAnalyticsService.getMonthlyTrends(
          f.district ? [f.district] : ["Dubai Marina", "Downtown Dubai", "Palm Jumeirah", "JVC", "Business Bay"],
          f
        ),
        dldAnalyticsService.getMonthlyTrends(undefined, f),
      ]);
      setKpis(kpiData);
      setSummaries(summaryData);
      setTrends(trendData);
      setAllTrends(allTrendData);
      setDataSource(getDataSource());
    } catch (err) {
      console.error("[DubaiAnalytics] Failed to load data", err);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData(filters);
  }, [filters, loadData]);

  const handleSelectDistrict = useCallback(async (district: string) => {
    setSelectedDistrict(district);
    setActiveBuildingDistrict(district);
    setActiveBuilding("");
    setActiveBuildingPricePerSqft(undefined);
    setActiveBuildingPropertyType(undefined);
    setActiveBuildingBedrooms(undefined);
    hasSubjectContext.current = false;
    setDistrictTxPage(0);
    setFilters(prev => ({ ...prev, district }));
    const version = ++districtRequestVersion.current;
    const result = await dldAnalyticsService.getDistrictTransactions(district, filters, 0, TX_PAGE_SIZE);
    if (districtRequestVersion.current === version) {
      setDistrictTxResult(result);
    }
  }, [filters]);

  const handleBuildingSelect = useCallback((building: string, district: string, avgPricePerSqft?: number, dominantType?: string, dominantBedrooms?: number) => {
    setActiveBuilding(building);
    setActiveBuildingDistrict(district);
    if (hasSubjectContext.current) {
      hasSubjectContext.current = false;
    } else {
      setActiveBuildingPricePerSqft(avgPricePerSqft);
      setActiveBuildingPropertyType(dominantType);
      setActiveBuildingBedrooms(dominantBedrooms);
    }
  }, []);

  const handleDistrictTxPageChange = useCallback(async (page: number) => {
    if (!selectedDistrict) return;
    setDistrictTxPage(page);
    setDistrictTxPageLoading(true);
    const version = ++districtRequestVersion.current;
    const result = await dldAnalyticsService.getDistrictTransactions(
      selectedDistrict,
      filters,
      page * TX_PAGE_SIZE,
      TX_PAGE_SIZE,
    );
    if (districtRequestVersion.current === version) {
      setDistrictTxResult(result);
      setDistrictTxPageLoading(false);
    }
  }, [selectedDistrict, filters]);

  useEffect(() => {
    if (!selectedDistrict) return;
    setDistrictTxPage(0);
    const version = ++districtRequestVersion.current;
    dldAnalyticsService.getDistrictTransactions(selectedDistrict, filters, 0, TX_PAGE_SIZE).then(result => {
      if (districtRequestVersion.current === version) {
        setDistrictTxResult(result);
      }
    });
  }, [filters, selectedDistrict]);

  useEffect(() => {
    const params = new URLSearchParams();
    const district = filters.district || activeBuildingDistrict;
    if (district) params.set("district", district);
    if (activeBuilding) params.set("building", activeBuilding);
    if (activeBuildingPropertyType) params.set("type", activeBuildingPropertyType);
    if (activeBuildingBedrooms !== undefined && activeBuildingBedrooms !== null) params.set("bedrooms", String(activeBuildingBedrooms));
    if (activeBuildingPricePerSqft) params.set("subjectPrice", String(activeBuildingPricePerSqft));
    const newSearch = params.toString();
    const currentSearch = searchParams.toString();
    if (newSearch !== currentSearch) {
      setSearchParams(params, { replace: true });
    }
  }, [filters.district, activeBuildingDistrict, activeBuilding, activeBuildingPropertyType, activeBuildingBedrooms, activeBuildingPricePerSqft]);

  const handleFiltersChange = useCallback((newFilters: DLDAnalyticsFilters) => {
    setFilters(newFilters);
    if (newFilters.district !== filters.district) {
      setActiveBuildingDistrict(newFilters.district || "");
      setActiveBuilding("");
      setActiveBuildingPricePerSqft(undefined);
      setActiveBuildingPropertyType(undefined);
      setActiveBuildingBedrooms(undefined);
    }
  }, [filters.district]);

  return (
    <SubPageShell noContentPad>
      <div style={{ background: navy }} className="px-4 pt-4 pb-5">
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={() => navigate(-1)}
            className="w-9 h-9 rounded-xl flex items-center justify-center bg-white/10 active:scale-95 transition-transform"
          >
            <ArrowLeft size={18} color="#fff" />
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-bold text-white">{t("dld.page_title")}</h1>
            <div className="flex items-center gap-2">
              <p className="text-[11px] text-white/50">{t("dld.page_subtitle")}</p>
              {!loading && (
                <span
                  className="inline-flex items-center gap-1 text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded-full"
                  style={{
                    background: dataSource === "live" ? "rgba(34,197,94,0.15)" : "rgba(234,179,8,0.15)",
                    color: dataSource === "live" ? "#22c55e" : goldHex,
                    border: `1px solid ${dataSource === "live" ? "rgba(34,197,94,0.3)" : "rgba(234,179,8,0.3)"}`,
                  }}
                >
                  <span
                    className="w-1.5 h-1.5 rounded-full"
                    style={{
                      background: dataSource === "live" ? "#22c55e" : goldHex,
                    }}
                  />
                  {dataSource === "live" ? t("dld.data_live") : t("dld.data_demo")}
                </span>
              )}
            </div>
          </div>
          <ShareButtons type="analytics" slug="dubai" title={t("dld.page_title")} />
          <button
            onClick={() => setShowFilters(f => !f)}
            className="w-9 h-9 rounded-xl flex items-center justify-center transition-all"
            style={{ background: showFilters ? goldHex : "rgba(255,255,255,0.1)" }}
          >
            <SlidersHorizontal size={16} color={showFilters ? navy : "#fff"} />
          </button>
        </div>

        {kpis && (
          <div className="grid grid-cols-2 gap-2">
            <KPICard
              label={t("dld.total_transactions")}
              value={kpis.totalTransactions.toLocaleString()}
              icon={<Activity size={14} color={goldHex} />}
            />
            <KPICard
              label={t("dld.total_volume")}
              value={`AED ${formatAED(kpis.totalVolume)}`}
              icon={<BarChart3 size={14} color={goldHex} />}
            />
            <KPICard
              label={t("dld.avg_price_sqft")}
              value={`AED ${kpis.avgPricePerSqft.toLocaleString()}`}
              change={kpis.changeVsPrevious}
              icon={<TrendingUp size={14} color={goldHex} />}
            />
            <KPICard
              label={t("dld.period_label")}
              value={(() => {
                const all = [...MONTH_OPTIONS, ...QUARTER_OPTIONS, ...YEAR_OPTIONS];
                const found = all.find(p => p.value === kpis.period);
                return found ? t(found.i18nKey) : kpis.period;
              })()}
              icon={<MapPin size={14} color={goldHex} />}
            />
          </div>
        )}
      </div>

      <div className="px-4">
        <AnimatePresence>
          {showFilters && (
            <FilterPanel
              filters={filters}
              onFiltersChange={handleFiltersChange}
              districts={districts}
              periodMode={periodMode}
              onPeriodModeChange={setPeriodMode}
              t={t}
            />
          )}
        </AnimatePresence>

        {loading ? (
          <div className="space-y-3 mt-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 rounded-xl animate-pulse" style={{ background: "hsl(var(--muted))" }} />
            ))}
          </div>
        ) : (
          <>
            <DistrictHeatmap summaries={summaries} onSelect={handleSelectDistrict} t={t} />
            <DistrictRankingTable summaries={summaries} onSelectDistrict={handleSelectDistrict} t={t} />
            <TrendCharts trends={trends} t={t} />
            <VolumeChart trends={allTrends} t={t} />

            <BuildingPriceHistory
              preselectedBuilding={activeBuilding || undefined}
              preselectedDistrict={activeBuildingDistrict || filters.district}
              onBuildingSelect={handleBuildingSelect}
              onBuildingClear={() => {
                setActiveBuilding("");
                setActiveBuildingPricePerSqft(undefined);
                setActiveBuildingPropertyType(undefined);
                setActiveBuildingBedrooms(undefined);
                hasSubjectContext.current = false;
              }}
            />

            {(activeBuildingDistrict || filters.district) && (
              <ComparableSales
                district={activeBuildingDistrict || filters.district || ""}
                propertyType={activeBuildingPropertyType || filters.propertyType}
                bedrooms={activeBuildingBedrooms}
                subjectPricePerSqft={activeBuildingPricePerSqft}
              />
            )}
          </>
        )}

        <div className="h-8" />
      </div>

      <AnimatePresence>
        {selectedDistrict && (
          <DistrictDetailDrawer
            district={selectedDistrict}
            onClose={() => setSelectedDistrict(null)}
            paginatedTx={districtTxResult}
            txPage={districtTxPage}
            txPageLoading={districtTxPageLoading}
            onPageChange={handleDistrictTxPageChange}
            districtSummary={summaries.find(s => s.district === selectedDistrict)}
            trends={allTrends}
            t={t}
          />
        )}
      </AnimatePresence>
    </SubPageShell>
  );
}
