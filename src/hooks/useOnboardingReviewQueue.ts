import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useOnboardingReviewQueue(filters?: { reviewStatus?: string; vertical?: string }) {
  return useQuery({
    queryKey: ["onboarding-review-queue", filters],
    queryFn: async () => {
      const db = supabase as any;
      let query = db.from("onboarding_review_queue").select("*").order("priority", { ascending: false }).order("created_at", { ascending: false });
      if (filters?.reviewStatus) query = query.eq("review_status", filters.reviewStatus);
      if (filters?.vertical) query = query.eq("vertical", filters.vertical);
      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 20_000,
    refetchInterval: 30_000,
  });
}
