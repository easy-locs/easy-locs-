/**
 * DeliveryAnalyticsDashboard — KPIs, charts, and metrics for delivery operations
 * PASS76-F
 */
import { useState } from "react";
import { motion } from "framer-motion";
import {
  Package, TrendingUp, Clock, DollarSign, CheckCircle2,
  XCircle, RefreshCw, BarChart3, Shield, Users, Zap, Timer,
} from "lucide-react";
import { useDeliveryAnalytics } from "@/hooks/useDeliveryAnalytics";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

function KpiCard({ icon: Icon, label, value, sub, color }: {
  icon: any; label: string; value: string | number; sub?: string; color: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl p-3 border border-border/40 bg-card/80 backdrop-blur-sm"
    >
      <div className="flex items-center gap-2 mb-1.5">
        <Icon className="w-4 h-4" style={{ color }} />
        <span className="text-[10px] text-muted-foreground font-medium">{label}</span>
      </div>
      <p className="text-lg font-bold text-foreground">{value}</p>
      {sub && <p className="text-[9px] text-muted-foreground mt-0.5">{sub}</p>}
    </motion.div>
  );
}

function MiniBar({ data, maxVal }: { data: { label: string; value: number; color: string }[]; maxVal: number }) {
  return (
    <div className="space-y-1.5">
      {data.map(d => (
        <div key={d.label} className="flex items-center gap-2">
          <span className="text-[10px] text-muted-foreground w-20 truncate">{d.label}</span>
          <div className="flex-1 h-3 rounded-full bg-muted/30 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${maxVal > 0 ? (d.value / maxVal) * 100 : 0}%` }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="h-full rounded-full"
              style={{ backgroundColor: d.color }}
            />
          </div>
          <span className="text-[10px] font-semibold text-foreground w-8 text-right">{d.value}</span>
        </div>
      ))}
    </div>
  );
}

function DailyChart({ data }: { data: { date: string; count: number; completed: number }[] }) {
  const max = Math.max(...data.map(d => d.count), 1);
  return (
    <div className="flex items-end gap-[3px] h-20">
      {data.map((d, i) => (
        <div key={d.date} className="flex-1 flex flex-col items-center gap-0.5">
          <div className="w-full flex flex-col items-center justify-end" style={{ height: 64 }}>
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: `${(d.count / max) * 100}%` }}
              transition={{ duration: 0.4, delay: i * 0.03 }}
              className="w-full rounded-t-sm bg-primary/60 relative"
              style={{ minHeight: d.count > 0 ? 3 : 0 }}
            >
              {d.completed > 0 && (
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: `${(d.completed / d.count) * 100}%` }}
                  className="absolute bottom-0 w-full rounded-t-sm bg-primary"
                />
              )}
            </motion.div>
          </div>
          {i % 2 === 0 && (
            <span className="text-[7px] text-muted-foreground">{d.date.slice(8)}</span>
          )}
        </div>
      ))}
    </div>
  );
}

export default function DeliveryAnalyticsDashboard({ orgId }: { orgId?: string }) {
  const { data, loading, refresh } = useDeliveryAnalytics(orgId);

  if (!data && !loading) {
    return (
      <div className="text-center py-16 text-muted-foreground text-sm">
        Aucune donnée de livraison disponible
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-primary" />
          <h3 className="text-base font-semibold text-foreground">Analytics Livraison</h3>
        </div>
        <Button variant="ghost" size="sm" onClick={refresh} disabled={loading} className="h-8 w-8 p-0">
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {data && (
        <>
          {/* KPI Grid */}
          <div className="grid grid-cols-2 gap-2">
            <KpiCard icon={Package} label="Total missions" value={data.totalJobs} color="hsl(var(--primary))" />
            <KpiCard icon={CheckCircle2} label="Taux réussite" value={`${data.completionRate}%`}
              sub={`${data.completed} terminées`} color="hsl(var(--success))" />
            <KpiCard icon={DollarSign} label="Revenus" value={`${data.totalRevenue.toFixed(0)}€`}
              sub={`Moy. ${data.avgDeliveryFee}€/mission`} color="hsl(var(--warning))" />
            <KpiCard icon={Timer} label="Temps moyen" value={`${data.avgDeliveryTimeMin}min`}
              sub={`Assign. ${data.avgAssignmentTimeMin}min`} color="hsl(var(--info, 210 70% 55%))" />
          </div>

          {/* Escrow summary */}
          <div className="rounded-xl p-3 border border-border/40 bg-card/80">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="w-4 h-4 text-primary" />
              <span className="text-xs font-semibold text-foreground">Escrow</span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              {[
                { label: "Bloqué", value: `${data.totalEscrowHeld.toFixed(0)}€`, color: "text-warning" },
                { label: "Libéré", value: `${data.totalEscrowReleased.toFixed(0)}€`, color: "text-success" },
                { label: "Remboursé", value: `${data.totalEscrowRefunded.toFixed(0)}€`, color: "text-destructive" },
              ].map(e => (
                <div key={e.label}>
                  <p className={`text-sm font-bold ${e.color}`}>{e.value}</p>
                  <p className="text-[9px] text-muted-foreground">{e.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Status distribution */}
          <div className="rounded-xl p-3 border border-border/40 bg-card/80">
            <div className="flex items-center gap-2 mb-3">
              <Zap className="w-4 h-4 text-primary" />
              <span className="text-xs font-semibold text-foreground">Distribution par statut</span>
            </div>
            <MiniBar
              data={data.statusDistribution.map(s => ({ label: s.status, value: s.count, color: s.color }))}
              maxVal={Math.max(...data.statusDistribution.map(s => s.count), 1)}
            />
          </div>

          {/* Daily volume chart */}
          <div className="rounded-xl p-3 border border-border/40 bg-card/80">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="w-4 h-4 text-primary" />
              <span className="text-xs font-semibold text-foreground">Volume (14 jours)</span>
              <div className="flex items-center gap-2 ml-auto">
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-sm bg-primary/60" />
                  <span className="text-[8px] text-muted-foreground">Total</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-sm bg-primary" />
                  <span className="text-[8px] text-muted-foreground">Terminé</span>
                </div>
              </div>
            </div>
            <DailyChart data={data.dailyVolume} />
          </div>

          {/* Top drivers */}
          {data.topDrivers.length > 0 && (
            <div className="rounded-xl p-3 border border-border/40 bg-card/80">
              <div className="flex items-center gap-2 mb-3">
                <Users className="w-4 h-4 text-primary" />
                <span className="text-xs font-semibold text-foreground">Top Livreurs</span>
              </div>
              <div className="space-y-2">
                {data.topDrivers.map((d, i) => (
                  <div key={d.driver_id} className="flex items-center gap-2">
                    <Badge variant="outline" className="w-5 h-5 p-0 flex items-center justify-center text-[9px]">
                      {i + 1}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground flex-1 truncate font-mono">
                      {d.driver_id.slice(0, 8)}…
                    </span>
                    <span className="text-xs font-semibold text-foreground">{d.completed} ✓</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
