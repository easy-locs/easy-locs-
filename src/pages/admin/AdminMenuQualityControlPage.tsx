/**
 * Menu Quality Control — Cockpit for menu rebuild pipeline visibility.
 */
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const db = supabase as any;

export default function AdminMenuQualityControlPage() {
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ["menu-quality-control"],
    staleTime: 15_000,
    queryFn: async () => {
      const [allRes, cleanRes, rebuiltRes, blockedRes, garbageRes] = await Promise.all([
        db.from("seed_merchants").select("id", { count: "exact", head: true }).eq("vertical", "food"),
        db.from("seed_merchants").select("id", { count: "exact", head: true }).eq("vertical", "food").eq("menu_quality_flag", "clean"),
        db.from("seed_merchants").select("id", { count: "exact", head: true }).eq("vertical", "food").eq("menu_quality_flag", "rebuilt"),
        db.from("seed_merchants").select("id", { count: "exact", head: true }).eq("vertical", "food").eq("visibility_mode", "hidden"),
        db.from("seed_merchants").select("id", { count: "exact", head: true }).eq("vertical", "food").eq("menu_quality_flag", "garbage"),
      ]);

      // Get worst menus
      const { data: worst } = await db
        .from("seed_merchants")
        .select("id, name, menu_quality_flag, menu_rebuild_score, menu_quality_score, taxonomy_score, blocking_reason, visibility_mode")
        .eq("vertical", "food")
        .order("menu_rebuild_score", { ascending: true, nullsFirst: true })
        .limit(20);

      // Avg scores
      const { data: scores } = await db
        .from("seed_merchants")
        .select("menu_quality_score, menu_rebuild_score, taxonomy_score")
        .eq("vertical", "food")
        .not("menu_quality_score", "is", null)
        .limit(500);

      const avg = (arr: number[]) => arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : 0;
      const mqScores = (scores || []).map((s: any) => s.menu_quality_score).filter(Boolean);
      const mrScores = (scores || []).map((s: any) => s.menu_rebuild_score).filter(Boolean);
      const txScores = (scores || []).map((s: any) => s.taxonomy_score).filter(Boolean);

      return {
        total: allRes.count ?? 0,
        clean: cleanRes.count ?? 0,
        rebuilt: rebuiltRes.count ?? 0,
        blocked: blockedRes.count ?? 0,
        garbage: garbageRes.count ?? 0,
        avgMenuQuality: avg(mqScores),
        avgRebuild: avg(mrScores),
        avgTaxonomy: avg(txScores),
        worst: worst || [],
      };
    },
  });

  return (
    <div className="min-h-[100dvh] bg-background pb-24">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-6 pb-4">
        <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center">←</button>
        <div>
          <h1 className="text-lg font-bold text-foreground">Menu Quality Control</h1>
          <p className="text-xs text-muted-foreground">Food pipeline rebuild & scoring</p>
        </div>
      </div>

      {isLoading ? (
        <div className="px-4 space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-16 rounded-2xl" />)}</div>
      ) : data ? (
        <div className="px-4 space-y-4">
          {/* Stats grid */}
          <div className="grid grid-cols-3 gap-2">
            <Metric label="Total Food" value={data.total} />
            <Metric label="Clean" value={data.clean} color="text-emerald-400" />
            <Metric label="Rebuilt" value={data.rebuilt} color="text-blue-400" />
            <Metric label="Blocked" value={data.blocked} color="text-red-400" />
            <Metric label="Garbage" value={data.garbage} color="text-red-500" />
            <Metric label="Review" value={data.total - data.clean - data.rebuilt - data.blocked - data.garbage} color="text-amber-400" />
          </div>

          {/* Avg scores */}
          <div className="rounded-2xl border border-border/20 bg-card p-4 space-y-3">
            <p className="text-xs font-bold text-foreground">Average Scores</p>
            <ScoreBar label="Menu Quality" value={data.avgMenuQuality} />
            <ScoreBar label="Rebuild Score" value={data.avgRebuild} />
            <ScoreBar label="Taxonomy" value={data.avgTaxonomy} />
          </div>

          {/* Worst menus */}
          <div className="space-y-2">
            <p className="text-xs font-bold text-foreground">Worst Menus</p>
            {data.worst.map((m: any) => (
              <div key={m.id} className="rounded-2xl border border-border/20 bg-card p-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-foreground truncate flex-1">{m.name || "Unnamed"}</p>
                  <span className={cn(
                    "text-[9px] font-bold px-2 py-0.5 rounded-full",
                    m.menu_quality_flag === "clean" ? "bg-emerald-500/15 text-emerald-400" :
                    m.menu_quality_flag === "rebuilt" ? "bg-blue-500/15 text-blue-400" :
                    m.menu_quality_flag === "garbage" ? "bg-red-500/15 text-red-400" :
                    "bg-amber-500/15 text-amber-400"
                  )}>
                    {m.menu_quality_flag || "unknown"}
                  </span>
                </div>
                <div className="flex gap-3 mt-2 text-[10px] text-muted-foreground">
                  <span>Quality: {m.menu_quality_score ?? "–"}</span>
                  <span>Rebuild: {m.menu_rebuild_score ?? "–"}</span>
                  <span>Tax: {m.taxonomy_score ?? "–"}</span>
                  <span className={m.visibility_mode === "hidden" ? "text-red-400" : "text-emerald-400"}>
                    {m.visibility_mode || "–"}
                  </span>
                </div>
                {m.blocking_reason && (
                  <p className="text-[9px] text-red-400/80 mt-1 truncate">{m.blocking_reason}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Metric({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div className="rounded-2xl bg-muted/40 px-3 py-3 text-center">
      <p className="text-[9px] uppercase tracking-wide font-bold text-muted-foreground">{label}</p>
      <p className={cn("text-lg font-bold mt-1", color || "text-foreground")}>{value}</p>
    </div>
  );
}

function ScoreBar({ label, value }: { label: string; value: number }) {
  const color = value >= 70 ? "bg-emerald-500" : value >= 40 ? "bg-amber-500" : "bg-red-500";
  return (
    <div>
      <div className="flex justify-between text-[10px] mb-1">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-bold text-foreground">{value}/100</span>
      </div>
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <div className={cn("h-full rounded-full transition-all", color)} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}
