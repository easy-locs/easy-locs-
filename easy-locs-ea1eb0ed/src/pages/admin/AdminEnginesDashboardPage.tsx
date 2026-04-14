import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, RefreshCw } from "lucide-react";
import { ENGINE_METADATA, detectEngineCollisions, type EngineTier, type BusinessFunction, type RuntimeStatus } from "@/lib/engines/engine-metadata-registry";
import { db } from "@/services/db";
import { useBackendEngineStatus } from "@/hooks/useBackendEngineStatus";
import { useUiEngine } from "@/hooks/useUiEngine";
import { tc, getAppLocale } from "@/lib/i18n-canonical";

function getStatusConfig(): Record<RuntimeStatus, { dot: string; label: string }> {
  return {
    ok:      { dot: "bg-emerald-500", label: tc("admin.status_active") },
    idle:    { dot: "bg-sky-400",     label: tc("admin.status_idle") },
    warning: { dot: "bg-orange-400",  label: tc("admin.status_warning") },
    error:   { dot: "bg-red-500",     label: tc("admin.status_error") },
    pending: { dot: "bg-amber-400",   label: tc("admin.status_pending") },
  };
}

const TIER_BADGE: Record<EngineTier, { bg: string; text: string }> = {
  critical:    { bg: "bg-red-500/15",    text: "text-red-400" },
  priority:    { bg: "bg-orange-500/15",  text: "text-orange-400" },
  standard:    { bg: "bg-muted",          text: "text-muted-foreground" },
  optimizable: { bg: "bg-muted/50",       text: "text-muted-foreground/70" },
};

function getBizFnMeta(): Record<BusinessFunction, { label: string; icon: string }> {
  return {
    onboarding:     { label: tc("admin.onboarding"),      icon: "📥" },
    taxonomy:       { label: tc("admin.taxonomy"),         icon: "🏷️" },
    visibility:     { label: tc("admin.visibility"),       icon: "👁️" },
    conversion:     { label: tc("admin.conversion"),       icon: "💎" },
    lifecycle:      { label: tc("admin.lifecycle"),        icon: "🔄" },
    finance:        { label: tc("admin.finance"),          icon: "🏦" },
    delivery:       { label: tc("admin.delivery"),         icon: "🚚" },
    infrastructure: { label: tc("admin.infrastructure"),   icon: "⚙️" },
  };
}

function getCatMeta(): Record<string, { label: string; icon: string }> {
  return {
    system:    { label: tc("admin.system"),    icon: "⚙️" },
    digital:   { label: tc("admin.digital"),   icon: "🧠" },
    quality:   { label: tc("admin.quality"),   icon: "✅" },
    data:      { label: tc("admin.data"),      icon: "📊" },
    commerce:  { label: tc("admin.commerce"),  icon: "💰" },
    finance:   { label: tc("admin.finance"),   icon: "🏦" },
    delivery:  { label: tc("admin.delivery"),  icon: "🚚" },
    lifecycle: { label: tc("admin.lifecycle"), icon: "🔄" },
  };
}

const CAT_ORDER = ["system", "quality", "data", "digital", "commerce", "finance", "delivery", "lifecycle"];
const BIZ_FN_ORDER: BusinessFunction[] = ["onboarding", "taxonomy", "visibility", "conversion", "lifecycle", "finance", "delivery", "infrastructure"];

type ViewMode = "category" | "business";

type ClassifiedCollision = {
  table: string;
  field: string;
  engines: string[];
  level: "critical_collision" | "warning_collision" | "expected_orchestrated" | "safe_overlap";
  reason: string;
};

type PlatformHealthScores = {
  performance: number;
  coherence: number;
  i18n: number;
  cleanup: number;
  routing: number;
  global: number;
};

const ORCHESTRATED_FIELDS = new Set([
  "seed_merchants.pipeline_stage",
  "seed_merchants.gate_status",
  "seed_merchants.visibility_mode",
]);

const SAFE_OVERLAP_FIELDS = new Set(["seed_merchants.status"]);

function deriveRuntimeStatusLocal(
  rawStatus: RuntimeStatus,
  job: { name: string; itemsProcessed: number; runCount: number },
  canRunIdle: boolean,
): RuntimeStatus {
  if (rawStatus === "error" || rawStatus === "pending" || rawStatus === "warning") return rawStatus;
  if (rawStatus === "ok" && job.itemsProcessed === 0 && job.runCount > 0 && !canRunIdle) return "idle";
  return rawStatus;
}

