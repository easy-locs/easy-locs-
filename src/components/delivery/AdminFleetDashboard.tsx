/**
 * AdminFleetDashboard — Admin overview of all drivers, jobs, and fleet metrics.
 * PASS82-V: Admin Fleet Dashboard
 */
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Users, Truck, Package, TrendingUp, Clock, CheckCircle2, XCircle, Loader2, MapPin, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface Props {
  orgId: string;
  className?: string;
}

interface FleetStats {
  totalDrivers: number;
  onlineDrivers: number;
  offlineDrivers: number;
  busyDrivers: number;
  totalJobs: number;
  activeJobs: number;
  completedJobs: number;
  cancelledJobs: number;
  completionRate: number;
  totalRevenue: number;
  avgJobTime: number;
  currency: string;
}

interface DriverRow {
  userId: string;
  vehicleType: string;
  status: string;
  totalCompleted: number;
  avgRating: number;
  lastActive: string;
}

export default function AdminFleetDashboard({ orgId, className }: Props) {
  const { user } = useAuth();
  const [stats, setStats] = useState<FleetStats | null>(null);
  const [drivers, setDrivers] = useState<DriverRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFleetData = async () => {
      setLoading(true);
      try {
        // Fetch all driver sessions for this org
        const { data: sessions } = await supabase
          .from("driver_sessions")
          .select("user_id, vehicle_type, status, total_completed, total_cancelled, avg_rating, last_heartbeat_at, updated_at")
          .limit(200);

        const allDrivers = sessions || [];
        const online = allDrivers.filter(d => d.status === "online");
        const busy = allDrivers.filter(d => d.status === "busy");

        // Fetch jobs for org
        const { data: jobs } = await (supabase as any)
          .from("mobility_jobs")
          .select("id, status, current_price, currency, created_at, completed_at")
          .eq("merchant_id", orgId)
          .limit(1000);

        const allJobs = (jobs || []) as any[];
        const completed = allJobs.filter((j: any) => j.status === "completed");
        const cancelled = allJobs.filter((j: any) => j.status === "cancelled");
        const active = allJobs.filter((j: any) => ["searching", "accepted", "rider_arriving_pickup", "in_progress"].includes(j.status));
        const totalRevenue = allJobs.reduce((s: number, j: any) => s + (j.current_price || 0), 0);

        const deliveryTimes = completed
          .filter((j: any) => j.created_at && j.completed_at)
          .map((j: any) => (new Date(j.completed_at!).getTime() - new Date(j.created_at!).getTime()) / 3600000);
        const avgTime = deliveryTimes.length ? deliveryTimes.reduce((a: number, b: number) => a + b, 0) / deliveryTimes.length : 0;

        setStats({
          totalDrivers: allDrivers.length,
          onlineDrivers: online.length,
          offlineDrivers: allDrivers.length - online.length - busy.length,
          busyDrivers: busy.length,
          totalJobs: allJobs.length,
          activeJobs: active.length,
          completedJobs: completed.length,
          cancelledJobs: cancelled.length,
          completionRate: allJobs.length ? Math.round((completed.length / allJobs.length) * 100) : 0,
          totalRevenue,
          avgJobTime: Math.round(avgTime * 10) / 10,
          currency: (allJobs[0] as any)?.currency || "AED",
        });

        setDrivers(allDrivers.map(d => ({
          userId: d.user_id,
          vehicleType: d.vehicle_type,
          status: d.status,
          totalCompleted: d.total_completed || 0,
          avgRating: d.avg_rating || 0,
          lastActive: d.last_heartbeat_at || d.updated_at || "",
        })).sort((a, b) => b.totalCompleted - a.totalCompleted));
      } catch (err) {
        console.error("[fleet-dashboard]", err);
      } finally {
        setLoading(false);
      }
    };
    fetchFleetData();
  }, [orgId, user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin" style={{ color: "hsl(var(--hud-cyan) / 0.3)" }} />
      </div>
    );
  }
  if (!stats) return null;

  const STATUS_ICONS: Record<string, { emoji: string; color: string }> = {
    online: { emoji: "🟢", color: "var(--success)" },
    busy: { emoji: "🟡", color: "var(--warning)" },
    offline: { emoji: "⚫", color: "var(--hud-text-dim)" },
  };

  const VEHICLE_EMOJIS: Record<string, string> = {
    bicycle: "🚲", scooter: "🛵", car: "🚗", van: "🚐", truck: "🚛",
  };

  return (
    <div className={`space-y-4 ${className || ""}`}>
      {/* Fleet overview */}
      <div className="rounded-xl p-4"
        style={{ background: "linear-gradient(135deg, hsl(var(--hud-cyan) / 0.08), hsl(var(--info) / 0.06))", border: "1px solid hsl(var(--hud-cyan) / 0.12)" }}>
        <h3 className="text-sm font-bold flex items-center gap-1.5 mb-3" style={{ color: "hsl(var(--hud-text))" }}>
          <Users className="h-4 w-4" style={{ color: "hsl(var(--hud-cyan))" }} /> Vue d'ensemble flotte
        </h3>
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: "En ligne", value: stats.onlineDrivers, color: "--success" },
            { label: "Occupés", value: stats.busyDrivers, color: "--warning" },
            { label: "Hors ligne", value: stats.offlineDrivers, color: "--hud-text-dim" },
          ].map(s => (
            <div key={s.label} className="text-center rounded-lg py-2"
              style={{ background: "hsl(var(--hud-surface) / 0.5)" }}>
              <p className="text-lg font-black" style={{ color: `hsl(var(${s.color}))` }}>{s.value}</p>
              <p className="text-[8px]" style={{ color: "hsl(var(--hud-text-dim) / 0.4)" }}>{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Job KPIs */}
      <div className="grid grid-cols-2 gap-2">
        {[
          { icon: Package, label: "Missions totales", value: stats.totalJobs.toString(), color: "--hud-cyan" },
          { icon: CheckCircle2, label: "Taux succès", value: `${stats.completionRate}%`, color: "--success" },
          { icon: TrendingUp, label: "Chiffre d'affaires", value: `${stats.totalRevenue.toFixed(0)}€`, color: "--warning" },
          { icon: Clock, label: "Temps moy.", value: `${stats.avgJobTime}h`, color: "--info" },
        ].map(kpi => {
          const Icon = kpi.icon;
          return (
            <motion.div key={kpi.label}
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
              className="rounded-xl p-3 text-center"
              style={{ background: `hsl(${kpi.color} / 0.06)`, border: `1px solid hsl(${kpi.color} / 0.1)` }}>
              <Icon className="h-4 w-4 mx-auto mb-1" style={{ color: `hsl(${kpi.color})` }} />
              <p className="text-lg font-black" style={{ color: `hsl(${kpi.color})` }}>{kpi.value}</p>
              <p className="text-[8px]" style={{ color: "hsl(var(--hud-text-dim) / 0.4)" }}>{kpi.label}</p>
            </motion.div>
          );
        })}
      </div>

      {/* Active missions */}
      <div className="rounded-xl p-3"
        style={{ background: "hsl(var(--hud-surface))", border: "1px solid hsl(var(--hud-border) / 0.08)" }}>
        <div className="flex justify-between items-center mb-2">
          <p className="text-[10px] font-semibold" style={{ color: "hsl(var(--hud-text-dim))" }}>
            Missions en temps réel
          </p>
          <span className="text-[9px] px-2 py-0.5 rounded-full animate-pulse"
            style={{ background: "hsl(var(--success) / 0.1)", color: "hsl(var(--success))" }}>
            {stats.activeJobs} actives
          </span>
        </div>
        <div className="flex gap-2">
          {[
            { label: "En attente", value: stats.activeJobs, color: "--warning" },
            { label: "Terminées", value: stats.completedJobs, color: "--success" },
            { label: "Annulées", value: stats.cancelledJobs, color: "--destructive" },
          ].map(s => (
            <div key={s.label} className="flex-1 text-center py-1.5 rounded-lg"
              style={{ background: `hsl(var(${s.color}) / 0.06)` }}>
              <p className="text-sm font-bold" style={{ color: `hsl(var(${s.color}))` }}>{s.value}</p>
              <p className="text-[7px]" style={{ color: "hsl(var(--hud-text-dim) / 0.3)" }}>{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Drivers table */}
      <div className="rounded-xl overflow-hidden"
        style={{ background: "hsl(var(--hud-surface))", border: "1px solid hsl(var(--hud-border) / 0.08)" }}>
        <div className="px-3 py-2" style={{ borderBottom: "1px solid hsl(var(--hud-border) / 0.06)" }}>
          <p className="text-[10px] font-semibold" style={{ color: "hsl(var(--hud-text-dim))" }}>
            <Truck className="h-3 w-3 inline mr-1" /> Livreurs ({drivers.length})
          </p>
        </div>
        <div className="max-h-64 overflow-y-auto">
          {drivers.length === 0 ? (
            <p className="text-center py-6 text-[10px]" style={{ color: "hsl(var(--hud-text-dim) / 0.3)" }}>Aucun livreur</p>
          ) : drivers.map((d, i) => {
            const st = STATUS_ICONS[d.status] || STATUS_ICONS.offline;
            return (
              <div key={d.userId} className="flex items-center gap-2 px-3 py-2"
                style={{ borderBottom: i < drivers.length - 1 ? "1px solid hsl(var(--hud-border) / 0.04)" : "none" }}>
                <span className="text-xs">{st.emoji}</span>
                <span className="text-xs">{VEHICLE_EMOJIS[d.vehicleType] || "🚗"}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-medium truncate" style={{ color: "hsl(var(--hud-text))" }}>
                    {d.userId.slice(0, 8)}…
                  </p>
                  <p className="text-[8px]" style={{ color: "hsl(var(--hud-text-dim) / 0.3)" }}>
                    {d.lastActive ? new Date(d.lastActive).toLocaleString("fr", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "—"}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-[10px] font-bold" style={{ color: "hsl(var(--hud-cyan))" }}>{d.totalCompleted}</p>
                  <p className="text-[7px]" style={{ color: "hsl(var(--hud-text-dim) / 0.3)" }}>missions</p>
                </div>
                {d.avgRating > 0 && (
                  <div className="flex items-center gap-0.5 shrink-0">
                    <Star className="h-2.5 w-2.5" style={{ color: "hsl(var(--warning))" }} />
                    <span className="text-[9px] font-bold" style={{ color: "hsl(var(--warning))" }}>{d.avgRating.toFixed(1)}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
