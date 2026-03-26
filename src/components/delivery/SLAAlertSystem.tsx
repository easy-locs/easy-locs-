/**
 * SLAAlertSystem — YYY. SLA-based smart alert system.
 * Delay detection, incident tracking, automatic escalation to support.
 * PASS96-YYY
 */
import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import {
  AlertTriangle, Clock, Shield, Bell, TrendingUp, CheckCircle2,
  XCircle, ArrowUpRight, Loader2, Zap,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { haptic } from "@/lib/haptics";

interface Props {
  orgId: string;
  className?: string;
}

interface SLARule {
  id: string;
  name: string;
  maxMinutes: number;
  escalateAfter: number;
  priority: "low" | "medium" | "high" | "critical";
  active: boolean;
}

interface SLAAlert {
  id: string;
  jobId: string;
  rule: string;
  severity: "warning" | "critical" | "escalated";
  message: string;
  createdAt: string;
  resolvedAt: string | null;
  elapsedMinutes: number;
}

const DEFAULT_RULES: SLARule[] = [
  { id: "r1", name: "Temps d'acceptation", maxMinutes: 10, escalateAfter: 20, priority: "high", active: true },
  { id: "r2", name: "Temps de collecte", maxMinutes: 30, escalateAfter: 60, priority: "medium", active: true },
  { id: "r3", name: "Temps de livraison", maxMinutes: 60, escalateAfter: 120, priority: "high", active: true },
  { id: "r4", name: "Réponse litige", maxMinutes: 240, escalateAfter: 480, priority: "critical", active: true },
];

const SEVERITY_CONFIG = {
  warning: { color: "--warning", icon: Clock, label: "Avertissement" },
  critical: { color: "--destructive", icon: AlertTriangle, label: "Critique" },
  escalated: { color: "--destructive", icon: ArrowUpRight, label: "Escaladé" },
};

export default function SLAAlertSystem({ orgId, className }: Props) {
  const { user } = useAuth();
  const [rules, setRules] = useState<SLARule[]>(DEFAULT_RULES);
  const [alerts, setAlerts] = useState<SLAAlert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const generateAlerts = async () => {
      setLoading(true);
      const since = new Date();
      since.setDate(since.getDate() - 7);

      const { data: jobs } = await supabase
        .from("mobility_jobs")
        .select("id, status, created_at, assigned_at, accepted_at, picked_up_at, delivered_at")
        .eq("merchant_id", user.id)
        .gte("created_at", since.toISOString())
        .limit(200);

      const generatedAlerts: SLAAlert[] = [];
      const now = Date.now();

      (jobs || []).forEach(job => {
        // Check acceptance SLA
        if (job.status === "assigned" && job.assigned_at) {
          const elapsed = (now - new Date(job.assigned_at).getTime()) / 60000;
          if (elapsed > rules[0].maxMinutes) {
            generatedAlerts.push({
              id: `a-${job.id}-accept`, jobId: job.id, rule: rules[0].name,
              severity: elapsed > rules[0].escalateAfter ? "escalated" : "critical",
              message: `Mission en attente d'acceptation depuis ${Math.round(elapsed)}min`,
              createdAt: job.assigned_at, resolvedAt: null, elapsedMinutes: Math.round(elapsed),
            });
          }
        }

        // Check pickup SLA
        if (job.status === "accepted" && job.accepted_at) {
          const elapsed = (now - new Date(job.accepted_at).getTime()) / 60000;
          if (elapsed > rules[1].maxMinutes) {
            generatedAlerts.push({
              id: `a-${job.id}-pickup`, jobId: job.id, rule: rules[1].name,
              severity: elapsed > rules[1].escalateAfter ? "escalated" : "warning",
              message: `Colis non collecté depuis ${Math.round(elapsed)}min`,
              createdAt: job.accepted_at, resolvedAt: null, elapsedMinutes: Math.round(elapsed),
            });
          }
        }

        // Check delivery SLA
        if (job.status === "in_progress" && job.picked_up_at) {
          const elapsed = (now - new Date(job.picked_up_at).getTime()) / 60000;
          if (elapsed > rules[2].maxMinutes) {
            generatedAlerts.push({
              id: `a-${job.id}-deliver`, jobId: job.id, rule: rules[2].name,
              severity: elapsed > rules[2].escalateAfter ? "escalated" : "critical",
              message: `Livraison en cours depuis ${Math.round(elapsed)}min`,
              createdAt: job.picked_up_at, resolvedAt: null, elapsedMinutes: Math.round(elapsed),
            });
          }
        }
      });

      setAlerts(generatedAlerts.sort((a, b) => b.elapsedMinutes - a.elapsedMinutes));
      setLoading(false);
    };
    generateAlerts();
  }, [user, rules]);

  const stats = useMemo(() => {
    const active = alerts.filter(a => !a.resolvedAt);
    const critical = active.filter(a => a.severity === "critical" || a.severity === "escalated");
    return { total: active.length, critical: critical.length, escalated: active.filter(a => a.severity === "escalated").length };
  }, [alerts]);

  const resolveAlert = (id: string) => {
    haptic("light");
    setAlerts(p => p.map(a => a.id === id ? { ...a, resolvedAt: new Date().toISOString() } : a));
    toast.success("Alerte résolue");
  };

  const toggleRule = (id: string) => {
    haptic("light");
    setRules(p => p.map(r => r.id === id ? { ...r, active: !r.active } : r));
  };

  if (loading) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="h-5 w-5 animate-spin" style={{ color: "hsl(var(--hud-cyan) / 0.3)" }} /></div>;
  }

  return (
    <div className={`space-y-4 ${className || ""}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4" style={{ color: "hsl(var(--hud-cyan))" }} />
          <h3 className="text-sm font-bold" style={{ color: "hsl(var(--hud-text))" }}>Alertes SLA</h3>
        </div>
        {stats.total > 0 && (
          <span className="text-[9px] font-bold px-2 py-0.5 rounded-full"
            style={{ background: "hsl(var(--destructive) / 0.15)", color: "hsl(var(--destructive))" }}>
            {stats.total} actives
          </span>
        )}
      </div>

      {/* Status cards */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: "Actives", value: stats.total, color: "--warning" },
          { label: "Critiques", value: stats.critical, color: "--destructive" },
          { label: "Escaladées", value: stats.escalated, color: "--destructive" },
        ].map(s => (
          <div key={s.label} className="rounded-xl p-2.5 text-center"
            style={{ background: `hsl(var(${s.color}) / 0.06)`, border: `1px solid hsl(var(${s.color}) / 0.1)` }}>
            <p className="text-lg font-black" style={{ color: `hsl(var(${s.color}))` }}>{s.value}</p>
            <p className="text-[7px]" style={{ color: "hsl(var(--hud-text-dim) / 0.4)" }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Active alerts */}
      {alerts.filter(a => !a.resolvedAt).length > 0 ? (
        <div className="space-y-2">
          {alerts.filter(a => !a.resolvedAt).map(alert => {
            const cfg = SEVERITY_CONFIG[alert.severity];
            const Icon = cfg.icon;
            return (
              <motion.div key={alert.id} layout initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                className="rounded-xl p-3 flex items-start gap-3"
                style={{ background: `hsl(var(${cfg.color}) / 0.04)`, border: `1px solid hsl(var(${cfg.color}) / 0.12)` }}>
                <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                  style={{ background: `hsl(var(${cfg.color}) / 0.12)` }}>
                  <Icon className="h-4 w-4" style={{ color: `hsl(var(${cfg.color}))` }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                      style={{ background: `hsl(var(${cfg.color}) / 0.15)`, color: `hsl(var(${cfg.color}))` }}>
                      {cfg.label}
                    </span>
                    <span className="text-[8px]" style={{ color: "hsl(var(--hud-text-dim) / 0.3)" }}>{alert.rule}</span>
                  </div>
                  <p className="text-[10px] mt-1 font-medium" style={{ color: "hsl(var(--hud-text))" }}>{alert.message}</p>
                  <p className="text-[8px] mt-0.5" style={{ color: "hsl(var(--hud-text-dim) / 0.3)" }}>
                    Job: {alert.jobId.slice(0, 8)}… • {alert.elapsedMinutes}min écoulées
                  </p>
                </div>
                <Button size="sm" className="h-7 px-2 text-[9px] shrink-0" onClick={() => resolveAlert(alert.id)}
                  style={{ background: `hsl(var(${cfg.color}) / 0.12)`, color: `hsl(var(${cfg.color}))` }}>
                  <CheckCircle2 className="h-3 w-3 mr-0.5" /> Résoudre
                </Button>
              </motion.div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-xl p-6 text-center" style={{ background: "hsl(var(--success) / 0.04)", border: "1px solid hsl(var(--success) / 0.1)" }}>
          <CheckCircle2 className="h-8 w-8 mx-auto mb-2" style={{ color: "hsl(var(--success))" }} />
          <p className="text-xs font-semibold" style={{ color: "hsl(var(--success))" }}>Aucune alerte SLA active</p>
          <p className="text-[9px]" style={{ color: "hsl(var(--hud-text-dim) / 0.4)" }}>Toutes les missions respectent les délais</p>
        </div>
      )}

      {/* SLA Rules */}
      <div className="rounded-xl p-3" style={{ background: "hsl(var(--hud-surface))", border: "1px solid hsl(var(--hud-border) / 0.08)" }}>
        <p className="text-[10px] font-semibold mb-2" style={{ color: "hsl(var(--hud-text-dim))" }}>
          <Zap className="h-3 w-3 inline mr-1" /> Règles SLA configurées
        </p>
        <div className="space-y-1.5">
          {rules.map(rule => (
            <div key={rule.id} className="flex items-center justify-between py-1.5 border-b"
              style={{ borderColor: "hsl(var(--hud-border) / 0.05)" }}>
              <div>
                <p className="text-[10px] font-medium" style={{ color: rule.active ? "hsl(var(--hud-text))" : "hsl(var(--hud-text-dim) / 0.3)" }}>
                  {rule.name}
                </p>
                <p className="text-[8px]" style={{ color: "hsl(var(--hud-text-dim) / 0.3)" }}>
                  Max: {rule.maxMinutes}min • Escalade: {rule.escalateAfter}min
                </p>
              </div>
              <button onClick={() => toggleRule(rule.id)}
                className="p-1 rounded-lg" style={{ background: rule.active ? "hsl(var(--success) / 0.1)" : "hsl(var(--hud-border) / 0.06)" }}>
                {rule.active ?
                  <CheckCircle2 className="h-3.5 w-3.5" style={{ color: "hsl(var(--success))" }} /> :
                  <XCircle className="h-3.5 w-3.5" style={{ color: "hsl(var(--hud-text-dim) / 0.3)" }} />}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
