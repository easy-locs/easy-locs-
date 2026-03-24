/**
 * Owner Cockpit — Private control center accessible ONLY to the platform owner.
 * Protected by email whitelist (frontend) + RLS (backend).
 */
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { FuturisticCard } from "@/components/ui/FuturisticCard";
import { StatusPulse } from "@/components/ui/StatusPulse";
import { AnimatedCounter } from "@/components/ui/AnimatedCounter";
import { motion } from "framer-motion";
import {
  Activity, Shield, Database, Zap, Eye, AlertTriangle, CheckCircle2,
  RefreshCw, Server, Cpu, BarChart3, Users, Store, Globe, Bell,
  Search, TrendingUp, Bug, Settings, ArrowLeft,
} from "lucide-react";

const OWNER_EMAIL = "jstarbuzz@gmail.com";

interface EngineStatus {
  name: string;
  icon: any;
  status: "active" | "warning" | "error" | "idle";
  lastRun?: string;
  count?: number;
  note?: string;
}

export default function OwnerCockpitPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<Record<string, number>>({});
  const [engines, setEngines] = useState<EngineStatus[]>([]);
  const [loading, setLoading] = useState(true);

  const isOwner = user?.email?.toLowerCase() === OWNER_EMAIL;

  useEffect(() => {
    if (!isOwner) return;
    loadDashboard();
  }, [isOwner]);

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const [
        { count: merchants },
        { count: notifications },
        { count: conversations },
        { count: feedbackSignals },
        { count: rankings },
        { count: recoveryRuns },
        { count: supportTickets },
        { count: reviews },
      ] = await Promise.all([
        (supabase as any).from("seed_merchants").select("*", { count: "exact", head: true }),
        (supabase as any).from("app_notifications").select("*", { count: "exact", head: true }),
        (supabase as any).from("conversations_v2").select("*", { count: "exact", head: true }),
        (supabase as any).from("entity_feedback_signals").select("*", { count: "exact", head: true }),
        (supabase as any).from("ranking_snapshots").select("*", { count: "exact", head: true }),
        (supabase as any).from("platform_recovery_runs").select("*", { count: "exact", head: true }),
        (supabase as any).from("support_tickets").select("*", { count: "exact", head: true }).catch(() => ({ count: 0 })),
        (supabase as any).from("verified_reviews").select("*", { count: "exact", head: true }).catch(() => ({ count: 0 })),
      ]);

      setStats({
        merchants: merchants ?? 0,
        notifications: notifications ?? 0,
        conversations: conversations ?? 0,
        feedbackSignals: feedbackSignals ?? 0,
        rankings: rankings ?? 0,
        recoveryRuns: recoveryRuns ?? 0,
        supportTickets: supportTickets ?? 0,
        reviews: reviews ?? 0,
      });

      setEngines([
        { name: "Ranking Engine", icon: TrendingUp, status: "active", note: `${rankings ?? 0} snapshots` },
        { name: "AI Feedback", icon: Cpu, status: (feedbackSignals ?? 0) > 0 ? "active" : "idle", note: `${feedbackSignals ?? 0} signals` },
        { name: "Recovery Engine", icon: RefreshCw, status: (recoveryRuns ?? 0) > 0 ? "active" : "idle", note: `${recoveryRuns ?? 0} runs` },
        { name: "Notification Engine", icon: Bell, status: (notifications ?? 0) > 0 ? "active" : "warning", note: `${notifications ?? 0} sent` },
        { name: "Messaging (Orbit V2)", icon: Users, status: (conversations ?? 0) > 0 ? "active" : "warning", note: `${conversations ?? 0} convos` },
        { name: "SEO Engine", icon: Globe, status: "active", note: "Dynamic pages active" },
        { name: "Support / SAV", icon: Shield, status: "active", note: `${supportTickets ?? 0} tickets` },
        { name: "Data Trust", icon: Database, status: "active", note: "Scoring merchants" },
        { name: "Coherence Engine", icon: Eye, status: "active", note: "Menu validation" },
        { name: "Self-Healing", icon: Zap, status: "active", note: "Scan every 10min" },
      ]);
    } catch (e) {
      console.error("[OwnerCockpit] load error", e);
    }
    setLoading(false);
  };

  const runManualAction = async (action: string) => {
    toast.info(`Running ${action}...`);
    try {
      if (action === "recovery") {
        const { error } = await supabase.functions.invoke("platform-recovery");
        if (error) throw error;
        toast.success("Recovery completed");
      } else if (action === "onboarding") {
        const { error } = await supabase.functions.invoke("auto-onboarding-cron");
        if (error) throw error;
        toast.success("Onboarding pipeline executed");
      } else if (action === "scrape") {
        const { error } = await supabase.functions.invoke("auto-source-scrape");
        if (error) throw error;
        toast.success("Scrape triggered");
      } else if (action === "ingestion") {
        const { error } = await supabase.functions.invoke("run-ingestion-pipeline");
        if (error) throw error;
        toast.success("Ingestion pipeline executed");
      }
      await loadDashboard();
    } catch (e: any) {
      toast.error(e.message || `${action} failed`);
    }
  };

  if (!isOwner) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Shield className="w-16 h-16 text-destructive mx-auto" />
          <h1 className="text-2xl font-bold text-foreground">Access Denied</h1>
          <p className="text-muted-foreground">This area is restricted to the platform owner.</p>
          <button onClick={() => navigate("/")} className="px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-semibold">
            Go Home
          </button>
        </div>
      </div>
    );
  }

  const statusColor = (s: string) =>
    s === "active" ? "text-emerald-500 bg-emerald-500/10" :
    s === "warning" ? "text-amber-500 bg-amber-500/10" :
    s === "error" ? "text-destructive bg-destructive/10" :
    "text-muted-foreground bg-muted";

  return (
    <div className="min-h-screen bg-background p-4 space-y-6 max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate("/admin")} className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="text-lg font-bold text-foreground">🔒 Owner Cockpit</h1>
          <p className="text-xs text-muted-foreground">{OWNER_EMAIL}</p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Merchants", value: stats.merchants, icon: Store },
              { label: "Conversations", value: stats.conversations, icon: Users },
              { label: "Notifications", value: stats.notifications, icon: Bell },
              { label: "AI Signals", value: stats.feedbackSignals, icon: Cpu },
              { label: "Rankings", value: stats.rankings, icon: TrendingUp },
              { label: "Recovery Runs", value: stats.recoveryRuns, icon: RefreshCw },
              { label: "Support Tickets", value: stats.supportTickets, icon: Shield },
              { label: "Reviews", value: stats.reviews, icon: CheckCircle2 },
            ].map((kpi) => (
              <FuturisticCard key={kpi.label} variant="kpi" glow>
                <div className="flex items-center gap-2">
                  <kpi.icon className="w-4 h-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">{kpi.label}</span>
                </div>
                <div className="text-xl font-bold mt-1 text-foreground">
                  <AnimatedCounter value={kpi.value ?? 0} />
                </div>
              </FuturisticCard>
            ))}
          </div>

          {/* Engine Status */}
          <div className="space-y-2">
            <h2 className="text-sm font-bold text-foreground">Engine Status</h2>
            {engines.map((eng) => (
              <FuturisticCard key={eng.name} variant="engine" status={eng.status === "active" ? "active" : eng.status === "warning" ? "warning" : eng.status === "error" ? "error" : undefined}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <eng.icon className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <div className="text-sm font-semibold text-foreground">{eng.name}</div>
                      <div className="text-xs text-muted-foreground">{eng.note}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusPulse status={eng.status === "active" ? "active" : eng.status === "warning" ? "warning" : eng.status === "error" ? "error" : "idle"} size="md" />
                    <span className={`text-[11px] font-bold capitalize ${statusColor(eng.status)}`}>
                      {eng.status}
                    </span>
                  </div>
                </div>
              </FuturisticCard>
            ))}
          </div>

          {/* Manual Actions */}
          <div className="space-y-2">
            <h2 className="text-sm font-bold text-foreground">Manual Actions</h2>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: "Run Recovery", action: "recovery", icon: RefreshCw },
                { label: "Run Onboarding", action: "onboarding", icon: Store },
                { label: "Run Scrape", action: "scrape", icon: Search },
                { label: "Run Ingestion", action: "ingestion", icon: Database },
              ].map((btn) => (
                <button
                  key={btn.action}
                  onClick={() => runManualAction(btn.action)}
                  className="flex items-center gap-2 rounded-2xl bg-muted px-4 py-3 text-sm font-bold text-foreground"
                >
                  <btn.icon className="w-4 h-4" />
                  {btn.label}
                </button>
              ))}
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-2">
            <h2 className="text-sm font-bold text-foreground">Quick Links</h2>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: "Engines Dashboard", path: "/admin/engines-dashboard" },
                { label: "Platform Recovery", path: "/admin/platform-recovery" },
                { label: "Ranking Control", path: "/admin/ranking-control" },
                { label: "Quality Ops", path: "/admin/quality-ops" },
                { label: "SEO Monitor", path: "/admin/content-ops" },
                { label: "Support Ops", path: "/admin/support-ops" },
                { label: "Notification Ops", path: "/admin/notification-ops" },
                { label: "Super Dashboard", path: "/admin/super-dashboard" },
              ].map((link) => (
                <button
                  key={link.path}
                  onClick={() => navigate(link.path)}
                  className="rounded-2xl border border-border/20 bg-card px-3 py-2 text-xs font-semibold text-foreground text-left"
                >
                  {link.label}
                </button>
              ))}
            </div>
          </div>

          {/* Refresh */}
          <button
            onClick={loadDashboard}
            className="w-full rounded-2xl bg-primary text-primary-foreground px-4 py-3 text-sm font-bold flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh Dashboard
          </button>
        </>
      )}
    </div>
  );
}
