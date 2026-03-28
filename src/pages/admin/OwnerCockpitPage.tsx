/**
 * Owner Cockpit — Private command center for jstarbuzz@gmail.com ONLY.
 * Shows ALL 71 engines with real-time status from the continuous engine.
 */
import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { fetchOwnerCockpitStats, invokeOwnerAction } from "@/repositories/admin-ops.repository";
import { toast } from "sonner";
import { FuturisticCard } from "@/components/ui/FuturisticCard";
import { StatusPulse } from "@/components/ui/StatusPulse";
import { AnimatedCounter } from "@/components/ui/AnimatedCounter";
import { motion } from "framer-motion";
import { useBackendEngineStatus } from "@/hooks/useBackendEngineStatus";
import {
  Shield, Zap, RefreshCw, Server, Cpu, BarChart3, Users, Store, Globe, Bell,
  Search, TrendingUp, ArrowLeft, Activity, Truck, Wallet, ShoppingCart,
  Eye, ChefHat, Hotel, Wrench, Filter, CheckCircle2, XCircle, Clock,
  LayoutDashboard, Flame, Package,
} from "lucide-react";

const OWNER_EMAIL = "jstarbuzz@gmail.com";

const CATEGORY_META: Record<string, { label: string; emoji: string; icon: any; color: string }> = {
  system:   { label: "System",   emoji: "⚙️", icon: Server,      color: "text-blue-500" },
  digital:  { label: "Digital",  emoji: "🧠", icon: Globe,       color: "text-purple-500" },
  quality:  { label: "Quality",  emoji: "✅", icon: CheckCircle2, color: "text-emerald-500" },
  data:     { label: "Data",     emoji: "📊", icon: BarChart3,   color: "text-cyan-500" },
  commerce: { label: "Commerce", emoji: "💰", icon: ShoppingCart, color: "text-amber-500" },
  finance:  { label: "Finance",  emoji: "🏦", icon: Wallet,      color: "text-green-500" },
  delivery: { label: "Delivery", emoji: "🚚", icon: Truck,       color: "text-orange-500" },
  lifecycle:{ label: "Lifecycle", emoji: "🔄", icon: RefreshCw,   color: "text-pink-500" },
};

