import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { getContinuousEngineStatus } from "@/lib/platform/platform-continuous-engine";
import { ENGINE_METADATA, detectEngineCollisions, type EngineTier, type BusinessFunction, type RuntimeStatus } from "@/lib/engines/engine-metadata-registry";
import { deriveRuntimeStatus } from "@/lib/engines/global-orchestration-engine";
import { computeHealthScores, classifyCollisions, type ClassifiedCollision, type PlatformHealthScores } from "@/lib/engines/platform-orchestrator-engine";
import { supabase } from "@/integrations/supabase/client";

const db = supabase as any;

const STATUS_CONFIG: Record<RuntimeStatus, { dot: string; label: string }> = {
  ok:      { dot: "bg-emerald-500", label: "Active" },
  idle:    { dot: "bg-sky-400",     label: "Idle" },
  warning: { dot: "bg-orange-400",  label: "Warning" },
  error:   { dot: "bg-red-500",     label: "Error" },
  pending: { dot: "bg-amber-400",   label: "Pending" },
};

const TIER_BADGE: Record<EngineTier, { bg: string; text: string }> = {
  critical:    { bg: "bg-red-500/15",    text: "text-red-400" },
  priority:    { bg: "bg-orange-500/15",  text: "text-orange-400" },
  standard:    { bg: "bg-muted",          text: "text-muted-foreground" },
  optimizable: { bg: "bg-muted/50",       text: "text-muted-foreground/70" },
};

const BIZ_FN_META: Record<BusinessFunction, { label: string; icon: string }> = {
  onboarding:     { label: "Onboarding",      icon: "📥" },
  taxonomy:       { label: "Taxonomy",         icon: "🏷️" },
  visibility:     { label: "Visibility",       icon: "👁️" },
  conversion:     { label: "Conversion",       icon: "💎" },
  lifecycle:      { label: "Lifecycle",        icon: "🔄" },
  finance:        { label: "Finance",          icon: "🏦" },
  delivery:       { label: "Delivery",         icon: "🚚" },
  infrastructure: { label: "Infrastructure",   icon: "⚙️" },
};

const CAT_META: Record<string, { label: string; icon: string }> = {
  system:    { label: "System",    icon: "⚙️" },
  digital:   { label: "Digital",   icon: "🧠" },
  quality:   { label: "Quality",   icon: "✅" },
  data:      { label: "Data",      icon: "📊" },
  commerce:  { label: "Commerce",  icon: "💰" },
  finance:   { label: "Finance",   icon: "🏦" },
  delivery:  { label: "Delivery",  icon: "🚚" },
  lifecycle: { label: "Lifecycle", icon: "🔄" },
};

const CAT_ORDER = ["system", "quality", "data", "digital", "commerce", "finance", "delivery", "lifecycle"];
const BIZ_FN_ORDER: BusinessFunction[] = ["onboarding", "taxonomy", "visibility", "conversion", "lifecycle", "finance", "delivery", "infrastructure"];

type ViewMode = "category" | "business";

interface DbStats {
  total: number; live: number; hidden: number; searchOnly: number; comingSoon: number;
  food: number; hotel: number; services: number; grocery: number;
}

