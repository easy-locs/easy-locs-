import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { getContinuousEngineStatus } from "@/lib/platform/platform-continuous-engine";
import { supabase } from "@/integrations/supabase/client";

const db = supabase as any;

const STATUS_DOT: Record<string, string> = {
  ok: "bg-emerald-500",
  error: "bg-red-500",
  pending: "bg-amber-400",
};

const CATEGORY_META: Record<string, { label: string; icon: string }> = {
  system: { label: "System", icon: "⚙️" },
  digital: { label: "Digital", icon: "🧠" },
  quality: { label: "Quality", icon: "✅" },
  data: { label: "Data", icon: "📊" },
  commerce: { label: "Commerce", icon: "💰" },
  finance: { label: "Finance", icon: "🏦" },
  delivery: { label: "Delivery", icon: "🚚" },
  lifecycle: { label: "Lifecycle", icon: "🔄" },
};

const CAT_ORDER = ["system", "quality", "data", "digital", "commerce", "finance", "delivery", "lifecycle"];

interface DbStats {
  total: number;
  live: number;
  hidden: number;
  searchOnly: number;
  comingSoon: number;
  food: number;
  hotel: number;
  services: number;
  grocery: number;
}

export default function AdminEnginesDashboardPage() {
  const navigate = useNavigate();
  const [tick, setTick] = useState(0);
  const [catFilter, setCatFilter] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [dbStats, setDbStats] = useState<DbStats | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setTick(t => t + 1), 5000);
    return () => clearInterval(timer);
  }, []);

  // Live DB stats
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
          total: total.count ?? 0,
          live: live.count ?? 0,
          hidden: hidden.count ?? 0,
          searchOnly: searchOnly.count ?? 0,
          comingSoon: comingSoon.count ?? 0,
          food: food.count ?? 0,
          hotel: hotel.count ?? 0,
          services: services.count ?? 0,
          grocery: grocery.count ?? 0,
        });
      } catch {}
    })();
  }, [tick]);

  const status = useMemo(() => getContinuousEngineStatus(), [tick]);

  const grouped = useMemo(() => {
    const g: Record<string, typeof status.jobs> = {};
    for (const job of status.jobs) {
      const c = job.category || "system";
      if (catFilter && c !== catFilter) continue;
      if (statusFilter && job.lastStatus !== statusFilter) continue;
      if (!g[c]) g[c] = [];
      g[c].push(job);
    }
    return g;
  }, [status, catFilter, statusFilter]);

  const totals = useMemo(() => ({
    ok: status.jobs.filter(j => j.lastStatus === "ok").length,
    error: status.jobs.filter(j => j.lastStatus === "error").length,
    pending: status.jobs.filter(j => j.lastStatus === "pending").length,
  }), [status]);

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
      {/* ── Header ── */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate("/admin")} className="w-9 h-9 rounded-xl flex items-center justify-center bg-muted text-muted-foreground font-bold text-sm">←</button>
        <div className="flex-1">
          <h1 className="text-lg font-bold text-foreground">Engine Cockpit</h1>
          <p className="text-[11px] text-muted-foreground">
            {status.totalJobs} engines · {status.running ? "🟢 Running" : "🔴 Stopped"}
          </p>
        </div>
        <button onClick={() => setTick(t => t + 1)} className="rounded-xl bg-muted px-3 py-1.5 text-[11px] font-bold text-muted-foreground">↻</button>
      </div>

      {/* ── Status Summary ── */}
      <div className="grid grid-cols-3 gap-2">
        {([
          { key: "ok", label: "Healthy", count: totals.ok, color: "text-emerald-500", border: "border-emerald-500/30", bg: "bg-emerald-500/10" },
          { key: "pending", label: "Pending", count: totals.pending, color: "text-amber-500", border: "border-amber-500/30", bg: "bg-amber-500/10" },
          { key: "error", label: "Errors", count: totals.error, color: "text-red-500", border: "border-red-500/30", bg: "bg-red-500/10" },
        ] as const).map(s => (
          <button
            key={s.key}
            onClick={() => setStatusFilter(statusFilter === s.key ? null : s.key)}
            className={`rounded-2xl border p-3 text-center transition-all ${statusFilter === s.key ? `${s.border} ${s.bg}` : "border-border bg-card"}`}
          >
            <p className={`text-xl font-bold ${s.color}`}>{s.count}</p>
            <p className="text-[10px] text-muted-foreground font-medium">{s.label}</p>
          </button>
        ))}
      </div>

      {/* ── Category Chips ── */}
      <div className="flex flex-wrap gap-1.5">
        <button
          onClick={() => setCatFilter(null)}
          className={`rounded-full px-3 py-1 text-[11px] font-bold transition-all ${!catFilter ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
        >
          All ({status.totalJobs})
        </button>
        {CAT_ORDER.map(cat => {
          const count = (status.categories as any)[cat] ?? 0;
          if (count === 0) return null;
          const meta = CATEGORY_META[cat];
          return (
            <button
              key={cat}
              onClick={() => setCatFilter(catFilter === cat ? null : cat)}
              className={`rounded-full px-2.5 py-1 text-[11px] font-bold transition-all ${catFilter === cat ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
            >
              {meta.icon} {meta.label} ({count})
            </button>
          );
        })}
      </div>

      {/* ── Engine Groups ── */}
      {CAT_ORDER.filter(c => grouped[c]).map(cat => {
        const catJobs = grouped[cat]!;
        const meta = CATEGORY_META[cat] || { label: cat, icon: "📦" };
        const okCount = catJobs.filter(j => j.lastStatus === "ok").length;
        const errCount = catJobs.filter(j => j.lastStatus === "error").length;

        return (
          <div key={cat} className="rounded-2xl border border-border bg-card overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-muted/30">
              <span className="text-sm font-bold text-foreground">{meta.icon} {meta.label}</span>
              <div className="flex items-center gap-2 text-[10px] font-medium">
                <span className="text-emerald-500">{okCount}✓</span>
                {errCount > 0 && <span className="text-red-500">{errCount}✗</span>}
                <span className="text-muted-foreground">{catJobs.length}</span>
              </div>
            </div>
            <div className="divide-y divide-border/10">
              {catJobs.map(job => (
                <div key={job.name} className="flex items-center gap-3 px-4 py-2">
                  <div className={`w-2 h-2 rounded-full shrink-0 ${STATUS_DOT[job.lastStatus] || "bg-muted-foreground/40"}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-semibold text-foreground truncate">{job.name}</p>
                    <p className="text-[10px] text-muted-foreground">
                      ⏱ {job.intervalLabel} · ×{job.runCount}
                      {job.lastDetail && <span className="ml-1 opacity-70">· {job.lastDetail}</span>}
                    </p>
                  </div>
                  <span className="text-[10px] font-mono text-muted-foreground shrink-0">
                    {job.lastRun ? new Date(job.lastRun).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {/* ── Live DB Impact ── */}
      {dbStats && (
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="px-4 py-2.5 border-b border-border bg-muted/30">
            <span className="text-sm font-bold text-foreground">📋 Live Database Impact</span>
          </div>
          <div className="p-3 space-y-3">
            {/* Visibility */}
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Visibility</p>
              <div className="grid grid-cols-2 gap-1.5">
                {([
                  { label: "Total Merchants", value: dbStats.total },
                  { label: "Live", value: dbStats.live, color: "text-emerald-500" },
                  { label: "Search Only", value: dbStats.searchOnly, color: "text-amber-500" },
                  { label: "Hidden", value: dbStats.hidden, color: "text-red-400" },
                  { label: "Coming Soon", value: dbStats.comingSoon, color: "text-blue-400" },
                ] as const).map(r => (
                  <div key={r.label} className="flex justify-between items-center rounded-xl bg-muted/40 px-3 py-1.5">
                    <span className="text-[10px] text-muted-foreground">{r.label}</span>
                    <span className={`text-sm font-bold ${r.color || "text-foreground"}`}>{r.value}</span>
                  </div>
                ))}
              </div>
            </div>
            {/* Verticals */}
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Verticals</p>
              <div className="grid grid-cols-2 gap-1.5">
                {([
                  { label: "🍽️ Food", value: dbStats.food },
                  { label: "🏨 Hotel", value: dbStats.hotel },
                  { label: "🔧 Services", value: dbStats.services },
                  { label: "🛒 Grocery", value: dbStats.grocery },
                ] as const).map(r => (
                  <div key={r.label} className="flex justify-between items-center rounded-xl bg-muted/40 px-3 py-1.5">
                    <span className="text-[10px] text-muted-foreground">{r.label}</span>
                    <span className="text-sm font-bold text-foreground">{r.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Inventory Truth ── */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="px-4 py-2.5 border-b border-border bg-muted/30">
          <span className="text-sm font-bold text-foreground">📦 Inventory Truth</span>
        </div>
        <div className="p-3 grid grid-cols-2 gap-1.5">
          <div className="flex justify-between items-center rounded-xl bg-muted/40 px-3 py-1.5">
            <span className="text-[10px] text-muted-foreground">Real Engines</span>
            <span className="text-sm font-bold text-foreground">{status.totalJobs}</span>
          </div>
          <div className="flex justify-between items-center rounded-xl bg-muted/40 px-3 py-1.5">
            <span className="text-[10px] text-muted-foreground">Event Types</span>
            <span className="text-sm font-bold text-foreground">8</span>
          </div>
          <div className="flex justify-between items-center rounded-xl bg-muted/40 px-3 py-1.5">
            <span className="text-[10px] text-muted-foreground">Utilities</span>
            <span className="text-sm font-bold text-foreground">3</span>
          </div>
          <div className="flex justify-between items-center rounded-xl bg-muted/40 px-3 py-1.5">
            <span className="text-[10px] text-muted-foreground">Bus Bridges</span>
            <span className="text-sm font-bold text-foreground">1</span>
          </div>
        </div>
      </div>
    </div>
  );
}
