/**
 * DriverEarningsPayroll — Automated payroll: earnings, bonuses, deductions, accounting export.
 * PASS85-HH: Driver Earnings & Payroll
 */
import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { motion } from "framer-motion";
import { DollarSign, TrendingUp, Clock, Download, Calendar, Award, Minus, Plus, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface DeliveryEarning {
  id: string;
  delivery_fee: number | null;
  currency: string | null;
  status: string;
  delivered_at: string | null;
  created_at: string | null;
  pickup_address: string;
  dropoff_address: string;
  priority: string;
}

interface PayrollSummary {
  totalEarnings: number;
  totalDeliveries: number;
  bonuses: number;
  deductions: number;
  netPay: number;
  avgPerDelivery: number;
  expressBonus: number;
  urgentBonus: number;
  cancellationDeductions: number;
  lateDeductions: number;
}

type Period = "week" | "biweekly" | "month";

export default function DriverEarningsPayroll() {
  const { user } = useAuth();
  const [jobs, setJobs] = useState<DeliveryEarning[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<Period>("month");
  const [showBreakdown, setShowBreakdown] = useState(false);

  const getPeriodRange = useCallback((p: Period): { from: Date; to: Date } => {
    const now = new Date();
    const to = new Date(now);
    let from: Date;
    switch (p) {
      case "week": from = new Date(now.getTime() - 7 * 86400000); break;
      case "biweekly": from = new Date(now.getTime() - 14 * 86400000); break;
      default: from = new Date(now.getFullYear(), now.getMonth(), 1); break;
    }
    return { from, to };
  }, []);

  const fetchEarnings = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    const { from, to } = getPeriodRange(period);

    const { data, error } = await supabase
      .from("mobility_jobs")
      .select("id, current_price, quoted_price, currency, status, completed_at, created_at, pickup_address, dropoff_address, service_level")
      .eq("rider_user_id", user.id)
      .gte("created_at", from.toISOString())
      .lte("created_at", to.toISOString())
      .order("created_at", { ascending: false });

    if (error) { console.error("[Payroll] fetch error:", error); }
    setJobs((data || []).map((r: any) => ({ ...r, delivery_fee: r.current_price ?? r.quoted_price, delivered_at: r.completed_at, priority: r.service_level })) as DeliveryEarning[]);
    setLoading(false);
  }, [user?.id, period, getPeriodRange]);

  useEffect(() => { fetchEarnings(); }, [fetchEarnings]);

  const summary = useMemo<PayrollSummary>(() => {
    const completed = jobs.filter(j => j.status === "completed");
    const cancelled = jobs.filter(j => j.status === "cancelled");
    const express = completed.filter(j => j.priority === "express");
    const urgent = completed.filter(j => j.priority === "urgent");

    const totalEarnings = completed.reduce((s, j) => s + (j.delivery_fee || 0), 0);
    const expressBonus = express.length * 2; // 2€ bonus per express
    const urgentBonus = urgent.length * 5; // 5€ bonus per urgent
    const bonuses = expressBonus + urgentBonus;
    const cancellationDeductions = cancelled.length * 1; // 1€ penalty per cancellation
    const lateDeductions = 0; // Would come from SLA data
    const deductions = cancellationDeductions + lateDeductions;

    return {
      totalEarnings,
      totalDeliveries: completed.length,
      bonuses,
      deductions,
      netPay: totalEarnings + bonuses - deductions,
      avgPerDelivery: completed.length > 0 ? totalEarnings / completed.length : 0,
      expressBonus,
      urgentBonus,
      cancellationDeductions,
      lateDeductions,
    };
  }, [jobs]);

  const exportCSV = () => {
    const rows = [
      ["ID", "Date", "Statut", "Pickup", "Dropoff", "Priorité", "Frais (€)", "Devise"],
      ...jobs.map(j => [
        j.id.slice(0, 8),
        j.delivered_at || j.created_at || "",
        j.status,
        j.pickup_address,
        j.dropoff_address,
        j.priority,
        (j.delivery_fee || 0).toFixed(2),
        j.currency || "EUR",
      ]),
      [],
      ["RÉSUMÉ"],
      ["Total brut", summary.totalEarnings.toFixed(2)],
      ["Bonus", summary.bonuses.toFixed(2)],
      ["Déductions", summary.deductions.toFixed(2)],
      ["NET À PAYER", summary.netPay.toFixed(2)],
    ];
    const csv = rows.map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `payroll-${period}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
    toast("Export téléchargé");
  };

  const { from, to } = getPeriodRange(period);

  return (
    <div className="space-y-3">
      {/* Period selector */}
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold flex items-center gap-1.5" style={{ color: "hsl(var(--hud-text))" }}>
          <DollarSign className="h-3.5 w-3.5" style={{ color: "hsl(var(--success))" }} />
          Bulletin de paie
        </h3>
        <div className="flex gap-1">
          {(["week", "biweekly", "month"] as const).map(p => (
            <button key={p} onClick={() => setPeriod(p)}
              className="text-[9px] px-2 py-1 rounded-lg transition-all"
              style={{
                background: period === p ? "hsl(var(--hud-cyan) / 0.12)" : "transparent",
                color: period === p ? "hsl(var(--hud-cyan))" : "hsl(var(--hud-text-dim) / 0.5)",
              }}>
              {p === "week" ? "Semaine" : p === "biweekly" ? "Quinzaine" : "Mois"}
            </button>
          ))}
        </div>
      </div>

      {/* Period info */}
      <div className="text-center py-1">
        <p className="text-[9px]" style={{ color: "hsl(var(--hud-text-dim) / 0.4)" }}>
          <Calendar className="h-3 w-3 inline mr-1" />
          {from.toLocaleDateString("fr")} — {to.toLocaleDateString("fr")}
        </p>
      </div>

      {/* Net pay hero */}
      <div className="rounded-xl p-4 text-center"
        style={{ background: "linear-gradient(135deg, hsl(var(--success) / 0.08), hsl(var(--hud-cyan) / 0.05))", border: "1px solid hsl(var(--success) / 0.15)" }}>
        <p className="text-[10px] font-semibold mb-1" style={{ color: "hsl(var(--hud-text-dim))" }}>NET À PAYER</p>
        <p className="text-2xl font-bold" style={{ color: "hsl(var(--success))" }}>{summary.netPay.toFixed(2)} €</p>
        <p className="text-[9px] mt-1" style={{ color: "hsl(var(--hud-text-dim) / 0.5)" }}>
          {summary.totalDeliveries} livraisons terminées
        </p>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-4 gap-1.5">
        {[
          { label: "Brut", value: `${summary.totalEarnings.toFixed(0)}€`, color: "--hud-text", icon: DollarSign },
          { label: "Bonus", value: `+${summary.bonuses.toFixed(0)}€`, color: "--success", icon: Award },
          { label: "Déduc.", value: `-${summary.deductions.toFixed(0)}€`, color: "--destructive", icon: Minus },
          { label: "Moy./liv.", value: `${summary.avgPerDelivery.toFixed(1)}€`, color: "--hud-cyan", icon: TrendingUp },
        ].map(({ label, value, color, icon: Icon }) => (
          <div key={label} className="rounded-xl px-2 py-2 text-center"
            style={{ background: "hsl(var(--hud-surface))", border: "1px solid hsl(var(--hud-border) / 0.08)" }}>
            <Icon className="h-3 w-3 mx-auto mb-1" style={{ color: `hsl(var(${color}))` }} />
            <p className="text-xs font-bold" style={{ color: `hsl(var(${color}))` }}>{value}</p>
            <p className="text-[7px]" style={{ color: "hsl(var(--hud-text-dim) / 0.4)" }}>{label}</p>
          </div>
        ))}
      </div>

      {/* Breakdown toggle */}
      <Button size="sm" variant="outline" className="w-full text-[10px] h-8"
        onClick={() => setShowBreakdown(!showBreakdown)}
        style={{ borderColor: "hsl(var(--hud-border) / 0.15)", color: "hsl(var(--hud-text-dim))" }}>
        <FileText className="h-3 w-3 mr-1" /> {showBreakdown ? "Masquer le détail" : "Voir le détail"}
      </Button>

      {/* Detailed breakdown */}
      {showBreakdown && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="rounded-xl p-3 space-y-2"
          style={{ background: "hsl(var(--hud-surface))", border: "1px solid hsl(var(--hud-border) / 0.08)" }}>
          <p className="text-[9px] font-bold" style={{ color: "hsl(var(--hud-text-dim))" }}>DÉTAIL DU CALCUL</p>

          {/* Earnings section */}
          <div className="space-y-1">
            <p className="text-[8px] font-bold" style={{ color: "hsl(var(--success))" }}>GAINS</p>
            {[
              { label: `Frais de livraison (${summary.totalDeliveries} missions)`, value: summary.totalEarnings },
              { label: `Bonus express (${jobs.filter(j => j.priority === "express" && j.status === "completed").length}x 2€)`, value: summary.expressBonus },
              { label: `Bonus urgent (${jobs.filter(j => j.priority === "urgent" && j.status === "completed").length}x 5€)`, value: summary.urgentBonus },
            ].filter(l => l.value > 0).map(({ label, value }) => (
              <div key={label} className="flex justify-between py-0.5">
                <span className="text-[9px]" style={{ color: "hsl(var(--hud-text-dim) / 0.6)" }}>{label}</span>
                <span className="text-[9px] font-semibold" style={{ color: "hsl(var(--success))" }}>+{value.toFixed(2)} €</span>
              </div>
            ))}
          </div>

          {/* Deductions section */}
          {summary.deductions > 0 && (
            <div className="space-y-1 pt-1 border-t" style={{ borderColor: "hsl(var(--hud-border) / 0.06)" }}>
              <p className="text-[8px] font-bold" style={{ color: "hsl(var(--destructive))" }}>DÉDUCTIONS</p>
              {[
                { label: `Annulations (${jobs.filter(j => j.status === "cancelled").length}x 1€)`, value: summary.cancellationDeductions },
                { label: "Retards SLA", value: summary.lateDeductions },
              ].filter(l => l.value > 0).map(({ label, value }) => (
                <div key={label} className="flex justify-between py-0.5">
                  <span className="text-[9px]" style={{ color: "hsl(var(--hud-text-dim) / 0.6)" }}>{label}</span>
                  <span className="text-[9px] font-semibold" style={{ color: "hsl(var(--destructive))" }}>-{value.toFixed(2)} €</span>
                </div>
              ))}
            </div>
          )}

          {/* Total */}
          <div className="pt-2 border-t flex justify-between" style={{ borderColor: "hsl(var(--hud-border) / 0.1)" }}>
            <span className="text-[10px] font-bold" style={{ color: "hsl(var(--hud-text))" }}>NET À PAYER</span>
            <span className="text-[10px] font-bold" style={{ color: "hsl(var(--success))" }}>{summary.netPay.toFixed(2)} €</span>
          </div>
        </motion.div>
      )}

      {/* Recent deliveries */}
      <div className="space-y-1">
        <p className="text-[10px] font-bold" style={{ color: "hsl(var(--hud-text-dim))" }}>
          LIVRAISONS RÉCENTES ({jobs.length})
        </p>
        {loading ? (
          <div className="flex justify-center py-6">
            <Clock className="h-4 w-4 animate-pulse" style={{ color: "hsl(var(--hud-cyan) / 0.3)" }} />
          </div>
        ) : jobs.length === 0 ? (
          <p className="text-[10px] text-center py-4" style={{ color: "hsl(var(--hud-text-dim) / 0.3)" }}>Aucune livraison sur cette période</p>
        ) : (
          jobs.slice(0, 10).map(job => (
            <div key={job.id} className="flex items-center gap-2 px-3 py-2 rounded-lg"
              style={{ background: "hsl(var(--hud-surface))", border: "1px solid hsl(var(--hud-border) / 0.06)" }}>
              <span className="text-sm">{job.status === "completed" ? "✅" : job.status === "cancelled" ? "❌" : "⏳"}</span>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-semibold truncate" style={{ color: "hsl(var(--hud-text))" }}>
                  {job.dropoff_address}
                </p>
                <p className="text-[8px]" style={{ color: "hsl(var(--hud-text-dim) / 0.4)" }}>
                  {(job.delivered_at || job.created_at) ? new Date(job.delivered_at || job.created_at!).toLocaleDateString("fr") : ""}
                  {job.priority !== "standard" && ` • ${job.priority}`}
                </p>
              </div>
              <span className="text-[10px] font-bold shrink-0"
                style={{ color: job.status === "completed" ? "hsl(var(--success))" : "hsl(var(--hud-text-dim) / 0.3)" }}>
                {job.status === "completed" ? `+${(job.delivery_fee || 0).toFixed(2)}€` : "--"}
              </span>
            </div>
          ))
        )}
      </div>

      {/* Export */}
      <Button size="sm" className="w-full text-xs h-9" onClick={exportCSV}
        style={{ background: "hsl(var(--hud-cyan))", color: "hsl(var(--hud-bg))" }}>
        <Download className="h-3.5 w-3.5 mr-1" /> Exporter le bulletin (CSV)
      </Button>
    </div>
  );
}

