import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useOnboardingQualityDashboard() {
  return useQuery({
    queryKey: ["onboarding-quality-dashboard"],
    queryFn: async () => {
      const db = supabase as any;
      const [queue, canonical, recrawls] = await Promise.all([
        db.from("onboarding_review_queue").select("*"),
        db.from("onboarding_canonical_records").select("*"),
        db.from("onboarding_recrawl_jobs").select("*"),
      ]);
      if (queue.error) throw queue.error;
      if (canonical.error) throw canonical.error;
      if (recrawls.error) throw recrawls.error;
      const queueRows = queue.data ?? [];
      const canonicalRows = canonical.data ?? [];
      const recrawlRows = recrawls.data ?? [];
      const pending = queueRows.filter((r: any) => r.review_status === "pending").length;
      const inReview = queueRows.filter((r: any) => r.review_status === "in_review").length;
      const approved = queueRows.filter((r: any) => r.review_status === "approved").length;
      const rejected = queueRows.filter((r: any) => r.review_status === "rejected").length;
      const needsRecrawl = queueRows.filter((r: any) => r.review_status === "needs_recrawl").length;
      const avgQuality = canonicalRows.length === 0 ? 0 : canonicalRows.reduce((sum: number, row: any) => sum + Number(row.merge_confidence ?? 0), 0) / canonicalRows.length;
      const byVertical = canonicalRows.reduce((acc: Record<string, number>, row: any) => { acc[row.vertical] = (acc[row.vertical] ?? 0) + 1; return acc; }, {});
      return { pending, inReview, approved, rejected, needsRecrawl, avgQuality, byVertical, recrawlQueued: recrawlRows.filter((r: any) => r.status === "queued").length, recrawlRunning: recrawlRows.filter((r: any) => r.status === "running").length };
    },
    staleTime: 20_000,
    refetchInterval: 30_000,
  });
}