function classifyCollisionsLocal(): ClassifiedCollision[] {
  return detectEngineCollisions().map((collision) => {
    const key = `${collision.table}.${collision.field}`;
    const hasCritical = collision.engines.some((engine) => ENGINE_METADATA[engine]?.tier === "critical");
    const hasConflictingFn = new Set(collision.engines.map((engine) => ENGINE_METADATA[engine]?.businessFn)).size > 2;

    if (ORCHESTRATED_FIELDS.has(key)) {
      return { ...collision, level: "expected_orchestrated", reason: tc("admin.collision_sequential") };
    }

    if (SAFE_OVERLAP_FIELDS.has(key)) {
      return { ...collision, level: "safe_overlap", reason: tc("admin.collision_safe_overlap") };
    }

    if (hasCritical && hasConflictingFn) {
      return { ...collision, level: "critical_collision", reason: tc("admin.collision_critical") };
    }

    return { ...collision, level: "warning_collision", reason: tc("admin.collision_warning") };
  });
}

function computeHealthScoresLocal(totalJobs: number, jobs: Array<{ runtimeStatus: RuntimeStatus }>, collisions: ClassifiedCollision[]): PlatformHealthScores {
  const safeTotal = Math.max(totalJobs, 1);
  const errors = jobs.filter((job) => job.runtimeStatus === "error").length;
  const pending = jobs.filter((job) => job.runtimeStatus === "pending" || job.runtimeStatus === "idle").length;
  const criticalCollisions = collisions.filter((collision) => collision.level === "critical_collision").length;
  const warningCollisions = collisions.filter((collision) => collision.level === "warning_collision").length;
  const performance = Math.max(0, 100 - Math.round((errors / safeTotal) * 100 * 3));
  const coherence = Math.max(0, 100 - criticalCollisions * 20 - warningCollisions * 5);
  const cleanup = Math.max(0, 100 - Math.round((pending / safeTotal) * 50));
  const i18n = 85;
  const routing = 90;
  const global = Math.round((performance + coherence + i18n + cleanup + routing) / 5);

  return { performance, coherence, i18n, cleanup, routing, global };
}

interface DbStats {
  total: number; live: number; hidden: number; searchOnly: number; comingSoon: number;
  food: number; hotel: number; services: number; grocery: number;
}

