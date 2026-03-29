/**
 * DriverAnalyticsDashboard — XXX. Comprehensive analytics for drivers.
 * Earnings, missions, avg time, goals and progression tracking.
 * PASS96-XXX
 */
import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import {
  TrendingUp, DollarSign, Clock, Target, Award, Loader2,
  BarChart3, Star, Zap, CheckCircle2,
} from "lucide-react";
import * as deliveryRepo from "@/repositories/delivery.repository";
import { useAuth } from "@/contexts/AuthContext";

interface Props {
  className?: string;
}

export default function DriverAnalyticsDashboard({ className }: Props) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<"7d" | "30d" | "90d">("30d");
  const [jobs, setJobs] = useState<any[]>([]);
  const [ratings, setRatings] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      setLoading(true);
      const days = period === "7d" ? 7 : period === "30d" ? 30 : 90;
      const since = new Date();
      since.setDate(since.getDate() - days);

      const [jobsRes, ratingsRes] = await Promise.all([
        deliveryRepo.fetchDriverJobs(user.id, since.toISOString()),
        deliveryRepo.fetchDriverRatings(user.id, since.toISOString()),
      ]);
      setJobs(jobsRes);
      setRatings(ratingsRes);
      setLoading(false);
    };
    fetch();
  }, [user, period]);

  const stats = useMemo(() => {
    const completed = jobs.filter(j => j.status === "completed");
    const cancelled = jobs.filter(j => j.status === "cancelled");
    const totalEarnings = completed.reduce((s, j) => s + (j.delivery_fee || 0), 0);
    const avgEarning = completed.length ? totalEarnings / completed.length : 0;
    const acceptRate = jobs.length ? Math.round((completed.length / jobs.length) * 100) : 0;

    // Avg delivery time
    const times = completed
      .filter(j => j.picked_up_at && j.delivered_at)
      .map(j => (new Date(j.delivered_at).getTime() - new Date(j.picked_up_at).getTime()) / 60000);
    const avgTime = times.length ? Math.round(times.reduce((a, b) => a + b, 0) / times.length) : 0;

    const avgRating = ratings.length ? ratings.reduce((s, r) => s + r.rating, 0) / ratings.length : 0;

    // Daily earnings
    const dailyMap = new Map<string, number>();
    completed.forEach(j => {
      const day = (j.delivered_at || j.created_at)?.slice(0, 10);
      if (day) dailyMap.set(day, (dailyMap.get(day) || 0) + (j.delivery_fee || 0));
    });

    // Goals
    const monthlyGoal = 100;
    const earningsGoal = 2000;
    const progress = Math.min(Math.round((completed.length / monthlyGoal) * 100), 100);
    const earningsProgress = Math.min(Math.round((totalEarnings / earningsGoal) * 100), 100);

    // Level
    const totalAll = completed.length;
    const level = totalAll >= 500 ? "Platine" : totalAll >= 200 ? "Or" : totalAll >= 50 ? "Argent" : "Bronze";
    const levelColor = totalAll >= 500 ? "--warning" : totalAll >= 200 ? "--warning" : totalAll >= 50 ? "--hud-cyan" : "--hud-text-dim";

    return {
      totalJobs: jobs.length, completed: completed.length, cancelled: cancelled.length,
      totalEarnings, avgEarning, acceptRate, avgTime, avgRating,
      daily: Array.from(dailyMap.entries()).map(([date, earnings]) => ({ date, earnings })).sort((a, b) => a.date.localeCompare(b.date)),
      progress, earningsProgress, level, levelColor,
    };
  }, [jobs, ratings]);

  if (loading) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="h-5 w-5 animate-spin" style={{ color: "hsl(var(--hud-cyan) / 0.3)" }} /></div>;
  }

  const maxDaily = Math.max(...stats.daily.map(d => d.earnings), 1);

  return (
    <div className={`space-y-4 ${className || ""}`}>
      {/* Period */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4" style={{ color: "hsl(var(--hud-cyan))" }} />
          <h3 className="text-sm font-bold" style={{ color: "hsl(var(--hud-text))" }}>Mes performances</h3>
        </div>
        <div className="flex gap-1">
          {(["7d", "30d", "90d"] as const).map(p => (
            <button key={p} onClick={() => setPeriod(p)}
              className="text-[10px] px-2.5 py-1 rounded-full font-medium"
              style={{
                background: period === p ? "hsl(var(--hud-cyan) / 0.15)" : "hsl(var(--hud-border) / 0.06)",
                color: period === p ? "hsl(var(--hud-cyan))" : "hsl(var(--hud-text-dim) / 0.4)",
              }}>
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Level badge */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        className="rounded-xl p-3 flex items-center gap-3"
        style={{ background: `hsl(var(${stats.levelColor}) / 0.06)`, border: `1px solid hsl(var(${stats.levelColor}) / 0.15)` }}>
        <Award className="h-8 w-8" style={{ color: `hsl(var(${stats.levelColor}))` }} />
        <div>
          <p className="text-xs font-bold" style={{ color: `hsl(var(${stats.levelColor}))` }}>Niveau {stats.level}</p>
          <p className="text-[9px]" style={{ color: "hsl(var(--hud-text-dim) / 0.4)" }}>
            {stats.completed} missions terminées • ⭐ {stats.avgRating.toFixed(1)}
          </p>
        </div>
      </motion.div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-2">
        {[
          { icon: DollarSign, label: "Gains", value: `${stats.totalEarnings.toFixed(0)}€`, color: "--success" },
          { icon: CheckCircle2, label: "Missions", value: `${stats.completed}`, color: "--hud-cyan" },
          { icon: Clock, label: "Temps moy.", value: `${stats.avgTime}min`, color: "--info" },
          { icon: Star, label: "Note moy.", value: stats.avgRating.toFixed(1), color: "--warning" },
        ].map(kpi => {
          const Icon = kpi.icon;
          return (
            <motion.div key={kpi.label} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
              className="rounded-xl p-3 text-center"
              style={{ background: `hsl(var(${kpi.color}) / 0.06)`, border: `1px solid hsl(var(${kpi.color}) / 0.1)` }}>
              <Icon className="h-4 w-4 mx-auto mb-1" style={{ color: `hsl(var(${kpi.color}))` }} />
              <p className="text-lg font-black" style={{ color: `hsl(var(${kpi.color}))` }}>{kpi.value}</p>
              <p className="text-[8px]" style={{ color: "hsl(var(--hud-text-dim) / 0.4)" }}>{kpi.label}</p>
            </motion.div>
          );
        })}
      </div>

      {/* Goals progress */}
      <div className="rounded-xl p-3 space-y-3" style={{ background: "hsl(var(--hud-surface))", border: "1px solid hsl(var(--hud-border) / 0.08)" }}>
        <p className="text-[10px] font-semibold" style={{ color: "hsl(var(--hud-text-dim))" }}>
          <Target className="h-3 w-3 inline mr-1" /> Objectifs mensuels
        </p>
        {[
          { label: "Missions (100)", pct: stats.progress, color: "--hud-cyan" },
          { label: "Revenus (2000€)", pct: stats.earningsProgress, color: "--success" },
          { label: "Taux acceptation", pct: stats.acceptRate, color: "--info" },
        ].map(g => (
          <div key={g.label}>
            <div className="flex justify-between mb-0.5">
              <span className="text-[9px]" style={{ color: "hsl(var(--hud-text-dim) / 0.5)" }}>{g.label}</span>
              <span className="text-[9px] font-bold" style={{ color: `hsl(var(${g.color}))` }}>{g.pct}%</span>
            </div>
            <div className="h-2 rounded-full overflow-hidden" style={{ background: "hsl(var(--hud-border) / 0.08)" }}>
              <motion.div className="h-full rounded-full" initial={{ width: 0 }} animate={{ width: `${g.pct}%` }}
                style={{ background: `hsl(var(${g.color}))` }} />
            </div>
          </div>
        ))}
      </div>

      {/* Daily earnings chart */}
      {stats.daily.length > 0 && (
        <div className="rounded-xl p-3" style={{ background: "hsl(var(--hud-surface))", border: "1px solid hsl(var(--hud-border) / 0.08)" }}>
          <p className="text-[10px] font-semibold mb-2" style={{ color: "hsl(var(--hud-text-dim))" }}>
            <TrendingUp className="h-3 w-3 inline mr-1" /> Gains journaliers
          </p>
          <div className="flex items-end gap-px h-16">
            {stats.daily.slice(-21).map((d, i) => (
              <motion.div key={d.date} className="flex-1 rounded-t"
                initial={{ height: 0 }} animate={{ height: `${Math.max((d.earnings / maxDaily) * 100, 4)}%` }}
                transition={{ delay: i * 0.02 }}
                style={{ background: "hsl(var(--success) / 0.6)", minHeight: 2 }} />
            ))}
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-[7px]" style={{ color: "hsl(var(--hud-text-dim) / 0.3)" }}>{stats.daily[0]?.date.slice(5)}</span>
            <span className="text-[7px]" style={{ color: "hsl(var(--hud-text-dim) / 0.3)" }}>{stats.daily[stats.daily.length - 1]?.date.slice(5)}</span>
          </div>
        </div>
      )}

      {/* Quick stats */}
      <div className="rounded-xl p-3 flex items-center justify-between"
        style={{ background: "hsl(var(--hud-surface))", border: "1px solid hsl(var(--hud-border) / 0.08)" }}>
        <div className="text-center flex-1">
          <p className="text-sm font-black" style={{ color: "hsl(var(--success))" }}>{stats.avgEarning.toFixed(1)}€</p>
          <p className="text-[7px]" style={{ color: "hsl(var(--hud-text-dim) / 0.3)" }}>Moy./mission</p>
        </div>
        <div className="w-px h-8" style={{ background: "hsl(var(--hud-border) / 0.1)" }} />
        <div className="text-center flex-1">
          <p className="text-sm font-black" style={{ color: "hsl(var(--info))" }}>{stats.acceptRate}%</p>
          <p className="text-[7px]" style={{ color: "hsl(var(--hud-text-dim) / 0.3)" }}>Taux accept.</p>
        </div>
        <div className="w-px h-8" style={{ background: "hsl(var(--hud-border) / 0.1)" }} />
        <div className="text-center flex-1">
          <p className="text-sm font-black" style={{ color: "hsl(var(--destructive))" }}>{stats.cancelled}</p>
          <p className="text-[7px]" style={{ color: "hsl(var(--hud-text-dim) / 0.3)" }}>Annulées</p>
        </div>
      </div>
    </div>
  );
}
