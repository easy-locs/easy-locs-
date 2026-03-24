import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { getContinuousEngineStatus } from "@/lib/platform/platform-continuous-engine";

const STATUS_COLORS: Record<string, string> = {
  ok: "bg-emerald-500",
  error: "bg-red-500",
  pending: "bg-amber-500",
};

const CATEGORY_LABELS: Record<string, { label: string; emoji: string }> = {
  system: { label: "System", emoji: "⚙️" },
  digital: { label: "Digital", emoji: "🧠" },
  quality: { label: "Quality", emoji: "✅" },
  data: { label: "Data", emoji: "📊" },
  commerce: { label: "Commerce", emoji: "💰" },
};

export default function AdminEnginesDashboardPage() {
  const navigate = useNavigate();
  const [tick, setTick] = useState(0);

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

  const totalOk = status.jobs.filter(j => j.lastStatus === "ok").length;
  const totalError = status.jobs.filter(j => j.lastStatus === "error").length;
  const totalPending = status.jobs.filter(j => j.lastStatus === "pending").length;

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate("/admin")} className="w-9 h-9 rounded-xl flex items-center justify-center bg-muted text-muted-foreground font-bold">←</button>
        <div className="flex-1">
          <h1 className="text-lg font-bold">🚀 Engine Dashboard</h1>
          <p className="text-xs text-muted-foreground">
            {status.totalJobs} engines · {status.running ? "RUNNING" : "STOPPED"}
          </p>
        </div>
        <div className={`w-3 h-3 rounded-full ${status.running ? "bg-emerald-500 animate-pulse" : "bg-red-500"}`} />
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-2xl border border-border/20 bg-card p-4 text-center">
          <p className="text-2xl font-bold text-emerald-500">{totalOk}</p>
          <p className="text-[11px] text-muted-foreground">Healthy</p>
        </div>
        <div className="rounded-2xl border border-border/20 bg-card p-4 text-center">
          <p className="text-2xl font-bold text-amber-500">{totalPending}</p>
          <p className="text-[11px] text-muted-foreground">Pending</p>
        </div>
        <div className="rounded-2xl border border-border/20 bg-card p-4 text-center">
          <p className="text-2xl font-bold text-red-500">{totalError}</p>
          <p className="text-[11px] text-muted-foreground">Errors</p>
        </div>
      </div>

      {/* Category breakdown */}
      <div className="flex flex-wrap gap-2">
        {Object.entries(status.categories).map(([cat, count]) => {
          const info = CATEGORY_LABELS[cat] || { label: cat, emoji: "📦" };
          return (
            <span key={cat} className="rounded-full bg-primary/10 text-primary px-3 py-1 text-xs font-bold">
              {info.emoji} {info.label}: {count}
            </span>
          );
        })}
      </div>

      {/* Engines by category */}
      {Object.entries(grouped).map(([category, categoryJobs]) => {
        const info = CATEGORY_LABELS[category] || { label: category, emoji: "📦" };
        return (
          <div key={category} className="rounded-2xl border border-border/20 bg-card p-4">
            <h2 className="text-sm font-bold mb-3">{info.emoji} {info.label} Engines ({categoryJobs.length})</h2>
            <div className="space-y-2">
              {categoryJobs.map(job => (
                <div key={job.name} className="flex items-center gap-3 rounded-xl border border-border/10 p-3">
                  <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${STATUS_COLORS[job.lastStatus] || "bg-gray-400"}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold truncate">{job.name}</p>
                    <p className="text-[10px] text-muted-foreground">
                      Every {job.intervalLabel} · Runs: {job.runCount} · Items: {job.itemsProcessed}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[10px] font-mono text-muted-foreground">
                      {job.lastRun ? new Date(job.lastRun).toLocaleTimeString() : "—"}
                    </p>
                    {job.lastDetail && (
                      <p className="text-[9px] text-muted-foreground truncate max-w-[100px]">{job.lastDetail}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
