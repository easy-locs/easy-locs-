import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { rerankAll } from "@/lib/ranking/ranking-batch-runner";
import { useQuery } from "@tanstack/react-query";
import { BarChart3, RefreshCw, Shield, TrendingUp, AlertTriangle } from "lucide-react";

const VISIBILITY_COLORS: Record<string, string> = {
  hidden: "bg-destructive/20 text-destructive",
  indexed_not_public: "bg-yellow-500/20 text-yellow-700",
  public_seed: "bg-blue-500/20 text-blue-700",
  ready_for_claim: "bg-green-500/20 text-green-700",
  priority_public: "bg-emerald-500/20 text-emerald-700",
  boost_ready: "bg-purple-500/20 text-purple-700",
};

export default function AdminRankingControlPage() {
  const [reranking, setReranking] = useState(false);
  const [lastResult, setLastResult] = useState<{ candidates: number; seeds: number } | null>(null);

  const { data: stats, refetch } = useQuery({
    queryKey: ["ranking-stats"],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("current_ranking_state")
        .select("entity_type, visibility_class, global_rank_score, claim_ready, boost_ready");
      if (!data) return { total: 0, byClass: {}, avgScore: 0, claimReady: 0, boostReady: 0 };
      const byClass: Record<string, number> = {};
      let totalScore = 0;
      let claimReady = 0;
      let boostReady = 0;
      for (const r of data) {
        byClass[r.visibility_class] = (byClass[r.visibility_class] || 0) + 1;
        totalScore += Number(r.global_rank_score);
        if (r.claim_ready) claimReady++;
        if (r.boost_ready) boostReady++;
      }
      return {
        total: data.length,
        byClass,
        avgScore: data.length ? Math.round(totalScore / data.length) : 0,
        claimReady,
        boostReady,
      };
    },
  });

  const { data: entities } = useQuery({
    queryKey: ["ranking-entities"],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("current_ranking_state")
        .select("*")
        .order("global_rank_score", { ascending: false })
        .limit(50);
      return data ?? [];
    },
  });

  const handleRerank = async () => {
    setReranking(true);
    try {
      const result = await rerankAll();
      setLastResult(result);
      refetch();
    } catch (e) {
      console.error("Rerank failed:", e);
    }
    setReranking(false);
  };

  return (
    <div className="container mx-auto p-4 space-y-6 max-w-6xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <BarChart3 className="w-6 h-6" /> Central Ranking Control
        </h1>
        <Button onClick={handleRerank} disabled={reranking}>
          <RefreshCw className={`w-4 h-4 mr-2 ${reranking ? "animate-spin" : ""}`} />
          {reranking ? "Reranking..." : "Rerank All Now"}
        </Button>
      </div>

      {lastResult && (
        <Card className="border-green-500/30 bg-green-50/50">
          <CardContent className="pt-4">
            Reranked {lastResult.candidates} candidates + {lastResult.seeds} seeds
          </CardContent>
        </Card>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-2xl font-bold">{stats?.total ?? 0}</p>
            <p className="text-xs text-muted-foreground">Total Ranked</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-2xl font-bold">{stats?.avgScore ?? 0}</p>
            <p className="text-xs text-muted-foreground">Avg Score</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-2xl font-bold text-green-600">{stats?.claimReady ?? 0}</p>
            <p className="text-xs text-muted-foreground">Claim Ready</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-2xl font-bold text-purple-600">{stats?.boostReady ?? 0}</p>
            <p className="text-xs text-muted-foreground">Boost Ready</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-2xl font-bold text-red-600">{stats?.byClass?.hidden ?? 0}</p>
            <p className="text-xs text-muted-foreground">Hidden</p>
          </CardContent>
        </Card>
      </div>

      {/* Visibility Distribution */}
      <Card>
        <CardHeader><CardTitle className="text-sm">Visibility Distribution</CardTitle></CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {Object.entries(stats?.byClass ?? {}).map(([cls, count]) => (
              <Badge key={cls} className={VISIBILITY_COLORS[cls] || "bg-muted"}>
                {cls}: {count as number}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Entity Table */}
      <Card>
        <CardHeader><CardTitle className="text-sm">Top 50 Entities by Rank</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-[500px] overflow-y-auto">
            {(entities ?? []).map((e: any) => {
              const reasons = e.ranking_reason_json ?? {};
              const penalties = reasons.penalties ?? [];
              return (
                <div key={e.entity_id} className="flex items-center justify-between p-2 rounded border text-xs">
                  <div className="flex-1 min-w-0">
                    <p className="font-mono truncate">{e.entity_id?.slice(0, 12)}...</p>
                    <p className="text-muted-foreground">{e.entity_type}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm">{Number(e.global_rank_score)}</span>
                    <Badge className={VISIBILITY_COLORS[e.visibility_class] || "bg-muted"} variant="secondary">
                      {e.visibility_class}
                    </Badge>
                    {e.claim_ready && <Shield className="w-3 h-3 text-green-600" />}
                    {e.boost_ready && <TrendingUp className="w-3 h-3 text-purple-600" />}
                    {penalties.length > 0 && (
                      <span className="text-orange-500 flex items-center gap-0.5">
                        <AlertTriangle className="w-3 h-3" /> {penalties.length}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
