/**
 * useDriverEarnings — Driver earnings dashboard with history and stats.
 * PASS80-K: Driver Earnings Dashboard
 */
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface EarningEntry {
  id: string;
  current_price: number;
  currency: string;
  completed_at: string;
  pickup_address: string;
  dropoff_address: string;
  notes: string | null;
}

export interface EarningsStats {
  totalEarned: number;
  totalJobs: number;
  avgPerJob: number;
  currency: string;
  todayEarned: number;
  todayJobs: number;
  weekEarned: number;
  weekJobs: number;
  monthEarned: number;
  monthJobs: number;
  dailyEarnings: { date: string; amount: number; jobs: number }[];
}

export function useDriverEarnings() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<EarningEntry[]>([]);
  const [stats, setStats] = useState<EarningsStats | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data } = await (supabase as any)
        .from("mobility_jobs")
        .select("id, current_price, currency, completed_at, pickup_address, dropoff_address, notes")
        .eq("rider_user_id", user.id)
        .eq("status", "completed")
        .not("completed_at", "is", null)
        .order("completed_at", { ascending: false })
        .limit(500);

      const jobs = (data || []) as EarningEntry[];
      setEntries(jobs);

      const now = new Date();
      const todayStr = now.toISOString().slice(0, 10);
      const weekAgo = new Date(now); weekAgo.setDate(weekAgo.getDate() - 7);
      const monthAgo = new Date(now); monthAgo.setMonth(monthAgo.getMonth() - 1);

      const total = jobs.reduce((s, j) => s + (j.current_price || 0), 0);
      const todayJobs = jobs.filter(j => j.completed_at?.slice(0, 10) === todayStr);
      const weekJobs = jobs.filter(j => new Date(j.completed_at) >= weekAgo);
      const monthJobs = jobs.filter(j => new Date(j.completed_at) >= monthAgo);

      // Daily earnings (last 14 days)
      const dailyMap = new Map<string, { amount: number; jobs: number }>();
      for (let i = 13; i >= 0; i--) {
        const d = new Date(now); d.setDate(d.getDate() - i);
        dailyMap.set(d.toISOString().slice(0, 10), { amount: 0, jobs: 0 });
      }
      jobs.forEach(j => {
        const day = j.completed_at?.slice(0, 10);
        if (day && dailyMap.has(day)) {
          const e = dailyMap.get(day)!;
          e.amount += j.current_price || 0;
          e.jobs++;
        }
      });

      setStats({
        totalEarned: total,
        totalJobs: jobs.length,
        avgPerJob: jobs.length ? Math.round(total / jobs.length * 100) / 100 : 0,
        currency: jobs[0]?.currency || "AED",
        todayEarned: todayJobs.reduce((s, j) => s + (j.current_price || 0), 0),
        todayJobs: todayJobs.length,
        weekEarned: weekJobs.reduce((s, j) => s + (j.current_price || 0), 0),
        weekJobs: weekJobs.length,
        monthEarned: monthJobs.reduce((s, j) => s + (j.current_price || 0), 0),
        monthJobs: monthJobs.length,
        dailyEarnings: Array.from(dailyMap.entries()).map(([date, v]) => ({ date, ...v })),
      });
    } catch (err) {
      console.error("[earnings] Error:", err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { refresh(); }, [refresh]);

  return { entries, stats, loading, refresh };
}
