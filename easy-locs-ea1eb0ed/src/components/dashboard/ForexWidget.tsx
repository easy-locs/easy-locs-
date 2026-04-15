import { memo, useMemo } from "react";
import { Link } from "react-router-dom";
import { TrendingUp, TrendingDown, ChevronRight, RefreshCw, BarChart3, AlertTriangle } from "lucide-react";
import { motion } from "framer-motion";
import { useForexRates, COUNTRY_SUGGESTED_PAIRS } from "@/hooks/useForexRates";
import { useI18n, tSafe } from "@/lib/i18n";
import { getCountryEntry } from "@/lib/global-country-registry";

const DEFAULT_PAIRS = [
  { base: "EUR", target: "USD" },
  { base: "EUR", target: "GBP" },
  { base: "USD", target: "AED" },
];

function MiniSparkline({ value }: { value: number }) {
  const points = useMemo(() => {
    const seed = Math.abs(value * 10000) % 100;
    const pts: number[] = [];
    let v = 50;
    for (let i = 0; i < 12; i++) {
      v += ((seed * (i + 1) * 7) % 20) - 10;
      v = Math.max(10, Math.min(90, v));
      pts.push(v);
    }
    return pts.map((y, i) => `${(i / 11) * 40},${40 - (y / 100) * 30}`).join(" ");
  }, [value]);

  const isUp = value > 0;
  return (
    <svg width="40" height="20" viewBox="0 0 40 40" className="shrink-0" style={{ opacity: 0.6 }} aria-hidden="true" role="presentation">
      <polyline
        points={points}
        fill="none"
        stroke={isUp ? "hsl(152 60% 42%)" : "hsl(0 60% 50%)"}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function sourceLabel(source: string): string {
  if (source.startsWith("ecb")) return "ECB";
  if (source.startsWith("frankfurter")) return "ECB";
  if (source.startsWith("exchangerate")) return "ER-API";
  if (source === "static") return "Indicatif";
  if (source.includes("engine")) return "Cache";
  return "Live";
}

interface ForexWidgetProps {
  countryCode?: string;
}

const ForexWidget = memo(function ForexWidget({ countryCode = "AE" }: ForexWidgetProps) {
  const { t } = useI18n();
  const { snapshot, loading, getRate } = useForexRates();

  const isStatic = snapshot?.source === "static";

  const countryEntry = useMemo(() => getCountryEntry(countryCode), [countryCode]);
  const pairs = useMemo(() => {
    return COUNTRY_SUGGESTED_PAIRS[countryCode] ?? DEFAULT_PAIRS;
  }, [countryCode]);

  const rates = useMemo(() => {
    if (!snapshot) return [];
    return pairs.slice(0, 3).map((pair) => {
      const rate = getRate(pair.base, pair.target);
      return { ...pair, rate };
    });
  }, [snapshot, getRate, pairs]);

  if (loading && !snapshot) {
    return (
      <div className="home-card--gradient rounded-2xl p-3 w-full">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-7 h-7 rounded-lg skeleton-premium" />
          <div className="h-3 w-20 rounded skeleton-premium" />
        </div>
        <div className="flex gap-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex-1 rounded-xl p-2">
              <div className="h-2.5 w-10 rounded skeleton-premium mb-1.5" />
              <div className="h-4 w-14 rounded skeleton-premium" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <Link to="/wallet/forex" className="block">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="home-card--gradient rounded-2xl p-3 w-full active:scale-[0.98] transition-transform"
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: isStatic ? "hsl(45 80% 50% / 0.1)" : "hsl(168 72% 44% / 0.1)" }}
            >
              {isStatic ? (
                <AlertTriangle className="h-3.5 w-3.5" style={{ color: "hsl(45 80% 50%)" }} />
              ) : (
                <TrendingUp className="h-3.5 w-3.5" style={{ color: "hsl(168 72% 44%)" }} />
              )}
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                {countryEntry && (
                  <span className="text-[11px]" aria-label={countryEntry.name}>{countryEntry.flag}</span>
                )}
                <p className="text-[11px] font-bold uppercase tracking-wide" style={{ color: "hsl(0 0% 100% / 0.45)" }}>
                  {tSafe(t, "forex.live_label", "Live Forex")}
                  {countryEntry && (
                    <span style={{ color: "hsl(0 0% 100% / 0.25)", marginLeft: 4, fontWeight: 500, fontSize: 9 }}>
                      {countryEntry.currency}
                    </span>
                  )}
                </p>
              </div>
              {isStatic && (
                <p className="text-[8px]" style={{ color: "hsl(45 80% 50% / 0.7)" }}>
                  {tSafe(t, "forex.indicative_short", "Taux indicatifs")}
                </p>
              )}
            </div>
            {loading && <RefreshCw className="h-2.5 w-2.5 animate-spin" style={{ color: "hsl(0 0% 100% / 0.2)" }} />}
          </div>
          <ChevronRight className="h-3.5 w-3.5" style={{ color: "hsl(0 0% 100% / 0.2)" }} />
        </div>

        <div className="flex gap-2">
          {rates.map((r) => (
            <div
              key={`${r.base}${r.target}`}
              className="flex-1 rounded-xl px-2 py-1.5"
              style={{ background: "hsl(0 0% 100% / 0.03)", border: "1px solid hsl(0 0% 100% / 0.03)" }}
            >
              <div className="flex items-center justify-between mb-0.5">
                <p className="text-[9px] font-bold leading-none" style={{ color: "hsl(0 0% 100% / 0.35)" }}>
                  {r.base}/{r.target}
                </p>
                {r.rate != null && <MiniSparkline value={r.rate} />}
              </div>
              <p className="text-xs font-extrabold tabular-nums" style={{ color: r.rate != null ? "hsl(var(--accent))" : "hsl(0 0% 100% / 0.2)" }}>
                {r.rate != null ? (() => {
                  const formatted = r.rate.toFixed(4);
                  const dotIdx = formatted.indexOf(".");
                  if (dotIdx === -1) return formatted;
                  return <>{formatted.slice(0, dotIdx)}<span style={{ display: "inline-block", transform: "scale(1.1)", fontWeight: 900, padding: "0 0.5px" }}>.</span>{formatted.slice(dotIdx + 1)}</>;
                })() : "\u2014"}
              </p>
            </div>
          ))}
        </div>

        {snapshot && snapshot.fetchedAt && (() => {
          const d = new Date(snapshot.fetchedAt);
          if (Number.isNaN(d.getTime())) return null;
          return (
            <p className="text-[8px] mt-1.5 text-right" style={{ color: "hsl(0 0% 100% / 0.15)" }}>
              {sourceLabel(snapshot.source)} · {d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" })} {d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
            </p>
          );
        })()}
      </motion.div>
    </Link>
  );
});

export default ForexWidget;
