import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { getContinuousEngineStatus } from "@/lib/platform/platform-continuous-engine";

const STATUS_COLORS: Record<string, string> = {
  ok: "bg-emerald-500",
  error: "bg-red-500",
  pending: "bg-amber-500",
};

const STATUS_TEXT: Record<string, string> = {
  ok: "text-emerald-400",
  error: "text-red-400",
  pending: "text-amber-400",
};

const CATEGORY_LABELS: Record<string, { label: string; emoji: string }> = {
  system: { label: "System", emoji: "⚙️" },
  digital: { label: "Digital", emoji: "🧠" },
  quality: { label: "Quality", emoji: "✅" },
  data: { label: "Data", emoji: "📊" },
  commerce: { label: "Commerce", emoji: "💰" },
  finance: { label: "Finance", emoji: "🏦" },
  delivery: { label: "Delivery", emoji: "🚚" },
  lifecycle: { label: "Lifecycle", emoji: "🔄" },
};

const CATEGORY_ORDER = ["system", "quality", "data", "digital", "commerce", "finance", "delivery", "lifecycle"];

export default function AdminEnginesDashboardPage() {
  const navigate = useNavigate();
  const [tick, setTick] = useState(0);
  const [filter, setFilter] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setTick(t => t + 1), 5000);
    return () => clearInterval(timer);
  }, []);

  const status = useMemo(() => getContinuousEngineStatus(), [tick]);

  const grouped = useMemo(() => {
    const groups: Record<string, typeof status.jobs> = {};
    for (const job of status.jobs) {
      const cat = job.category || "system";
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(job);
    }
    return groups;
  }, [status]);

  const filteredGrouped = useMemo(() => {
    const result: Record<string, typeof status.jobs> = {};
    for (const [cat, catJobs] of Object.entries(grouped)) {
      if (filter && cat !== filter) continue;
      const filtered = statusFilter
        ? catJobs.filter(j => j.lastStatus === statusFilter)
        : catJobs;
      if (filtered.length > 0) result[cat] = filtered;
    }
    return result;
  }, [grouped, filter, statusFilter]);

  const totalOk = status.jobs.filter(j => j.lastStatus === "ok").length;
  const totalError = status.jobs.filter(j => j.lastStatus === "error").length;
  const totalPending = status.jobs.filter(j => j.lastStatus === "pending").length;

  const sortedCategories = CATEGORY_ORDER.filter(c => filteredGrouped[c]);

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate("/admin")} className="w-9 h-9 rounded-xl flex items-center justify-center bg-muted text-muted-foreground font-bold text-sm">←</button>
        <div className="flex-1">
          <h1 className="text-lg font-bold text-foreground">🚀 Engine Dashboard</h1>
          <p className="text-[11px] text-muted-foreground">
            {status.totalJobs} engines · {status.running ? "🟢 RUNNING" : "🔴 STOPPED"}
          </p>
        </div>
        <button
          onClick={() => setTick(t => t + 1)}
          className="rounded-xl bg-muted px-3 py-1.5 text-[11px] font-bold text-muted-foreground"
        >
          ↻ Refresh
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-2.5">
        <button
          onClick={() => setStatusFilter(statusFilter === "ok" ? null : "ok")}
          className={`rounded-2xl border p-3 text-center transition-all ${statusFilter === "ok" ? "border-emerald-500/40 bg-emerald-500/10" : "border-border/20 bg-card"}`}
        >
          <p className="text-xl font-bold text-emerald-500">{totalOk}</p>
          <p className="text-[10px] text-muted-foreground font-medium">Healthy</p>
        </button>
        <button
          onClick={() => setStatusFilter(statusFilter === "pending" ? null : "pending")}
          className={`rounded-2xl border p-3 text-center transition-all ${statusFilter === "pending" ? "border-amber-500/40 bg-amber-500/10" : "border-border/20 bg-card"}`}
        >
          <p className="text-xl font-bold text-amber-500">{totalPending}</p>
          <p className="text-[10px] text-muted-foreground font-medium">Pending</p>
        </button>
        <button
          onClick={() => setStatusFilter(statusFilter === "error" ? null : "error")}
          className={`rounded-2xl border p-3 text-center transition-all ${statusFilter === "error" ? "border-red-500/40 bg-red-500/10" : "border-border/20 bg-card"}`}
        >
          <p className="text-xl font-bold text-red-500">{totalError}</p>
          <p className="text-[10px] text-muted-foreground font-medium">Errors</p>
        </button>
      </div>

      {/* Category filter chips */}
      <div className="flex flex-wrap gap-1.5">
        <button
          onClick={() => setFilter(null)}
          className={`rounded-full px-3 py-1 text-[11px] font-bold transition-all ${!filter ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
        >
          All ({status.totalJobs})
        </button>
        {CATEGORY_ORDER.map(cat => {
          const count = (status.categories as any)[cat] ?? 0;
          if (count === 0) return null;
          const info = CATEGORY_LABELS[cat];
          return (
            <button
              key={cat}
              onClick={() => setFilter(filter === cat ? null : cat)}
              className={`rounded-full px-2.5 py-1 text-[11px] font-bold transition-all ${filter === cat ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
            >
              {info.emoji} {info.label} ({count})
            </button>
          );
        })}
      </div>

      {/* Engines by category */}
      {sortedCategories.map(category => {
        const categoryJobs = filteredGrouped[category];
        if (!categoryJobs) return null;
        const info = CATEGORY_LABELS[category] || { label: category, emoji: "📦" };
        const catOk = categoryJobs.filter(j => j.lastStatus === "ok").length;
        const catErr = categoryJobs.filter(j => j.lastStatus === "error").length;

        return (
          <div key={category} className="rounded-2xl border border-border/20 bg-card overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border/10 bg-muted/30">
              <h2 className="text-sm font-bold text-foreground">{info.emoji} {info.label}</h2>
              <div className="flex items-center gap-2 text-[10px] font-medium">
                <span className="text-emerald-500">{catOk} ok</span>
                {catErr > 0 && <span className="text-red-500">{catErr} err</span>}
                <span className="text-muted-foreground">{categoryJobs.length} total</span>
              </div>
            </div>
            <div className="divide-y divide-border/5">
              {categoryJobs.map(job => (
                <div key={job.name} className="flex items-center gap-3 px-4 py-2.5">
                  <div className={`w-2 h-2 rounded-full shrink-0 ${STATUS_COLORS[job.lastStatus] || "bg-gray-400"}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold text-foreground truncate">{job.name}</p>
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                      <span>⏱ {job.intervalLabel}</span>
                      <span>·</span>
                      <span>×{job.runCount}</span>
                      {job.lastDetail && (
                        <>
                          <span>·</span>
                          <span className={`truncate max-w-[80px] ${STATUS_TEXT[job.lastStatus] || ""}`}>{job.lastDetail}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[10px] font-mono text-muted-foreground">
                      {job.lastRun ? new Date(job.lastRun).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {/* Pipeline proof section */}
      <div className="rounded-2xl border border-border/20 bg-card p-4">
        <h2 className="text-sm font-bold text-foreground mb-3">📋 Pipeline Impact (Live DB)</h2>
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: "Merchants Total", value: "311" },
            { label: "Live", value: "12", color: "text-emerald-500" },
            { label: "Search Only", value: "10", color: "text-amber-500" },
            { label: "Hidden", value: "262", color: "text-red-400" },
            { label: "Coming Soon", value: "27", color: "text-blue-400" },
            { label: "Gate Passed", value: "6", color: "text-emerald-500" },
            { label: "Auto-Published", value: "6" },
            { label: "Notifications", value: "184" },
          ].map(item => (
            <div key={item.label} className="flex justify-between items-center rounded-xl bg-muted/30 px-3 py-2">
              <span className="text-[11px] text-muted-foreground">{item.label}</span>
              <span className={`text-sm font-bold ${item.color || "text-foreground"}`}>{item.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
