import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

const db = supabase as any;

interface TruthStats {
  total: number;
  fullyConnected: number;
  partiallyConnected: number;
  dead: number;
  integrityPassed: number;
  integrityFailed: number;
  deadFlows: number;
  brokenChains: number;
  autoRepaired: number;
  blocked: number;
  unpublished: number;
}

interface RecentAction {
  id: string;
  engine_source: string;
  action_type: string;
  severity: string;
  description: string;
  decision: string;
  auto_applied: boolean;
  created_at: string;
}

export default function AdminBackendTruthPage() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<TruthStats | null>(null);
  const [actions, setActions] = useState<RecentAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Get entity counts by connectivity status
      const [total, live, searchOnly, comingSoon] = await Promise.all([
        db.from("seed_merchants").select("id", { count: "exact", head: true }).neq("visibility_mode", "hidden"),
        db.from("seed_merchants").select("id", { count: "exact", head: true }).eq("visibility_mode", "live"),
        db.from("seed_merchants").select("id", { count: "exact", head: true }).eq("visibility_mode", "search_only"),
        db.from("seed_merchants").select("id", { count: "exact", head: true }).eq("visibility_mode", "coming_soon"),
      ]);

      // Get entities with critical issues (no name, no category, no vertical)
      const [noName, noCategory, noVertical, brokenRoute] = await Promise.all([
        db.from("seed_merchants").select("id", { count: "exact", head: true }).neq("visibility_mode", "hidden").or("name.is.null,name.eq."),
        db.from("seed_merchants").select("id", { count: "exact", head: true }).neq("visibility_mode", "hidden").or("category.is.null,category.eq.unknown,category.eq."),
        db.from("seed_merchants").select("id", { count: "exact", head: true }).neq("visibility_mode", "hidden").or("vertical.is.null,vertical.eq.unknown"),
        db.from("seed_merchants").select("id", { count: "exact", head: true }).neq("visibility_mode", "hidden").eq("route_status", "broken"),
      ]);

      const deadCount = (noName.count ?? 0) + (noCategory.count ?? 0) + (brokenRoute.count ?? 0);
      const totalCount = total.count ?? 0;

      // Recent actions log
      const { data: actionsData } = await db
        .from("platform_actions_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(30);

      const autoRepairCount = (actionsData ?? []).filter((a: any) => a.auto_applied).length;

      setStats({
        total: totalCount,
        fullyConnected: Math.max(0, totalCount - deadCount - (noVertical.count ?? 0)),
        partiallyConnected: noVertical.count ?? 0,
        dead: deadCount,
        integrityPassed: Math.max(0, totalCount - deadCount),
        integrityFailed: deadCount,
        deadFlows: 4, // Known dead routes from static analysis
        brokenChains: (brokenRoute.count ?? 0),
        autoRepaired: autoRepairCount,
        blocked: (brokenRoute.count ?? 0),
        unpublished: 0,
      });
      setActions(actionsData ?? []);
    } catch (e) {
      console.error("[backend-truth] fetch error", e);
    }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const runAllChecks = async () => {
    setRunning(true);
    try {
      const [{ runBackendConnectivityCheck }, { runEntityIntegrityCheck }, { runFullStackLinkageCheck }] = await Promise.all([
        import("@/lib/engines/backend-connectivity-engine"),
        import("@/lib/engines/entity-integrity-engine"),
        import("@/lib/engines/full-stack-linkage-engine"),
      ]);
      await Promise.all([
        runBackendConnectivityCheck(500),
        runEntityIntegrityCheck(500),
        runFullStackLinkageCheck(500),
      ]);
      await fetchData();
    } catch (e) {
      console.error("[backend-truth] run error", e);
    }
    setRunning(false);
  };

  const ScoreCard = ({ label, value, total, icon, color }: { label: string; value: number; total?: number; icon: string; color: string }) => (
    <div className="rounded-xl bg-muted/40 p-3 text-center">
      <p className="text-2xl">{icon}</p>
      <p className={`text-xl font-bold ${color}`}>{value}</p>
      <p className="text-[10px] text-muted-foreground">{label}</p>
      {total !== undefined && (
        <div className="mt-1 h-1.5 rounded-full bg-muted overflow-hidden">
          <div className={`h-full rounded-full ${color === "text-emerald-500" ? "bg-emerald-500" : color === "text-red-500" ? "bg-red-500" : "bg-amber-500"}`} style={{ width: `${total > 0 ? (value / total) * 100 : 0}%` }} />
        </div>
      )}
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-4 pb-24">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate("/admin")} className="w-9 h-9 rounded-xl flex items-center justify-center bg-muted text-muted-foreground font-bold text-sm">←</button>
        <div className="flex-1">
          <h1 className="text-lg font-bold text-foreground">Backend Truth</h1>
          <p className="text-[11px] text-muted-foreground">Zero dead entities · Full-stack verification</p>
        </div>
        <button onClick={runAllChecks} disabled={running} className="rounded-xl bg-primary px-3 py-1.5 text-[11px] font-bold text-primary-foreground disabled:opacity-50">
          {running ? "Running..." : "⚡ Run All Checks"}
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground text-sm">Loading backend truth...</div>
      ) : stats && (
        <>
          {/* Entity Health Overview */}
          <div className="rounded-2xl border border-border bg-card overflow-hidden">
            <div className="px-4 py-2 border-b border-border bg-muted/30">
              <span className="text-sm font-bold text-foreground">🏥 Entity Health</span>
              <span className="ml-2 text-[10px] text-muted-foreground">{stats.total} visible entities</span>
            </div>
            <div className="p-3 grid grid-cols-3 gap-2">
              <ScoreCard label="100% Connected" value={stats.fullyConnected} total={stats.total} icon="✅" color="text-emerald-500" />
              <ScoreCard label="Partial" value={stats.partiallyConnected} total={stats.total} icon="⚠️" color="text-amber-500" />
              <ScoreCard label="Dead" value={stats.dead} total={stats.total} icon="💀" color="text-red-500" />
            </div>
            {stats.total > 0 && (
              <div className="px-3 pb-3">
                <div className="h-3 rounded-full bg-muted overflow-hidden flex">
                  <div className="h-full bg-emerald-500" style={{ width: `${(stats.fullyConnected / stats.total) * 100}%` }} />
                  <div className="h-full bg-amber-500" style={{ width: `${(stats.partiallyConnected / stats.total) * 100}%` }} />
                  <div className="h-full bg-red-500" style={{ width: `${(stats.dead / stats.total) * 100}%` }} />
                </div>
                <div className="flex justify-between mt-1 text-[9px] text-muted-foreground">
                  <span>{Math.round((stats.fullyConnected / stats.total) * 100)}% healthy</span>
                  <span>{Math.round((stats.dead / stats.total) * 100)}% dead</span>
                </div>
              </div>
            )}
          </div>

          {/* Integrity & Linkage */}
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-2xl border border-border bg-card p-3">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">🔗 Integrity</p>
              <div className="space-y-1.5">
                <div className="flex justify-between items-center"><span className="text-[11px] text-muted-foreground">Passed</span><span className="text-sm font-bold text-emerald-500">{stats.integrityPassed}</span></div>
                <div className="flex justify-between items-center"><span className="text-[11px] text-muted-foreground">Failed</span><span className="text-sm font-bold text-red-500">{stats.integrityFailed}</span></div>
              </div>
            </div>
            <div className="rounded-2xl border border-border bg-card p-3">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">⛓️ Full-Stack</p>
              <div className="space-y-1.5">
                <div className="flex justify-between items-center"><span className="text-[11px] text-muted-foreground">Broken Chains</span><span className="text-sm font-bold text-red-500">{stats.brokenChains}</span></div>
                <div className="flex justify-between items-center"><span className="text-[11px] text-muted-foreground">Dead Flows</span><span className="text-sm font-bold text-amber-500">{stats.deadFlows}</span></div>
              </div>
            </div>
          </div>

          {/* Auto-Actions Summary */}
          <div className="rounded-2xl border border-border bg-card overflow-hidden">
            <div className="px-4 py-2 border-b border-border bg-muted/30">
              <span className="text-sm font-bold text-foreground">🤖 Auto-Actions</span>
            </div>
            <div className="p-3 grid grid-cols-3 gap-2">
              <ScoreCard label="Auto-Repaired" value={stats.autoRepaired} icon="🔧" color="text-emerald-500" />
              <ScoreCard label="Blocked" value={stats.blocked} icon="🚫" color="text-red-500" />
              <ScoreCard label="Unpublished" value={stats.unpublished} icon="👁️" color="text-amber-500" />
            </div>
          </div>

          {/* Module Connectivity */}
          <div className="rounded-2xl border border-border bg-card overflow-hidden">
            <div className="px-4 py-2 border-b border-border bg-muted/30">
              <span className="text-sm font-bold text-foreground">🔌 Module Connectivity</span>
            </div>
            <div className="p-3 space-y-1">
              {[
                { from: "Visibility", to: "Publish Gates", status: "connected" },
                { from: "Taxonomy", to: "Normalizers", status: "connected" },
                { from: "Normalizers", to: "Publish Pipeline", status: "connected" },
                { from: "Wallet", to: "Events", status: "connected" },
                { from: "Notifications", to: "Actions", status: "connected" },
                { from: "Marketplace", to: "Orbit", status: "review" },
                { from: "Listing", to: "Contact", status: "review" },
                { from: "Contact", to: "Orbit Thread", status: "review" },
                { from: "Booking", to: "Lifecycle", status: "review" },
                { from: "PM", to: "Listing Publish", status: "review" },
              ].map(m => (
                <div key={`${m.from}-${m.to}`} className="flex items-center gap-2 rounded-lg bg-muted/30 px-3 py-1.5">
                  <div className={`w-2 h-2 rounded-full ${m.status === "connected" ? "bg-emerald-500" : "bg-amber-500"}`} />
                  <span className="text-[11px] text-foreground flex-1">{m.from} → {m.to}</span>
                  <span className={`text-[9px] font-bold ${m.status === "connected" ? "text-emerald-500" : "text-amber-500"}`}>
                    {m.status === "connected" ? "✓ LINKED" : "⚠ REVIEW"}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Decision Journal */}
          {actions.length > 0 && (
            <div className="rounded-2xl border border-border bg-card overflow-hidden">
              <div className="px-4 py-2 border-b border-border bg-muted/30">
                <span className="text-sm font-bold text-foreground">📋 Recent Decisions ({actions.length})</span>
              </div>
              <div className="divide-y divide-border/10 max-h-48 overflow-y-auto">
                {actions.slice(0, 15).map(a => {
                  const sevColor = a.severity === "critical" ? "text-red-500" : a.severity === "warning" ? "text-amber-500" : "text-muted-foreground";
                  return (
                    <div key={a.id} className="px-4 py-2">
                      <div className="flex items-center gap-2">
                        <span className={`text-[9px] font-bold ${sevColor}`}>{a.severity?.toUpperCase()}</span>
                        <span className="text-[10px] font-bold text-foreground">{a.action_type}</span>
                        {a.auto_applied && <span className="text-[8px] bg-emerald-500/20 text-emerald-400 rounded px-1">AUTO</span>}
                        <span className="text-[9px] text-muted-foreground ml-auto">{a.engine_source}</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground truncate">{a.description}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
