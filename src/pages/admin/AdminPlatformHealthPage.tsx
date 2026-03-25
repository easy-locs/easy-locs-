/**
 * Platform Health Cockpit — Accessible from ME section.
 * Shows quality scores, blocked entities, broken flows, and auto-actions.
 */
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ShieldCheck, AlertTriangle, XCircle, CheckCircle, Activity, Wrench } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const db = supabase as any;

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
      db.from("seed_merchants").select("id, overall_quality_score, menu_quality_score, taxonomy_score, visibility_mode").limit(1000),
      db.from("seed_merchants").select("id, name, vertical, category, blocking_reason, overall_quality_score, menu_quality_score, taxonomy_score").eq("visibility_mode", "hidden").limit(100),
      db.from("seed_merchants").select("id").in("visibility_mode", ["live", "ready"]).limit(1000),
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
    { label: "Total Entities", value: stats.total, icon: Activity, color: "text-foreground" },
    { label: "OK (Live)", value: stats.ok, icon: CheckCircle, color: "text-green-500" },
    { label: "Blocked", value: stats.blocked, icon: XCircle, color: "text-destructive" },
    { label: "Downgraded", value: stats.unpublished, icon: AlertTriangle, color: "text-amber-500" },
    { label: "Avg Quality", value: `${stats.avgQuality}/100`, icon: ShieldCheck, color: "text-primary" },
    { label: "No Menu", value: stats.noMenu, icon: XCircle, color: "text-destructive" },
    { label: "Bad Taxonomy", value: stats.badTaxonomy, icon: AlertTriangle, color: "text-amber-500" },
    { label: "Low Score", value: stats.lowScore, icon: XCircle, color: "text-destructive" },
  ] : [];

  return (
    <div className="min-h-[100dvh] bg-background">
      <header className="flex items-center gap-3 px-4 pt-4 pb-3 border-b border-border/30">
        <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="text-base font-black text-foreground">Platform Health</h1>
          <p className="text-[10px] text-muted-foreground">Quality scores, blocked entities, engine status</p>
        </div>
        <Button size="sm" variant="outline" className="ml-auto text-xs" onClick={loadStats} disabled={loading}>
          <Wrench className="w-3 h-3 mr-1" /> Refresh
        </Button>
      </header>

      <div className="p-4 space-y-4 max-w-4xl mx-auto">
        {loading && <p className="text-center text-sm text-muted-foreground py-10">Loading...</p>}

        {stats && (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {statCards.map(s => (
                <Card key={s.label} className="p-3 flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <s.icon className={`w-4 h-4 ${s.color}`} />
                    <span className="text-[10px] font-medium text-muted-foreground">{s.label}</span>
                  </div>
                  <p className={`text-xl font-black ${s.color}`}>{s.value}</p>
                </Card>
              ))}
            </div>

            <div>
              <h2 className="text-sm font-bold text-foreground mb-2 flex items-center gap-2">
                <XCircle className="w-4 h-4 text-destructive" /> Blocked Entities ({blockedList.length})
              </h2>
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {blockedList.slice(0, 50).map((e: any) => (
                  <Card key={e.id} className="p-3 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-foreground truncate">{e.name ?? "?"}</p>
                      <p className="text-[10px] text-muted-foreground">{e.vertical ?? "?"} • {e.category ?? "?"}</p>
                      <p className="text-[10px] text-destructive/80 truncate">{e.blocking_reason ?? "No reason"}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-[10px] text-muted-foreground">Score</p>
                      <p className="text-sm font-black text-destructive">{e.overall_quality_score ?? 0}</p>
                    </div>
                  </Card>
                ))}
                {blockedList.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-4">No blocked entities 🎉</p>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
