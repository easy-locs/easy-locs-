import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { createRideService } from "@/domains/ride/service";
import { COMMISSION_RATE } from "@/domains/ride/pricing";
import type { DriverPeriodStats } from "@/domains/ride/ports";
import SubPageShell from "@/components/layout/SubPageShell";
import { motion } from "framer-motion";
import {
  DollarSign, TrendingUp, Car, Clock, Target,
  ChevronRight, ArrowLeft, Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";

type Period = "today" | "week" | "month";

export default function DriverTaxiEarningsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [period, setPeriod] = useState<Period>("today");
  const [stats, setStats] = useState<DriverPeriodStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    setLoading(true);
    const service = createRideService({ userId: user.id });
    service.getDriverStats(user.id, period)
      .then(result => {
        if (result.ok) setStats(result.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user?.id, period]);

  const totalCommission = stats
    ? stats.recentTrips.reduce((sum, t) => sum + t.commission, 0)
    : 0;
  const totalNet = stats
    ? stats.recentTrips.reduce((sum, t) => sum + t.netAmount, 0)
    : 0;

  const maxDailyEarning = stats
    ? Math.max(...stats.dailyBreakdown.map(d => d.earnings), 1)
    : 1;

  return (
    <SubPageShell noContentPad className="bg-background pb-[120px]" style={{ paddingTop: "max(8px, env(safe-area-inset-top, 0px))" }}>
      <header className="sticky top-0 z-20 backdrop-blur-xl flex items-center gap-3 px-4 pt-3 pb-2" style={{ background: "hsl(226 24% 14% / 0.95)" }}>
        <button
          onClick={() => navigate(-1)}
          className="w-9 h-9 rounded-xl flex items-center justify-center active:scale-95 transition-transform"
          style={{ background: "hsl(0 0% 100% / 0.1)" }}
        >
          <ArrowLeft className="w-4.5 h-4.5 text-white" />
        </button>
        <div className="flex items-center gap-2 flex-1">
          <TrendingUp className="w-5 h-5" style={{ color: "hsl(var(--accent))" }} />
          <h1 className="text-lg font-bold text-white tracking-tight">Earnings</h1>
        </div>
      </header>

      <div className="px-4 mt-4 space-y-4">
        <div className="flex gap-2">
          {(["today", "week", "month"] as Period[]).map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={cn(
                "flex-1 py-2.5 rounded-xl text-xs font-bold border transition-all capitalize",
                period === p ? "text-white" : "border-border/10 bg-card/60 text-muted-foreground"
              )}
              style={period === p ? { background: "hsl(226 24% 14%)", borderColor: "hsl(0 0% 100% / 0.08)" } : undefined}
            >
              {p === "today" ? "Today" : p === "week" ? "This Week" : "This Month"}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : stats ? (
          <>
            <div className="rounded-2xl p-5 text-center" style={{ background: "hsl(226 24% 14%)" }}>
              <p className="text-xs uppercase tracking-wider font-bold mb-1" style={{ color: "hsl(var(--accent) / 0.7)" }}>
                Total Earnings ({period})
              </p>
              <p className="text-3xl font-bold text-white">
                {stats.totalEarnings.toFixed(0)} <span className="text-base text-white/60">AED</span>
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {[
                { icon: Car, value: `${stats.totalTrips}`, label: "Trips", color: "hsl(var(--accent))" },
                { icon: Target, value: `${stats.acceptanceRate}%`, label: "Accept rate", color: "hsl(142 71% 45%)" },
                { icon: Clock, value: `${stats.hoursOnline}h`, label: "Hours active", color: "hsl(var(--accent))" },
                { icon: TrendingUp, value: `${stats.totalDistance} km`, label: "Distance", color: "hsl(142 71% 45%)" },
              ].map(({ icon: Icon, value, label, color }) => (
                <div key={label} className="rounded-2xl border border-border/20 bg-card p-4">
                  <Icon className="w-4 h-4 mb-2" style={{ color }} />
                  <p className="text-xl font-bold text-foreground">{value}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
                </div>
              ))}
            </div>

            <div className="rounded-2xl border border-border/20 bg-card p-4 space-y-2">
              <p className="text-xs font-bold text-foreground">Commission Summary</p>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Gross earnings</span>
                <span className="font-medium text-foreground">{stats.totalEarnings.toFixed(2)} AED</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Platform fee ({(COMMISSION_RATE * 100).toFixed(0)}%)</span>
                <span className="font-medium text-destructive">-{totalCommission.toFixed(2)} AED</span>
              </div>
              <div className="border-t border-border/15 pt-2 flex justify-between text-sm">
                <span className="font-bold text-foreground">Net earnings</span>
                <span className="font-bold text-foreground">{totalNet.toFixed(2)} AED</span>
              </div>
            </div>

            {stats.dailyBreakdown.length > 0 && (
              <div className="rounded-2xl border border-border/20 bg-card p-4 space-y-3">
                <p className="text-xs font-bold text-foreground">Daily Breakdown</p>
                <div className="flex items-end gap-1.5" style={{ height: 120 }}>
                  {stats.dailyBreakdown.slice(-7).map((day) => {
                    const height = Math.max((day.earnings / maxDailyEarning) * 100, 4);
                    const dayLabel = new Date(day.date).toLocaleDateString("en", { weekday: "short" });
                    return (
                      <div key={day.date} className="flex-1 flex flex-col items-center gap-1">
                        <span className="text-[0.5625rem] text-muted-foreground font-bold">{day.earnings.toFixed(0)}</span>
                        <div
                          className="w-full rounded-t-lg transition-all"
                          style={{ height: `${height}%`, background: "hsl(var(--accent))", minHeight: 4 }}
                        />
                        <span className="text-[0.5625rem] text-muted-foreground">{dayLabel}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {stats.recentTrips.length > 0 && (
              <div className="rounded-2xl border border-border/20 bg-card overflow-hidden">
                <div className="px-4 pt-4 pb-2">
                  <p className="text-xs font-bold text-foreground">Recent Trips</p>
                </div>
                <div className="divide-y divide-border/10">
                  {stats.recentTrips.map((trip) => (
                    <div key={trip.id} className="px-4 py-3 flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-foreground line-clamp-1">
                          {trip.pickupLabel} → {trip.dropoffLabel}
                        </p>
                        <div className="flex items-center gap-3 mt-0.5 text-[0.625rem] text-muted-foreground">
                          <span>{trip.duration} min</span>
                          <span>{trip.distance} km</span>
                          <span>
                            {new Date(trip.completedAt).toLocaleTimeString("en", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 text-[0.625rem] text-muted-foreground">
                          <span>Gross: {trip.grossAmount.toFixed(2)}</span>
                          <span>Fee: -{trip.commission.toFixed(2)}</span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-bold text-foreground">{trip.netAmount.toFixed(2)}</p>
                        <p className="text-[0.625rem] text-muted-foreground">AED net</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-20 text-sm text-muted-foreground">
            No data available
          </div>
        )}
      </div>
    </SubPageShell>
  );
}
