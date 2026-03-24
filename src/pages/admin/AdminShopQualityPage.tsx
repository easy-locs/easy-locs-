import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PageShell } from "@/components/ui/page-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { recoverHiddenEntities, type RecoveryDiagnosis } from "@/lib/engines/entity-recovery-engine";
import { rerankAll } from "@/lib/ranking/ranking-batch-runner";
import { Shield, RefreshCw, AlertTriangle, CheckCircle, Eye, EyeOff, TrendingUp, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

const db = supabase as any;

export default function AdminShopQualityPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [recoveryResult, setRecoveryResult] = useState<{
    total: number; recovered: number; stillBlocked: number; diagnoses: RecoveryDiagnosis[];
  } | null>(null);

  // Ranking distribution
  const { data: distribution = [], isLoading } = useQuery({
    queryKey: ["ranking-distribution"],
    queryFn: async () => {
      const { data } = await db
        .from("current_ranking_state")
        .select("visibility_class, global_rank_score, entity_type");
      if (!data) return [];
      const groups: Record<string, { count: number; avgScore: number; scores: number[] }> = {};
      for (const r of data) {
        const vc = r.visibility_class || "unknown";
        if (!groups[vc]) groups[vc] = { count: 0, avgScore: 0, scores: [] };
        groups[vc].count++;
        groups[vc].scores.push(r.global_rank_score ?? 0);
      }
      return Object.entries(groups).map(([cls, g]) => ({
        class: cls,
        count: g.count,
        avgScore: Math.round(g.scores.reduce((a, b) => a + b, 0) / g.scores.length),
      })).sort((a, b) => b.count - a.count);
    },
  });

  // Run recovery
  const recoveryMutation = useMutation({
    mutationFn: async () => {
      const result = await recoverHiddenEntities(500);
      setRecoveryResult(result);
      return result;
    },
    onSuccess: (r) => {
      toast.success(`Recovery: ${r.recovered} entities promoted from hidden`);
      queryClient.invalidateQueries({ queryKey: ["ranking-distribution"] });
    },
  });

  // Run full rerank
  const rerankMutation = useMutation({
    mutationFn: rerankAll,
    onSuccess: (r) => {
      toast.success(`Reranked: ${r.candidates} candidates + ${r.seeds} seeds`);
      queryClient.invalidateQueries({ queryKey: ["ranking-distribution"] });
    },
  });

  const classConfig: Record<string, { color: string; icon: typeof Eye }> = {
    hidden: { color: "destructive", icon: EyeOff },
    indexed_not_public: { color: "secondary", icon: Eye },
    public_seed: { color: "default", icon: CheckCircle },
    ready_for_claim: { color: "default", icon: TrendingUp },
    priority_public: { color: "default", icon: TrendingUp },
    boost_ready: { color: "default", icon: TrendingUp },
  };

  return (
    <PageShell
      title="Shop Quality & Recovery"
      description="Central quality scoring, coherence enforcement, and entity recovery"
      actions={
        <Button variant="ghost" size="sm" onClick={() => navigate("/admin")}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Back
        </Button>
      }
    >
      {/* Distribution cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-6">
        {distribution.map((d) => {
          const cfg = classConfig[d.class] || { color: "secondary", icon: Eye };
          const Icon = cfg.icon;
          return (
            <Card key={d.class}>
              <CardContent className="pt-4 pb-3 px-4">
                <div className="flex items-center gap-2 mb-2">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs font-medium truncate">{d.class.replace(/_/g, " ")}</span>
                </div>
                <p className="text-2xl font-bold">{d.count}</p>
                <p className="text-xs text-muted-foreground">avg score: {d.avgScore}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Actions */}
      <div className="flex gap-3 mt-6 flex-wrap">
        <Button
          onClick={() => recoveryMutation.mutate()}
          disabled={recoveryMutation.isPending}
        >
          <Shield className="h-4 w-4 mr-2" />
          {recoveryMutation.isPending ? "Recovering..." : "Run Recovery Engine"}
        </Button>
        <Button
          variant="outline"
          onClick={() => rerankMutation.mutate()}
          disabled={rerankMutation.isPending}
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          {rerankMutation.isPending ? "Reranking..." : "Full Rerank"}
        </Button>
      </div>

      {/* Recovery results */}
      {recoveryResult && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              Recovery Report
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="text-center">
                <p className="text-2xl font-bold">{recoveryResult.total}</p>
                <p className="text-xs text-muted-foreground">Total Hidden</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">{recoveryResult.recovered}</p>
                <p className="text-xs text-muted-foreground">Recovered</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-amber-600">{recoveryResult.stillBlocked}</p>
                <p className="text-xs text-muted-foreground">Still Blocked</p>
              </div>
            </div>

            {/* Diagnosis details */}
            <div className="max-h-96 overflow-y-auto space-y-2">
              {recoveryResult.diagnoses.slice(0, 50).map((d) => (
                <div
                  key={d.entityId}
                  className="flex items-center justify-between p-2 rounded-md bg-muted/40 text-sm"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium truncate">{d.entityName}</p>
                    <p className="text-xs text-muted-foreground">
                      Quality: {d.qualityResult.globalQualityScore} · {d.qualityResult.qualityClass}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {d.recovered ? (
                      <Badge variant="default" className="text-xs bg-green-600">
                        → {d.newVisibilityClass?.replace(/_/g, " ")}
                      </Badge>
                    ) : (
                      <Badge variant="destructive" className="text-xs">
                        blocked
                      </Badge>
                    )}
                    {d.blockingReasons.length > 0 && (
                      <span className="text-xs text-destructive" title={d.blockingReasons.join(", ")}>
                        <AlertTriangle className="h-3 w-3" />
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </PageShell>
  );
}