export default function AdminEnginesDashboardPage() {
  const navigate = useNavigate();
  const [tick, setTick] = useState(0);
  const [viewMode, setViewMode] = useState<ViewMode>("business");
  const [bizFilter, setBizFilter] = useState<BusinessFunction | null>(null);
  const [statusFilter, setStatusFilter] = useState<RuntimeStatus | null>(null);
  const [dbStats, setDbStats] = useState<DbStats | null>(null);
  const [showCollisions, setShowCollisions] = useState(false);
  const [showDecisions, setShowDecisions] = useState(false);
  const [decisions, setDecisions] = useState<any[]>([]);

  useEffect(() => {
    const timer = setInterval(() => setTick(t => t + 1), 8000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const [total, live, hidden, searchOnly, comingSoon, food, hotel, services, grocery] = await Promise.all([
          db.from("seed_merchants").select("id", { count: "exact", head: true }),
          db.from("seed_merchants").select("id", { count: "exact", head: true }).eq("visibility_mode", "live"),
          db.from("seed_merchants").select("id", { count: "exact", head: true }).eq("visibility_mode", "hidden"),
          db.from("seed_merchants").select("id", { count: "exact", head: true }).eq("visibility_mode", "search_only"),
          db.from("seed_merchants").select("id", { count: "exact", head: true }).eq("visibility_mode", "coming_soon"),
          db.from("seed_merchants").select("id", { count: "exact", head: true }).eq("vertical", "food"),
          db.from("seed_merchants").select("id", { count: "exact", head: true }).eq("vertical", "hotel"),
          db.from("seed_merchants").select("id", { count: "exact", head: true }).eq("vertical", "services"),
          db.from("seed_merchants").select("id", { count: "exact", head: true }).eq("vertical", "grocery"),
        ]);
        setDbStats({
          total: total.count ?? 0, live: live.count ?? 0, hidden: hidden.count ?? 0,
          searchOnly: searchOnly.count ?? 0, comingSoon: comingSoon.count ?? 0,
          food: food.count ?? 0, hotel: hotel.count ?? 0, services: services.count ?? 0, grocery: grocery.count ?? 0,
        });
      } catch {}
    })();
    // Fetch recent decisions
    (async () => {
      try {
        const { data } = await db.from("platform_actions_log").select("*").order("created_at", { ascending: false }).limit(20);
        setDecisions(data ?? []);
      } catch {}
    })();
  }, [tick]);

  const rawStatus = useMemo(() => getContinuousEngineStatus(), [tick]);
  const collisions = useMemo(() => detectEngineCollisions(), []);
  const classifiedCols = useMemo(() => classifyCollisions(), [tick]);
  const healthScores = useMemo(() => computeHealthScores(), [tick]);

  // Enriched jobs with metadata
  const enrichedJobs = useMemo(() => rawStatus.jobs.map(j => {
    const meta = ENGINE_METADATA[j.name];
    const derived = deriveRuntimeStatus(
      j.lastStatus as any,
      { name: j.name, itemsProcessed: j.itemsProcessed, runCount: j.runCount, lastRun: j.lastRun, lastDetail: j.lastDetail },
      meta?.canRunIdle ?? true
    );
    return {
      ...j,
      runtimeStatus: derived,
      tier: meta?.tier ?? ("standard" as EngineTier),
      businessFn: meta?.businessFn ?? ("infrastructure" as BusinessFunction),
      vertical: meta?.vertical ?? "all",
      canRunIdle: meta?.canRunIdle ?? true,
      description: meta?.description ?? "",
      tablesWritten: meta?.tablesWritten ?? [],
    };
  }), [rawStatus]);

  const filtered = useMemo(() => {
    return enrichedJobs.filter(j => {
      if (statusFilter && j.runtimeStatus !== statusFilter) return false;
      if (bizFilter && j.businessFn !== bizFilter) return false;
      return true;
    });
  }, [enrichedJobs, statusFilter, bizFilter]);

  const grouped = useMemo(() => {
    const g: Record<string, typeof filtered> = {};
    const key = viewMode === "business" ? "businessFn" : "category";
    for (const j of filtered) {
      const k = j[key] as string;
      if (!g[k]) g[k] = [];
      g[k].push(j);
    }
    return g;
  }, [filtered, viewMode]);

  const groupOrder = viewMode === "business" ? BIZ_FN_ORDER : CAT_ORDER;
  const groupMeta = viewMode === "business" ? BIZ_FN_META : CAT_META;

  const totals = useMemo(() => {
    const t: Record<RuntimeStatus, number> = { ok: 0, idle: 0, warning: 0, error: 0, pending: 0 };
    for (const j of enrichedJobs) t[j.runtimeStatus]++;
    return t;
  }, [enrichedJobs]);

  const tierCounts = useMemo(() => {
    const t: Record<EngineTier, number> = { critical: 0, priority: 0, standard: 0, optimizable: 0 };
    for (const j of enrichedJobs) t[j.tier]++;
    return t;
  }, [enrichedJobs]);

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-4 pb-24">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate("/admin")} className="w-9 h-9 rounded-xl flex items-center justify-center bg-muted text-muted-foreground font-bold text-sm">←</button>
        <div className="flex-1">
          <h1 className="text-lg font-bold text-foreground">Engine Cockpit</h1>
          <p className="text-[11px] text-muted-foreground">
            {rawStatus.totalJobs} engines · Health {healthScores.global}/100 · {rawStatus.running ? "🟢 Live" : "🔴 Off"}
          </p>
        </div>
        <button onClick={() => setTick(t => t + 1)} className="rounded-xl bg-muted px-3 py-1.5 text-[11px] font-bold text-muted-foreground">↻</button>
      </div>

      {/* Runtime Status Cards */}
      <div className="grid grid-cols-5 gap-1.5">
        {(["ok", "idle", "warning", "error", "pending"] as RuntimeStatus[]).map(s => (
          <button
            key={s}
            onClick={() => setStatusFilter(statusFilter === s ? null : s)}
            className={`rounded-xl border p-2 text-center transition-all ${statusFilter === s ? "border-primary bg-primary/10" : "border-border bg-card"}`}
          >
            <div className={`w-2 h-2 rounded-full mx-auto mb-1 ${STATUS_CONFIG[s].dot}`} />
            <p className="text-lg font-bold text-foreground">{totals[s]}</p>
            <p className="text-[9px] text-muted-foreground">{STATUS_CONFIG[s].label}</p>
          </button>
        ))}
      </div>

      {/* Tier Distribution */}
      <div className="grid grid-cols-4 gap-1.5">
        {(["critical", "priority", "standard", "optimizable"] as EngineTier[]).map(tier => (
          <div key={tier} className={`rounded-xl px-2.5 py-1.5 text-center ${TIER_BADGE[tier].bg}`}>
            <p className={`text-sm font-bold ${TIER_BADGE[tier].text}`}>{tierCounts[tier]}</p>
            <p className="text-[9px] text-muted-foreground capitalize">{tier}</p>
          </div>
        ))}
      </div>

      {/* View Toggle + Business Function Filter */}
      <div className="space-y-2">
        <div className="flex gap-1.5">
          <button
            onClick={() => { setViewMode("business"); setBizFilter(null); }}
            className={`rounded-full px-3 py-1 text-[11px] font-bold ${viewMode === "business" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
          >
            📊 Business
          </button>
          <button
            onClick={() => { setViewMode("category"); setBizFilter(null); }}
            className={`rounded-full px-3 py-1 text-[11px] font-bold ${viewMode === "category" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
          >
            🗂 Technical
          </button>
          <button
            onClick={() => setShowCollisions(!showCollisions)}
            className={`rounded-full px-3 py-1 text-[11px] font-bold ml-auto ${showCollisions ? "bg-orange-500/20 text-orange-400" : "bg-muted text-muted-foreground"}`}
          >
            ⚡ Collisions ({collisions.length})
          </button>
        </div>

        {viewMode === "business" && (
          <div className="flex flex-wrap gap-1">
            <button
              onClick={() => setBizFilter(null)}
              className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${!bizFilter ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
            >
              All
            </button>
            {BIZ_FN_ORDER.map(fn => {
              const count = enrichedJobs.filter(j => j.businessFn === fn).length;
              if (count === 0) return null;
              return (
                <button
                  key={fn}
                  onClick={() => setBizFilter(bizFilter === fn ? null : fn)}
                  className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${bizFilter === fn ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
                >
                  {BIZ_FN_META[fn].icon} {BIZ_FN_META[fn].label} ({count})
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Collisions Panel */}
      {showCollisions && collisions.length > 0 && (
        <div className="rounded-2xl border border-orange-500/30 bg-orange-500/5 overflow-hidden">
          <div className="px-4 py-2 border-b border-orange-500/20">
            <span className="text-sm font-bold text-orange-400">⚡ Field Collisions</span>
            <p className="text-[10px] text-muted-foreground">Multiple engines write to the same field</p>
          </div>
          <div className="divide-y divide-orange-500/10">
            {collisions.map((c, i) => (
              <div key={i} className="px-4 py-2">
                <p className="text-[11px] font-mono font-bold text-foreground">{c.table}.{c.field}</p>
                <p className="text-[10px] text-muted-foreground">{c.engines.join(" · ")}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Engine Groups */}
      {groupOrder.filter(k => grouped[k]).map(key => {
        const jobs = grouped[key]!;
        const meta = (groupMeta as any)[key] || { label: key, icon: "📦" };
        const okCount = jobs.filter(j => j.runtimeStatus === "ok").length;
        const idleCount = jobs.filter(j => j.runtimeStatus === "idle").length;
        const errCount = jobs.filter(j => j.runtimeStatus === "error").length;

        return (
          <div key={key} className="rounded-2xl border border-border bg-card overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-muted/30">
              <span className="text-sm font-bold text-foreground">{meta.icon} {meta.label}</span>
              <div className="flex items-center gap-2 text-[10px] font-medium">
                {okCount > 0 && <span className="text-emerald-500">{okCount}✓</span>}
                {idleCount > 0 && <span className="text-sky-400">{idleCount}○</span>}
                {errCount > 0 && <span className="text-red-500">{errCount}✗</span>}
                <span className="text-muted-foreground">{jobs.length}</span>
              </div>
            </div>
            <div className="divide-y divide-border/5">
              {jobs.map(job => {
                const tierBadge = TIER_BADGE[job.tier];
                return (
                  <div key={job.name} className="px-4 py-2 space-y-1">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full shrink-0 ${STATUS_CONFIG[job.runtimeStatus].dot}`} />
                      <p className="text-[12px] font-semibold text-foreground truncate flex-1">{job.name}</p>
                      <span className={`rounded-full px-1.5 py-0.5 text-[8px] font-bold ${tierBadge.bg} ${tierBadge.text}`}>
                        {job.tier.toUpperCase()}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-[9px] text-muted-foreground pl-4">
                      <span>⏱ {job.intervalLabel}</span>
                      <span>×{job.runCount}</span>
                      {job.vertical !== "all" && (
                        <span className="rounded bg-primary/10 text-primary px-1 py-0.5 font-bold">{job.vertical}</span>
                      )}
                      {job.lastDetail && <span className="opacity-70">{job.lastDetail}</span>}
                      <span className="ml-auto font-mono">
                        {job.lastRun ? new Date(job.lastRun).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"}
                      </span>
                    </div>
                    {job.description && (
                      <p className="text-[9px] text-muted-foreground/60 pl-4 truncate">{job.description}</p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Live DB Impact */}
      {dbStats && (
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="px-4 py-2 border-b border-border bg-muted/30">
            <span className="text-sm font-bold text-foreground">📋 Business Impact</span>
          </div>
          <div className="p-3 space-y-3">
            <div>
              <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Visibility Pipeline</p>
              <div className="grid grid-cols-3 gap-1">
                {([
                  { label: "Total", value: dbStats.total, color: "text-foreground" },
                  { label: "Live", value: dbStats.live, color: "text-emerald-500" },
                  { label: "Hidden", value: dbStats.hidden, color: "text-red-400" },
                  { label: "Search", value: dbStats.searchOnly, color: "text-amber-500" },
                  { label: "Soon", value: dbStats.comingSoon, color: "text-sky-400" },
                ]).map(r => (
                  <div key={r.label} className="flex justify-between items-center rounded-lg bg-muted/40 px-2.5 py-1">
                    <span className="text-[9px] text-muted-foreground">{r.label}</span>
                    <span className={`text-sm font-bold ${r.color}`}>{r.value}</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Verticals</p>
              <div className="grid grid-cols-2 gap-1">
                {([
                  { label: "🍽️ Food", value: dbStats.food },
                  { label: "🏨 Hotel", value: dbStats.hotel },
                  { label: "🔧 Services", value: dbStats.services },
                  { label: "🛒 Grocery", value: dbStats.grocery },
                ]).map(r => (
                  <div key={r.label} className="flex justify-between items-center rounded-lg bg-muted/40 px-2.5 py-1">
                    <span className="text-[9px] text-muted-foreground">{r.label}</span>
                    <span className="text-sm font-bold text-foreground">{r.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Health Scores */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="px-4 py-2 border-b border-border bg-muted/30">
          <span className="text-sm font-bold text-foreground">🏥 Platform Health Scores</span>
        </div>
        <div className="p-3 grid grid-cols-3 gap-1.5">
          {([
            { label: "Performance", value: healthScores.performance, icon: "⚡" },
            { label: "Coherence", value: healthScores.coherence, icon: "🔗" },
            { label: "i18n", value: healthScores.i18n, icon: "🌍" },
            { label: "Cleanup", value: healthScores.cleanup, icon: "🧹" },
            { label: "Routing", value: healthScores.routing, icon: "🛤️" },
            { label: "Global", value: healthScores.global, icon: "🎯" },
          ]).map(s => (
            <div key={s.label} className="rounded-xl bg-muted/40 px-2.5 py-2 text-center">
              <p className="text-[10px] text-muted-foreground">{s.icon} {s.label}</p>
              <p className={`text-lg font-bold ${s.value >= 80 ? "text-emerald-500" : s.value >= 50 ? "text-amber-500" : "text-red-500"}`}>{s.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Classified Collisions */}
      {showCollisions && classifiedCols.length > 0 && (
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="px-4 py-2 border-b border-border bg-muted/30">
            <span className="text-sm font-bold text-foreground">⚡ Classified Collisions</span>
          </div>
          <div className="divide-y divide-border/10">
            {classifiedCols.map((c, i) => {
              const levelColor = c.level === "critical_collision" ? "text-red-500" : c.level === "warning_collision" ? "text-amber-500" : c.level === "expected_orchestrated" ? "text-sky-400" : "text-emerald-500";
              return (
                <div key={i} className="px-4 py-2">
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-bold ${levelColor}`}>{c.level.replace("_", " ").toUpperCase()}</span>
                    <span className="text-[11px] font-mono font-bold text-foreground">{c.table}.{c.field}</span>
                  </div>
                  <p className="text-[9px] text-muted-foreground">{c.engines.join(" · ")} — {c.reason}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Decision Journal */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <button onClick={() => setShowDecisions(!showDecisions)} className="w-full px-4 py-2 border-b border-border bg-muted/30 flex items-center justify-between">
          <span className="text-sm font-bold text-foreground">📋 Decision Journal ({decisions.length})</span>
          <span className="text-[10px] text-muted-foreground">{showDecisions ? "▼" : "▶"}</span>
        </button>
        {showDecisions && (
          <div className="divide-y divide-border/10 max-h-60 overflow-y-auto">
            {decisions.length === 0 ? (
              <p className="px-4 py-3 text-[11px] text-muted-foreground">No decisions logged yet. Orchestrator will populate on next cycle.</p>
            ) : decisions.map((d: any) => {
              const sevColor = d.severity === "critical" ? "text-red-500" : d.severity === "warning" ? "text-amber-500" : "text-muted-foreground";
              return (
                <div key={d.id} className="px-4 py-2">
                  <div className="flex items-center gap-2">
                    <span className={`text-[9px] font-bold ${sevColor}`}>{d.severity?.toUpperCase()}</span>
                    <span className="text-[10px] font-bold text-foreground">{d.action_type}</span>
                    {d.auto_applied && <span className="text-[8px] bg-emerald-500/20 text-emerald-400 rounded px-1">AUTO</span>}
                  </div>
                  <p className="text-[10px] text-muted-foreground truncate">{d.description}</p>
                  <p className="text-[9px] text-muted-foreground/60">{d.decision} · {new Date(d.created_at).toLocaleString()}</p>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Inventory */}
      <div className="rounded-2xl border border-border bg-card p-3 grid grid-cols-2 gap-1">
        {([
          { label: "Real Engines", value: rawStatus.totalJobs },
          { label: "Event Types", value: 8 },
          { label: "Collisions", value: collisions.length },
          { label: "Health Score", value: `${healthScores.global}/100` },
        ]).map(r => (
          <div key={r.label} className="flex justify-between items-center rounded-lg bg-muted/40 px-2.5 py-1">
            <span className="text-[9px] text-muted-foreground">{r.label}</span>
            <span className="text-sm font-bold text-foreground">{r.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
