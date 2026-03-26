/**
 * useDeliveryAnalytics — Aggregate delivery KPIs.
 * CANONICAL: reads from mobility_jobs only.
 */
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface DeliveryAnalytics {
  totalJobs: number;
  pending: number;
  active: number;
  completed: number;
  cancelled: number;
  completionRate: number;
  totalRevenue: number;
  totalEscrowHeld: number;
  totalEscrowReleased: number;
  totalEscrowRefunded: number;
  avgDeliveryFee: number;
  currency: string;
  avgDeliveryTimeMin: number;
  avgAssignmentTimeMin: number;
  statusDistribution: { status: string; count: number; color: string }[];
  priorityDistribution: { priority: string; count: number }[];
  dailyVolume: { date: string; count: number; completed: number }[];
  topDrivers: { driver_id: string; completed: number; avg_rating: number | null }[];
}

const STATUS_COLORS: Record<string, string> = {
  searching: "hsl(45, 90%, 50%)",
  accepted: "hsl(210, 70%, 55%)",
  in_progress: "hsl(170, 70%, 45%)",
  completed: "hsl(140, 60%, 45%)",
  cancelled: "hsl(0, 65%, 55%)",
};

export function useDeliveryAnalytics(orgId?: string) {
  const [data, setData] = useState<DeliveryAnalytics | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    try {
      const { data: jobs } = await supabase
        .from("mobility_jobs")
        .select("id, status, service_level, current_price, quoted_price, currency, created_at, accepted_at, picked_up_at, completed_at, rider_user_id")
        .eq("merchant_id", orgId)
        .order("created_at", { ascending: false })
        .limit(1000);

      const { data: escrows } = await supabase
        .from("escrow_payments")
        .select("amount, status, currency")
        .eq("org_id", orgId);

      if (!jobs) { setData(null); return; }

      const pending = jobs.filter(j => j.status === "searching").length;
      const active = jobs.filter(j => ["accepted", "in_progress", "picked_up"].includes(j.status)).length;
      const completed = jobs.filter(j => j.status === "completed").length;
      const cancelled = jobs.filter(j => j.status === "cancelled").length;
      const total = jobs.length;
      const completionRate = total > 0 ? Math.round((completed / (completed + cancelled || 1)) * 100) : 0;

      const completedJobs = jobs.filter(j => j.status === "completed");
      const totalRevenue = completedJobs.reduce((s, j) => s + (j.current_price || j.quoted_price || 0), 0);
      const avgFee = completedJobs.length ? Math.round(totalRevenue / completedJobs.length * 100) / 100 : 0;
      const currency = jobs[0]?.currency || "AED";

      const escrowHeld = (escrows || []).filter(e => e.status === "held").reduce((s, e) => s + (e.amount || 0), 0);
      const escrowReleased = (escrows || []).filter(e => e.status === "released").reduce((s, e) => s + (e.amount || 0), 0);
      const escrowRefunded = (escrows || []).filter(e => e.status === "refunded").reduce((s, e) => s + (e.amount || 0), 0);

      const deliveryTimes = completedJobs
        .filter(j => j.accepted_at && j.completed_at)
        .map(j => (new Date(j.completed_at!).getTime() - new Date(j.accepted_at!).getTime()) / 60000);
      const avgDeliveryTime = deliveryTimes.length ? Math.round(deliveryTimes.reduce((a, b) => a + b, 0) / deliveryTimes.length) : 0;

      const assignTimes = jobs
        .filter(j => j.accepted_at && j.created_at)
        .map(j => (new Date(j.accepted_at!).getTime() - new Date(j.created_at!).getTime()) / 60000);
      const avgAssignTime = assignTimes.length ? Math.round(assignTimes.reduce((a, b) => a + b, 0) / assignTimes.length) : 0;

      const statusCounts: Record<string, number> = {};
      jobs.forEach(j => { statusCounts[j.status] = (statusCounts[j.status] || 0) + 1; });
      const statusDistribution = Object.entries(statusCounts).map(([status, count]) => ({
        status, count, color: STATUS_COLORS[status] || "hsl(var(--muted))",
      }));

      const prioCounts: Record<string, number> = {};
      jobs.forEach(j => { prioCounts[j.service_level] = (prioCounts[j.service_level] || 0) + 1; });
      const priorityDistribution = Object.entries(prioCounts).map(([priority, count]) => ({ priority, count }));

      const dailyMap = new Map<string, { count: number; completed: number }>();
      const now = new Date();
      for (let i = 13; i >= 0; i--) {
        const d = new Date(now); d.setDate(d.getDate() - i);
        dailyMap.set(d.toISOString().slice(0, 10), { count: 0, completed: 0 });
      }
      jobs.forEach(j => {
        const day = j.created_at?.slice(0, 10);
        if (day && dailyMap.has(day)) { const e = dailyMap.get(day)!; e.count++; if (j.status === "completed") e.completed++; }
      });
      const dailyVolume = Array.from(dailyMap.entries()).map(([date, v]) => ({ date, ...v }));

      const driverStats = new Map<string, { completed: number }>();
      completedJobs.forEach(j => {
        if (!j.rider_user_id) return;
        const s = driverStats.get(j.rider_user_id) || { completed: 0 };
        s.completed++; driverStats.set(j.rider_user_id, s);
      });
      const topDrivers = Array.from(driverStats.entries())
        .map(([driver_id, s]) => ({ driver_id, completed: s.completed, avg_rating: null as number | null }))
        .sort((a, b) => b.completed - a.completed).slice(0, 5);

      setData({
        totalJobs: total, pending, active, completed, cancelled, completionRate,
        totalRevenue, totalEscrowHeld: escrowHeld, totalEscrowReleased: escrowReleased,
        totalEscrowRefunded: escrowRefunded, avgDeliveryFee: avgFee, currency,
        avgDeliveryTimeMin: avgDeliveryTime, avgAssignmentTimeMin: avgAssignTime,
        statusDistribution, priorityDistribution, dailyVolume, topDrivers,
      });
    } catch (err) { console.error("[analytics] Error:", err); }
    finally { setLoading(false); }
  }, [orgId]);

  useEffect(() => { refresh(); }, [refresh]);
  return { data, loading, refresh };
}