export default function OwnerCockpitPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);
  const [filterCat, setFilterCat] = useState<string | null>(null);
  const engineStatus = useBackendEngineStatus(4000);

  const isOwner = user?.email?.toLowerCase() === OWNER_EMAIL;

  const totalOk = engineStatus.jobs.filter(j => j.lastStatus === "ok").length;
  const totalError = engineStatus.jobs.filter(j => j.lastStatus === "error").length;
  const totalPending = engineStatus.jobs.filter(j => j.lastStatus === "pending").length;

  const grouped = useMemo(() => {
    const g: Record<string, typeof engineStatus.jobs> = {};
    for (const job of engineStatus.jobs) {
      const cat = job.category || "system";
      if (filterCat && cat !== filterCat) continue;
      if (!g[cat]) g[cat] = [];
      g[cat].push(job);
    }
    return g;
  }, [engineStatus, filterCat]);

  useEffect(() => {
    if (!isOwner) return;
    loadStats();
    const timer = setInterval(() => setTick(t => t + 1), 4000);
    return () => clearInterval(timer);
  }, [isOwner]);

  const loadStats = async () => {
    setLoading(true);
    try {
      setStats(await fetchOwnerCockpitStats());
    } catch (e) {
      console.error("[OwnerCockpit] load error", e);
    }
    setLoading(false);
  };

  const runAction = async (action: string) => {
    toast.info(`Running ${action}...`);
    try {
      await invokeOwnerAction(action);
      toast.success(`${action} completed`);
      await loadStats();
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
          <p className="text-muted-foreground">Platform owner only.</p>
          <button onClick={() => navigate("/")} className="px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-semibold">
            Go Home
          </button>
        </div>
      </div>
    );
  }




  const kpis = [
    { label: "Merchants", value: stats.merchants, icon: Store },
    { label: "Orders", value: stats.orders, icon: ShoppingCart },
    { label: "Wallets", value: stats.wallets, icon: Wallet },
    { label: "Notifications", value: stats.notifications, icon: Bell },
    { label: "AI Signals", value: stats.aiSignals, icon: Cpu },
    { label: "Rankings", value: stats.rankings, icon: TrendingUp },
    { label: "Support", value: stats.support, icon: Shield },
    { label: "Reviews", value: stats.reviews, icon: CheckCircle2 },
    { label: "Conversations", value: stats.conversations, icon: Users },
    { label: "Recovery", value: stats.recovery, icon: RefreshCw },
  ];

  return (
    <div className="min-h-screen bg-background p-4 space-y-5 max-w-2xl mx-auto pb-24">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate("/admin")} className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1">
          <h1 className="text-lg font-bold text-foreground">🔒 Owner Cockpit</h1>
          <p className="text-xs text-muted-foreground">{OWNER_EMAIL}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${engineStatus.running ? "bg-emerald-500 animate-pulse" : "bg-red-500"}`} />
          <span className="text-xs font-bold text-foreground">{engineStatus.totalJobs} engines</span>
        </div>
      </div>

      {/* Engine Summary */}
      <div className="grid grid-cols-3 gap-3">
        <FuturisticCard variant="kpi" glow className="p-4 text-center">
          <p className="text-2xl font-bold text-emerald-500"><AnimatedCounter value={totalOk} /></p>
          <p className="text-[11px] text-muted-foreground">Running OK</p>
        </FuturisticCard>
        <FuturisticCard variant="kpi" className="p-4 text-center">
          <p className="text-2xl font-bold text-amber-500"><AnimatedCounter value={totalPending} /></p>
          <p className="text-[11px] text-muted-foreground">Pending</p>
        </FuturisticCard>
        <FuturisticCard variant="kpi" className="p-4 text-center">
          <p className="text-2xl font-bold text-red-500"><AnimatedCounter value={totalError} /></p>
          <p className="text-[11px] text-muted-foreground">Errors</p>
        </FuturisticCard>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-20">
          <RefreshCw className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          {/* KPI Grid */}
          <div>
            <h2 className="text-sm font-bold text-foreground mb-2">Platform KPIs</h2>
            <div className="grid grid-cols-2 gap-2">
              {kpis.map(k => (
                <FuturisticCard key={k.label} variant="kpi" className="p-3">
                  <div className="flex items-center gap-2">
                    <k.icon className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-[11px] text-muted-foreground">{k.label}</span>
                  </div>
                  <div className="text-lg font-bold mt-0.5 text-foreground">
                    <AnimatedCounter value={k.value ?? 0} />
                  </div>
                </FuturisticCard>
              ))}
            </div>
          </div>

          {/* Manual Actions */}
          <div>
            <h2 className="text-sm font-bold text-foreground mb-2">Manual Triggers</h2>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: "Recovery", action: "platform-recovery", icon: RefreshCw },
                { label: "Onboarding", action: "auto-onboarding-cron", icon: Store },
                { label: "Scrape", action: "auto-source-scrape", icon: Search },
                { label: "Ingestion", action: "run-ingestion-pipeline", icon: Package },
                { label: "Cron Server", action: "engine-cron-server", icon: Server },
                { label: "Menu Normalize", action: "normalize-merchant-menu", icon: ChefHat },
              ].map(btn => (
                <button
                  key={btn.action}
                  onClick={() => runAction(btn.action)}
                  className="flex items-center gap-2 rounded-2xl bg-muted px-3 py-2.5 text-xs font-bold text-foreground active:scale-95 transition-transform"
                >
                  <btn.icon className="w-3.5 h-3.5" />
                  {btn.label}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Category Filter */}
      <div>
        <h2 className="text-sm font-bold text-foreground mb-2">
          All Engines ({engineStatus.totalJobs})
        </h2>
        <div className="flex flex-wrap gap-1.5 mb-3">
          <button
            onClick={() => setFilterCat(null)}
            className={`rounded-full px-3 py-1 text-[11px] font-bold transition-colors ${!filterCat ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
          >
            All ({engineStatus.totalJobs})
          </button>
          {Object.entries(engineStatus.categories).map(([cat, count]) => {
            const meta = CATEGORY_META[cat] || { label: cat, emoji: "📦", color: "text-foreground" };
            return (
              <button
                key={cat}
                onClick={() => setFilterCat(filterCat === cat ? null : cat)}
                className={`rounded-full px-3 py-1 text-[11px] font-bold transition-colors ${filterCat === cat ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
              >
                {meta.emoji} {meta.label} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Engines by Category */}
      {Object.entries(grouped).map(([cat, catJobs]) => {
        const meta = CATEGORY_META[cat] || { label: cat, emoji: "📦", icon: Server, color: "text-foreground" };
        const okCount = catJobs.filter(j => j.lastStatus === "ok").length;
        return (
          <motion.div
            key={cat}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-1.5"
          >
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-bold text-foreground">{meta.emoji} {meta.label} ({catJobs.length})</span>
              <span className="text-[10px] text-emerald-500 font-bold">{okCount}/{catJobs.length} OK</span>
            </div>
            {catJobs.map(job => (
              <div
                key={job.name}
                className="flex items-center gap-2.5 rounded-xl border border-border/10 bg-card p-2.5"
              >
                <StatusPulse
                  status={job.lastStatus === "ok" ? "active" : job.lastStatus === "error" ? "error" : "idle"}
                  size="sm"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold truncate text-foreground">{job.name}</p>
                  <p className="text-[9px] text-muted-foreground">
                    Every {job.intervalLabel} · Runs: {job.runCount}
                    {job.lastDetail ? ` · ${job.lastDetail}` : ""}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <span className={`text-[10px] font-bold ${
                    job.lastStatus === "ok" ? "text-emerald-500" :
                    job.lastStatus === "error" ? "text-red-500" :
                    "text-amber-500"
                  }`}>
                    {job.lastStatus.toUpperCase()}
                  </span>
                  {job.lastRun && (
                    <p className="text-[9px] text-muted-foreground">
                      {new Date(job.lastRun).toLocaleTimeString()}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </motion.div>
        );
      })}

      {/* Quick Links */}
      <div>
        <h2 className="text-sm font-bold text-foreground mb-2">Quick Links</h2>
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: "Engines Dashboard", path: "/admin/engines-dashboard" },
            { label: "Central Control", path: "/admin/central-control" },
            { label: "Platform Recovery", path: "/admin/platform-recovery" },
            { label: "Ranking Control", path: "/admin/ranking-control" },
            { label: "Quality Ops", path: "/admin/quality-ops" },
            { label: "Support Ops", path: "/admin/support-ops" },
            { label: "Super Dashboard", path: "/admin/super-dashboard" },
            { label: "SEO Monitor", path: "/admin/content-ops" },
          ].map(link => (
            <button
              key={link.path}
              onClick={() => navigate(link.path)}
              className="rounded-xl border border-border/20 bg-card px-3 py-2 text-[11px] font-semibold text-foreground text-left active:scale-95 transition-transform"
            >
              {link.label}
            </button>
          ))}
        </div>
      </div>

      {/* Refresh */}
      <button
        onClick={() => { loadStats(); setTick(t => t + 1); }}
        className="w-full rounded-2xl bg-primary text-primary-foreground px-4 py-3 text-sm font-bold flex items-center justify-center gap-2 active:scale-95 transition-transform"
      >
        <RefreshCw className="w-4 h-4" />
        Refresh All
      </button>
    </div>
  );
}
