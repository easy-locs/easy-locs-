import { memo, useMemo } from "react";
import { Link } from "react-router-dom";
import { TrendingUp, ChevronRight, RefreshCw } from "lucide-react";
import { motion } from "framer-motion";
import { useForexRates } from "@/hooks/useForexRates";

const WIDGET_PAIRS = [
  { base: "EUR", target: "USD", flag: "🇪🇺🇺🇸" },
  { base: "EUR", target: "MAD", flag: "🇪🇺🇲🇦" },
  { base: "EUR", target: "AED", flag: "🇪🇺🇦🇪" },
];

const ForexWidget = memo(function ForexWidget() {
  const { snapshot, loading, getRate } = useForexRates();

  const rates = useMemo(() => {
    if (!snapshot) return [];
    return WIDGET_PAIRS.map((pair) => {
      const rate = getRate(pair.base, pair.target);
      return { ...pair, rate };
    });
  }, [snapshot, getRate]);

  if (loading && !snapshot) {
    return (
      <div
        className="rounded-2xl p-3 animate-pulse"
        style={{
          background: "linear-gradient(135deg, hsl(220 40% 16%), hsl(220 40% 20%))",
          border: "1px solid hsl(0 0% 100% / 0.06)",
        }}
      >
        <div className="h-16 rounded-lg bg-white/5" />
      </div>
    );
  }

  if (!snapshot || rates.length === 0) {
    return (
      <Link to="/wallet/forex" className="block">
        <div
          className="rounded-2xl p-3"
          style={{
            background: "linear-gradient(135deg, hsl(220 40% 16%), hsl(220 40% 20%))",
            border: "1px solid hsl(0 0% 100% / 0.06)",
          }}
        >
          <div className="flex items-center gap-2 mb-2">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: "hsl(142 65% 45% / 0.12)" }}
            >
              <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
            </div>
            <p className="text-[11px] font-bold text-white/60 uppercase tracking-wide">
              Live Forex
            </p>
          </div>
          <p className="text-xs text-white/30">
            Taux de change indisponibles pour le moment
          </p>
        </div>
      </Link>
    );
  }

  return (
    <Link to="/wallet/forex" className="block">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl p-3 active:scale-[0.98] transition-transform"
        style={{
          background: "linear-gradient(135deg, hsl(220 40% 16%), hsl(220 40% 20%))",
          border: "1px solid hsl(0 0% 100% / 0.06)",
        }}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: "hsl(142 65% 45% / 0.12)" }}
            >
              <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
            </div>
            <p className="text-[11px] font-bold text-white/60 uppercase tracking-wide">
              Live Forex
            </p>
            {loading && <RefreshCw className="h-2.5 w-2.5 text-white/30 animate-spin" />}
          </div>
          <ChevronRight className="h-3.5 w-3.5 text-white/30" />
        </div>

        <div className="flex gap-2">
          {rates.map((r) => (
            <div
              key={`${r.base}${r.target}`}
              className="flex-1 rounded-xl px-2 py-1.5"
              style={{ background: "hsl(0 0% 100% / 0.04)" }}
            >
              <p className="text-[9px] font-bold text-white/40 leading-none mb-0.5">
                {r.base}/{r.target}
              </p>
              <p className="text-xs font-extrabold tabular-nums" style={{ color: r.rate != null ? "hsl(38 65% 56%)" : "hsl(0 0% 100% / 0.3)" }}>
                {r.rate != null ? r.rate.toFixed(4) : "Indisponible"}
              </p>
            </div>
          ))}
        </div>

        {snapshot.fetchedAt && (() => {
          const d = new Date(snapshot.fetchedAt);
          if (Number.isNaN(d.getTime())) return null;
          return (
            <p className="text-[8px] text-white/20 mt-1.5 text-right">
              {snapshot.source === "frankfurter_fallback" ? "ECB" : "Live"} · {d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" })} {d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
            </p>
          );
        })()}
      </motion.div>
    </Link>
  );
});

export default ForexWidget;
