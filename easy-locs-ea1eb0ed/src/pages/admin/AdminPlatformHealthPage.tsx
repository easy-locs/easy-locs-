import SubPageShell from "@/components/layout/SubPageShell";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ShieldCheck, AlertTriangle, XCircle, CheckCircle, Activity, Wrench } from "lucide-react";
import { db } from "@/services/db";
import { AppCard } from "@/components/ui/AppCard";
import { Button } from "@/components/ui/button";
import { useUiEngine } from "@/hooks/useUiEngine";
import { tc } from "@/lib/i18n-canonical";

interface HealthStats {
  total: number;
  ok: number;
  blocked: number;
  unpublished: number;
  avgQuality: number;
  noMenu: number;
  badTaxonomy: number;
  lowScore: number;
}

export default function AdminPlatformHealthPage() {
  useUiEngine("admin-adminplatformhealthpage");
  const navigate = useNavigate();
  const [stats, setStats] = useState<HealthStats | null>(null);
  const [blockedList, setBlockedList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  async function loadStats() {
    setLoading(true);
    const [{ data: all }, { data: hidden }, { data: live }] = await Promise.all([
      db("seed_merchants").select("id, overall_quality_score, menu_quality_score, taxonomy_score, visibility_mode").limit(1000),
      db("seed_merchants").select("id, name, vertical, category, blocking_reason, overall_quality_score, menu_quality_score, taxonomy_score").eq("visibility_mode", "hidden").limit(100),
      db("seed_merchants").select("id").in("visibility_mode", ["live", "ready"]).limit(1000),
    ]);

    const entities = all ?? [];
    const scores = entities.map((e: any) => e.overall_quality_score ?? 0);
    const avgQ = scores.length > 0 ? Math.round(scores.reduce((a: number, b: number) => a + b, 0) / scores.length) : 0;

    setStats({
      total: entities.length,
      ok: (live ?? []).length,
      blocked: (hidden ?? []).length,
      unpublished: entities.filter((e: any) => e.visibility_mode === "search_only").length,
      avgQuality: avgQ,
      noMenu: entities.filter((e: any) => (e.menu_quality_score ?? 0) === 0).length,
      badTaxonomy: entities.filter((e: any) => (e.taxonomy_score ?? 0) < 50).length,
      lowScore: entities.filter((e: any) => (e.overall_quality_score ?? 0) < 30).length,
    });

    setBlockedList(hidden ?? []);
    setLoading(false);
  }

  const statCards = stats ? [
    { label: tc("admin.total_entities"), value: stats.total, icon: Activity, color: "text-foreground" },
    { label: tc("admin.ok_live"), value: stats.ok, icon: CheckCircle, color: "text-green-500" },
    { label: tc("admin.blocked"), value: stats.blocked, icon: XCircle, color: "text-destructive" },
    { label: tc("admin.downgraded"), value: stats.unpublished, icon: AlertTriangle, color: "text-amber-500" },
    { label: tc("admin.avg_quality"), value: `${stats.avgQuality}/100`, icon: ShieldCheck, color: "text-primary" },
    { label: tc("admin.no_menu"), value: stats.noMenu, icon: XCircle, color: "text-destructive" },
    { label: tc("admin.bad_taxonomy"), value: stats.badTaxonomy, icon: AlertTriangle, color: "text-amber-500" },
    { label: tc("admin.low_score"), value: stats.lowScore, icon: XCircle, color: "text-destructive" },
  ] : [];

  return (
    <SubPageShell noContentPad className="bg-background">
      <header className="flex items-center gap-3 px-4 pt-4 pb-3 border-b border-border/30">
        <button onClick={() => navigate(-1)} aria-label={tc("common.previous")} className="w-9 h-9 rounded-2xl bg-muted flex items-center justify-center hover:bg-muted/70 active:scale-[0.98] transition-all duration-200">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="text-base font-bold text-foreground">{tc("admin.platform_health")}</h1>
          <p className="text-[0.625rem] text-muted-foreground">{tc("admin.platform_health_desc")}</p>
        </div>
        <Button size="sm" variant="outline" className="ml-auto text-xs rounded-2xl active:scale-[0.98] transition-all duration-200" onClick={loadStats} disabled={loading}>
          <Wrench className="w-3 h-3 mr-1" /> {tc("admin.refresh")}
        </Button>
      </header>

      <div className="p-4 space-y-4 max-w-4xl mx-auto">
        {loading && <p className="text-center text-sm text-muted-foreground py-10">{tc("common.loading")}</p>}

        {stats && (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {statCards.map(s => (
                <AppCard key={s.label} className="p-3 flex flex-col gap-1 rounded-2xl">
                  <div className="flex items-center gap-2">
                    <s.icon className={`w-4 h-4 ${s.color}`} />
                    <span className="text-[0.625rem] font-medium text-muted-foreground">{s.label}</span>
                  </div>
                  <p className={`text-xl font-extrabold tabular-nums ${s.color}`}>{s.value}</p>
                </AppCard>
              ))}
            </div>

            <div>
              <h2 className="text-sm font-bold text-foreground mb-2 flex items-center gap-2">
                <XCircle className="w-4 h-4 text-destructive" /> {tc("admin.blocked_entities")} ({blockedList.length})
              </h2>
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {blockedList.slice(0, 50).map((e: any) => (
                  <AppCard key={e.id} className="p-3 flex items-center gap-3 rounded-2xl">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-foreground truncate">{e.name ?? "?"}</p>
                      <p className="text-[0.625rem] text-muted-foreground">{e.vertical ?? "?"} • {e.category ?? "?"}</p>
                      <p className="text-[0.625rem] text-destructive/80 truncate">{e.blocking_reason ?? tc("admin.no_reason")}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-[0.625rem] text-muted-foreground">{tc("admin.score")}</p>
                      <p className="text-sm font-extrabold text-destructive tabular-nums">{e.overall_quality_score ?? 0}</p>
                    </div>
                  </AppCard>
                ))}
                {blockedList.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-4">{tc("admin.no_blocked")} 🎉</p>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </SubPageShell>
  );
}