export default function AdminEnginesDashboardPage() {
  useUiEngine("admin-adminenginesdashboardpage");
  const navigate = useNavigate();
  const [tick, setTick] = useState(0);
  const [viewMode, setViewMode] = useState<ViewMode>("business");
  const [bizFilter, setBizFilter] = useState<BusinessFunction | null>(null);
  const [statusFilter, setStatusFilter] = useState<RuntimeStatus | null>(null);
  const [dbStats, setDbStats] = useState<DbStats | null>(null);
  const [showCollisions, setShowCollisions] = useState(false);
  const [showDecisions, setShowDecisions] = useState(false);
  const [decisions, setDecisions] = useState<any[]>([]);
  const backendStatus = useBackendEngineStatus();

  useEffect(() => {
    const timer = setInterval(() => setTick(t => t + 1), 8000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const [total, live, hidden, searchOnly, comingSoon, food, hotel, services, grocery] = await Promise.all([
          db("seed_merchants").select("id", { count: "exact", head: true }),
          db("seed_merchants").select("id", { count: "exact", head: true }).eq("visibility_mode", "live"),
          db("seed_merchants").select("id", { count: "exact", head: true }).eq("visibility_mode", "hidden"),
          db("seed_merchants").select("id", { count: "exact", head: true }).eq("visibility_mode", "search_only"),
          db("seed_merchants").select("id", { count: "exact", head: true }).eq("visibility_mode", "coming_soon"),
          db("seed_merchants").select("id", { count: "exact", head: true }).eq("vertical", "food"),
          db("seed_merchants").select("id", { count: "exact", head: true }).eq("vertical", "hotel"),
          db("seed_merchants").select("id", { count: "exact", head: true }).eq("vertical", "services"),
          db("seed_merchants").select("id", { count: "exact", head: true }).eq("vertical", "grocery"),
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
        const { data } = await db("platform_actions_log").select("*").order("created_at", { ascending: false }).limit(20);
        setDecisions(data ?? []);
      } catch {}
    })();
  }, [tick]);

  const rawStatus = backendStatus;
  const collisions = useMemo(() => detectEngineCollisions(), []);
  const classifiedCols = useMemo(() => classifyCollisionsLocal(), [tick]);

  // Enriched jobs with metadata
  const enrichedJobs = useMemo(() => rawStatus.jobs.map(j => {
    const meta = ENGINE_METADATA[j.name];
    const derived = deriveRuntimeStatusLocal(
      j.lastStatus as any,
      { name: j.name, itemsProcessed: j.itemsProcessed, runCount: j.runCount },
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

  const healthScores = useMemo(() => computeHealthScoresLocal(rawStatus.totalJobs, enrichedJobs, classifiedCols), [classifiedCols, enrichedJobs, rawStatus.totalJobs]);

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
  const locale = getAppLocale();
  const STATUS_CONFIG = useMemo(() => getStatusConfig(), [locale]);
  const BIZ_FN_META = useMemo(() => getBizFnMeta(), [locale]);
  const CAT_META = useMemo(() => getCatMeta(), [locale]);
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
        <button onClick={() => navigate("/admin")} aria-label={tc("common.previous")} className="w-9 h-9 rounded-2xl flex items-center justify-center bg-muted text-muted-foreground hover:bg-muted/70 active:scale-[0.98] transition-all duration-200">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="flex-1">
          <h1 className="text-lg font-bold text-foreground">{tc("admin.engine_cockpit")}</h1>
          <p className="text-[11px] text-muted-foreground">
            {tc("admin.engines_subtitle", { count: rawStatus.totalJobs, score: healthScores.global })} · {rawStatus.running ? `🟢 ${tc("admin.live")}` : `🔴 ${tc("admin.off")}`}
          </p>
        </div>
        <button onClick={() => setTick(t => t + 1)} aria-label={tc("admin.refresh")} className="rounded-2xl bg-muted p-2 text-muted-foreground hover:bg-muted/70 active:scale-[0.98] transition-all duration-200">
          <RefreshCw className="h-4 w-4" />
        </button>
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
            <p className="text-[10px] text-muted-foreground">{STATUS_CONFIG[s].label}</p>
          </button>
        ))}
      </div>

      {/* Tier Distribution */}
      <div className="grid grid-cols-4 gap-1.5">
        {(["critical", "priority", "standard", "optimizable"] as EngineTier[]).map(tier => (
          <div key={tier} className={`rounded-xl px-2.5 py-1.5 text-center ${TIER_BADGE[tier].bg}`}>
            <p className={`text-sm font-bold ${TIER_BADGE[tier].text}`}>{tierCounts[tier]}</p>
            <p className="text-[10px] text-muted-foreground capitalize">{tc(`admin.tier_${tier}`)}</p>
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
            📊 {tc("admin.view_business")}
          </button>
          <button
            onClick={() => { setViewMode("category"); setBizFilter(null); }}
            className={`rounded-full px-3 py-1 text-[11px] font-bold ${viewMode === "category" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
          >
            🗂 {tc("admin.view_technical")}
          </button>
          <button
            onClick={() => setShowCollisions(!showCollisions)}
            className={`rounded-full px-3 py-1 text-[11px] font-bold ml-auto ${showCollisions ? "bg-orange-500/20 text-orange-400" : "bg-muted text-muted-foreground"}`}
          >
            ⚡ {tc("admin.collisions")} ({collisions.length})
          </button>
        </div>

        {viewMode === "business" && (
          <div className="flex flex-wrap gap-1">
            <button
              onClick={() => setBizFilter(null)}
              className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${!bizFilter ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
            >
              {tc("admin.all")}
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
                      <p className="text-xs font-semibold text-foreground truncate flex-1">{job.name}</p>
                      <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${tierBadge.bg} ${tierBadge.text}`}>
                        {tc(`admin.tier_${job.tier}`).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground pl-4">
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
                      <p className="text-[10px] text-muted-foreground/60 pl-4 truncate">{job.description}</p>
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
            <span className="text-sm font-bold text-foreground">📋 {tc("admin.business_impact")}</span>
          </div>
          <div className="p-3 space-y-3">
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">{tc("admin.visibility_pipeline")}</p>
              <div className="grid grid-cols-3 gap-1">
                {([
                  { label: tc("admin.total"), value: dbStats.total, color: "text-foreground" },
                  { label: tc("admin.live_label"), value: dbStats.live, color: "text-emerald-500" },
                  { label: tc("admin.hidden"), value: dbStats.hidden, color: "text-red-400" },
                  { label: tc("admin.search"), value: dbStats.searchOnly, color: "text-amber-500" },
                  { label: tc("admin.soon"), value: dbStats.comingSoon, color: "text-sky-400" },
                ]).map(r => (
                  <div key={r.label} className="flex justify-between items-center rounded-lg bg-muted/40 px-2.5 py-1">
                    <span className="text-[10px] text-muted-foreground">{r.label}</span>
                    <span className={`text-sm font-bold ${r.color}`}>{r.value}</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">{tc("admin.verticals")}</p>
              <div className="grid grid-cols-2 gap-1">
                {([
                  { label: tc("admin.food"), value: dbStats.food },
                  { label: tc("admin.hotel"), value: dbStats.hotel },
                  { label: tc("admin.services"), value: dbStats.services },
                  { label: tc("admin.grocery"), value: dbStats.grocery },
                ]).map(r => (
                  <div key={r.label} className="flex justify-between items-center rounded-lg bg-muted/40 px-2.5 py-1">
                    <span className="text-[10px] text-muted-foreground">{r.label}</span>
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
          <span className="text-sm font-bold text-foreground">🏥 {tc("admin.health_scores")}</span>
        </div>
        <div className="p-3 grid grid-cols-3 gap-1.5">
          {([
            { label: tc("admin.performance"), value: healthScores.performance, icon: "⚡" },
            { label: tc("admin.coherence"), value: healthScores.coherence, icon: "🔗" },
            { label: tc("admin.i18n"), value: healthScores.i18n, icon: "🌍" },
            { label: tc("admin.cleanup"), value: healthScores.cleanup, icon: "🧹" },
            { label: tc("admin.routing"), value: healthScores.routing, icon: "🛤️" },
            { label: tc("admin.global"), value: healthScores.global, icon: "🎯" },
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
            <span className="text-sm font-bold text-foreground">⚡ {tc("admin.classified_collisions")}</span>
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
                  <p className="text-[10px] text-muted-foreground">{c.engines.join(" · ")} — {c.reason}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Decision Journal */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <button onClick={() => setShowDecisions(!showDecisions)} className="w-full px-4 py-2 border-b border-border bg-muted/30 flex items-center justify-between">
          <span className="text-sm font-bold text-foreground">📋 {tc("admin.decision_journal")} ({decisions.length})</span>
          <span className="text-[10px] text-muted-foreground" aria-hidden="true">{showDecisions ? "▼" : "▶"}</span>
          <span className="sr-only">{showDecisions ? tc("admin.collapse") : tc("admin.expand")}</span>
        </button>
        {showDecisions && (
          <div className="divide-y divide-border/10 max-h-60 overflow-y-auto">
            {decisions.length === 0 ? (
              <p className="px-4 py-3 text-[11px] text-muted-foreground">{tc("admin.no_decisions")}</p>
            ) : decisions.map((d: any) => {
              const sevColor = d.severity === "critical" ? "text-red-500" : d.severity === "warning" ? "text-amber-500" : "text-muted-foreground";
              return (
                <div key={d.id} className="px-4 py-2">
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-bold ${sevColor}`}>{d.severity?.toUpperCase()}</span>
                    <span className="text-[10px] font-bold text-foreground">{d.action_type}</span>
                    {d.auto_applied && <span className="text-[10px] bg-emerald-500/20 text-emerald-400 rounded px-1">AUTO</span>}
                  </div>
                  <p className="text-[10px] text-muted-foreground truncate">{d.description}</p>
                  <p className="text-[10px] text-muted-foreground/60">{d.decision} · {new Date(d.created_at).toLocaleString()}</p>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Inventory */}
      <div className="rounded-2xl border border-border bg-card p-3 grid grid-cols-2 gap-1">
        {([
          { label: tc("admin.real_engines"), value: rawStatus.totalJobs },
          { label: tc("admin.event_types"), value: 8 },
          { label: tc("admin.collisions"), value: collisions.length },
          { label: tc("admin.health_score_label"), value: `${healthScores.global}/100` },
        ]).map(r => (
          <div key={r.label} className="flex justify-between items-center rounded-lg bg-muted/40 px-2.5 py-1">
            <span className="text-[10px] text-muted-foreground">{r.label}</span>
            <span className="text-sm font-bold text-foreground">{r.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
