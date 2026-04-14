import { memo } from "react";
import { Link } from "react-router-dom";
import { Clock, Bell, BellOff, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";
import { usePrayerTimes } from "@/hooks/usePrayerTimes";

const PRAYER_ICONS: Record<string, string> = {
  Fajr: "🌙",
  Dhuhr: "☀️",
  Asr: "🌤️",
  Maghrib: "🌅",
  Isha: "🌃",
};

interface PrayerTimesWidgetProps {
  country?: string;
  notificationsEnabled?: boolean;
}

const PrayerTimesWidget = memo(function PrayerTimesWidget({
  country,
  notificationsEnabled = false,
}: PrayerTimesWidgetProps) {
  const { loading, nextPrayer, countdown, error } = usePrayerTimes(country);

  if (loading) {
    return (
      <div
        className="rounded-2xl p-3 animate-pulse"
        style={{
          background: "linear-gradient(135deg, hsl(226 24% 11%), hsl(226 22% 15%))",
          border: "1px solid hsl(0 0% 100% / 0.05)",
          boxShadow: "0 2px 8px hsl(0 0% 0% / 0.15)",
        }}
      >
        <div className="h-14 rounded-lg skeleton-premium" />
      </div>
    );
  }

  if (error || !nextPrayer) {
    return (
      <Link to="/dashboard/prayer-times" className="block">
        <div
          className="rounded-2xl p-3"
          style={{
            background: "linear-gradient(135deg, hsl(226 24% 11%), hsl(226 22% 15%))",
            border: "1px solid hsl(0 0% 100% / 0.05)",
            boxShadow: "0 2px 8px hsl(0 0% 0% / 0.15)",
          }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: "hsl(var(--accent) / 0.1)" }}
            >
              <span className="text-lg">🕌</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-bold text-white/55 uppercase tracking-wide">
                Horaires de Prière
              </p>
              <p className="text-xs text-white/35 mt-0.5">
                {error ? "Appuyez pour réessayer" : "Aucune donnée disponible"}
              </p>
            </div>
            <ChevronRight className="h-3.5 w-3.5 text-white/30 shrink-0" />
          </div>
        </div>
      </Link>
    );
  }

  const icon = PRAYER_ICONS[nextPrayer.name] || "🕌";

  return (
    <Link to="/dashboard/prayer-times" className="block">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl p-3 active:scale-[0.98] transition-transform"
        style={{
          background: "linear-gradient(135deg, hsl(226 24% 11%), hsl(226 22% 15%))",
          border: "1px solid hsl(0 0% 100% / 0.05)",
          boxShadow: "0 2px 8px hsl(0 0% 0% / 0.15)",
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: "hsl(var(--accent) / 0.1)" }}
          >
            <span className="text-lg">{icon}</span>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="text-[11px] font-bold text-white/60 uppercase tracking-wide">
                Next Prayer
              </p>
              {notificationsEnabled ? (
                <Bell className="h-3 w-3 text-emerald-400/70" />
              ) : (
                <BellOff className="h-3 w-3 text-white/25" />
              )}
            </div>
            <div className="flex items-baseline gap-2 mt-0.5">
              <p className="text-sm font-extrabold text-white leading-tight">
                {nextPrayer.name}
              </p>
              <p className="text-xs font-medium" style={{ color: "hsl(var(--accent))" }}>
                {nextPrayer.time}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg" style={{ background: "hsl(var(--accent) / 0.1)" }}>
              <Clock className="h-3 w-3" style={{ color: "hsl(var(--accent))" }} />
              <span className="text-[11px] font-bold tabular-nums" style={{ color: "hsl(var(--accent))" }}>
                {countdown || "—"}
              </span>
            </div>
            <ChevronRight className="h-3.5 w-3.5 text-white/30" />
          </div>
        </div>
      </motion.div>
    </Link>
  );
});

export default PrayerTimesWidget;
