/**
 * DeliverySLAPanel — SLA tracking with auto-penalties for delivery jobs.
 * PASS84-AA: Delivery SLA & Penalties
 */
import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { motion } from "framer-motion";
import { AlertTriangle, Clock, Shield, TrendingDown, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface SLAConfig {
  maxPickupMinutes: number;
  maxDeliveryMinutes: number;
  maxAcceptMinutes: number;
  penaltyPerMinuteLate: number;
  currency: string;
}

const DEFAULT_SLA: SLAConfig = {
  maxPickupMinutes: 30,
  maxDeliveryMinutes: 60,
  maxAcceptMinutes: 10,
  penaltyPerMinuteLate: 0.5,
  currency: "EUR",
};

interface SLAViolation {
  jobId: string;
  type: "accept" | "pickup" | "delivery";
  minutesLate: number;
  penalty: number;
  driverId: string | null;
  dropoffAddress: string;
  status: string;
}

export default function DeliverySLAPanel({ orgId }: { orgId: string }) {
  const { user } = useAuth();
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sla, setSla] = useState<SLAConfig>(DEFAULT_SLA);
  const [showConfig, setShowConfig] = useState(false);

  useEffect(() => {
    if (!orgId) return;
    const fetch = async () => {
      const { data } = await supabase
        .from("mobility_jobs")
        .select("*")
        .eq("merchant_id", orgId)
        .order("created_at", { ascending: false })
        .limit(100);
      if (data) setJobs(data);
      setLoading(false);
    };
    fetch();
  }, [orgId]);

  const violations = useMemo<SLAViolation[]>(() => {
    const v: SLAViolation[] = [];
    for (const job of jobs) {
      const created = new Date(job.created_at).getTime();

      // Accept SLA
      if (job.accepted_at) {
        const acceptMin = (new Date(job.accepted_at).getTime() - (job.assigned_at ? new Date(job.assigned_at).getTime() : created)) / 60000;
        if (acceptMin > sla.maxAcceptMinutes) {
          v.push({
            jobId: job.id,
            type: "accept",
            minutesLate: Math.round(acceptMin - sla.maxAcceptMinutes),
            penalty: Math.round((acceptMin - sla.maxAcceptMinutes) * sla.penaltyPerMinuteLate * 100) / 100,
            driverId: job.driver_id,
            dropoffAddress: job.dropoff_address,
            status: job.status,
          });
        }
      }

      // Pickup SLA
      if (job.picked_up_at && job.accepted_at) {
        const pickMin = (new Date(job.picked_up_at).getTime() - new Date(job.accepted_at).getTime()) / 60000;
        if (pickMin > sla.maxPickupMinutes) {
          v.push({
            jobId: job.id,
            type: "pickup",
            minutesLate: Math.round(pickMin - sla.maxPickupMinutes),
            penalty: Math.round((pickMin - sla.maxPickupMinutes) * sla.penaltyPerMinuteLate * 100) / 100,
            driverId: job.driver_id,
            dropoffAddress: job.dropoff_address,
            status: job.status,
          });
        }
      }

      // Delivery SLA
      if (job.delivered_at && job.picked_up_at) {
        const delivMin = (new Date(job.delivered_at).getTime() - new Date(job.picked_up_at).getTime()) / 60000;
        if (delivMin > sla.maxDeliveryMinutes) {
          v.push({
            jobId: job.id,
            type: "delivery",
            minutesLate: Math.round(delivMin - sla.maxDeliveryMinutes),
            penalty: Math.round((delivMin - sla.maxDeliveryMinutes) * sla.penaltyPerMinuteLate * 100) / 100,
            driverId: job.driver_id,
            dropoffAddress: job.dropoff_address,
            status: job.status,
          });
        }
      }

      // Active jobs exceeding SLA (real-time alerts)
      if (["assigned", "accepted", "in_progress"].includes(job.status)) {
        const now = Date.now();
        if (job.status === "assigned" && !job.accepted_at) {
          const waitMin = (now - new Date(job.assigned_at || job.created_at).getTime()) / 60000;
          if (waitMin > sla.maxAcceptMinutes) {
            v.push({
              jobId: job.id, type: "accept",
              minutesLate: Math.round(waitMin - sla.maxAcceptMinutes),
              penalty: Math.round((waitMin - sla.maxAcceptMinutes) * sla.penaltyPerMinuteLate * 100) / 100,
              driverId: job.driver_id, dropoffAddress: job.dropoff_address, status: job.status,
            });
          }
        }
      }
    }
    return v.sort((a, b) => b.penalty - a.penalty);
  }, [jobs, sla]);

  const totalPenalties = violations.reduce((s, v) => s + v.penalty, 0);
  const complianceRate = jobs.length > 0
    ? Math.round(((jobs.filter(j => j.status === "completed").length - violations.filter(v => v.status === "completed").length) / Math.max(jobs.filter(j => j.status === "completed").length, 1)) * 100)
    : 100;

  const typeLabels = { accept: "⏱️ Acceptation", pickup: "📦 Récupération", delivery: "🚗 Livraison" };
  const typeColors = { accept: "--warning", pickup: "--info", delivery: "--destructive" };

  return (
    <div className="space-y-3">
      {/* KPIs */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: "Violations", value: violations.length, icon: AlertTriangle, color: "--destructive" },
          { label: "Pénalités", value: `${totalPenalties.toFixed(0)}€`, icon: TrendingDown, color: "--warning" },
          { label: "Conformité", value: `${complianceRate}%`, icon: Shield, color: complianceRate >= 80 ? "--success" : "--destructive" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="rounded-xl px-2 py-3 text-center"
            style={{ background: "hsl(var(--hud-surface))", border: "1px solid hsl(var(--hud-border) / 0.08)" }}>
            <Icon className="h-4 w-4 mx-auto mb-1" style={{ color: `hsl(var(${color}))` }} />
            <p className="text-sm font-bold" style={{ color: `hsl(var(${color}))` }}>{value}</p>
            <p className="text-[8px]" style={{ color: "hsl(var(--hud-text-dim) / 0.4)" }}>{label}</p>
          </div>
        ))}
      </div>

      {/* SLA Config Toggle */}
      <Button size="sm" variant="outline" className="w-full text-[10px] h-8"
        onClick={() => setShowConfig(!showConfig)}
        style={{ borderColor: "hsl(var(--hud-border) / 0.15)", color: "hsl(var(--hud-text-dim))" }}>
        ⚙️ {showConfig ? "Masquer" : "Configurer"} les SLA
      </Button>

      {showConfig && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
          className="rounded-xl p-3 space-y-2"
          style={{ background: "hsl(var(--hud-surface))", border: "1px solid hsl(var(--hud-border) / 0.1)" }}>
          {[
            { label: "Délai max. acceptation (min)", key: "maxAcceptMinutes" as const, value: sla.maxAcceptMinutes },
            { label: "Délai max. récupération (min)", key: "maxPickupMinutes" as const, value: sla.maxPickupMinutes },
            { label: "Délai max. livraison (min)", key: "maxDeliveryMinutes" as const, value: sla.maxDeliveryMinutes },
            { label: "Pénalité par min. retard (€)", key: "penaltyPerMinuteLate" as const, value: sla.penaltyPerMinuteLate },
          ].map(({ label, key, value }) => (
            <div key={key} className="flex items-center justify-between">
              <span className="text-[10px]" style={{ color: "hsl(var(--hud-text-dim))" }}>{label}</span>
              <input type="number" value={value}
                onChange={e => setSla(prev => ({ ...prev, [key]: +e.target.value }))}
                className="w-16 h-7 text-xs text-center rounded-md"
                style={{ background: "hsl(var(--hud-bg))", color: "hsl(var(--hud-text))", border: "1px solid hsl(var(--hud-border) / 0.15)" }} />
            </div>
          ))}
        </motion.div>
      )}

      {/* Violations List */}
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Clock className="h-5 w-5 animate-pulse" style={{ color: "hsl(var(--hud-cyan) / 0.3)" }} />
        </div>
      ) : violations.length === 0 ? (
        <div className="flex flex-col items-center py-8">
          <CheckCircle2 className="h-8 w-8 mb-2" style={{ color: "hsl(var(--success) / 0.3)" }} />
          <p className="text-xs" style={{ color: "hsl(var(--hud-text-dim) / 0.4)" }}>Aucune violation SLA 🎉</p>
        </div>
      ) : (
        <div className="space-y-1.5 max-h-[50vh] overflow-y-auto">
          {violations.map((v, i) => (
            <motion.div key={`${v.jobId}-${v.type}-${i}`}
              initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.03 }}
              className="flex items-center gap-3 px-3 py-2 rounded-lg"
              style={{
                background: v.status !== "completed" ? `hsl(var(${typeColors[v.type]}) / 0.06)` : "hsl(var(--hud-surface))",
                border: `1px solid hsl(var(${typeColors[v.type]}) / 0.12)`,
              }}>
              <div className="text-base">{v.status !== "completed" ? "🔴" : "🟡"}</div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-semibold truncate" style={{ color: "hsl(var(--hud-text))" }}>
                  {typeLabels[v.type]} — +{v.minutesLate} min
                </p>
                <p className="text-[9px] truncate" style={{ color: "hsl(var(--hud-text-dim) / 0.5)" }}>
                  {v.dropoffAddress}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-xs font-bold" style={{ color: `hsl(var(${typeColors[v.type]}))` }}>
                  -{v.penalty.toFixed(2)}€
                </p>
                <p className="text-[8px]" style={{ color: "hsl(var(--hud-text-dim) / 0.3)" }}>
                  {v.status === "completed" ? "Terminé" : "En cours"}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
