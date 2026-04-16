import { supabase } from "@/integrations/supabase/client";

export type RecommendationDomain = "radar" | "marketplace" | "property" | "ride";

export interface RecommendationItem {
  id: string;
  kind: string;
  score: number;
  reason: string;
  source_table?: string;
}

export interface RecommendationRequest {
  domain: RecommendationDomain;
  limit?: number;
  context?: Record<string, unknown>;
  refresh?: boolean;
}

export interface RecommendationResult {
  items: RecommendationItem[];
  cached: boolean;
  domain: RecommendationDomain;
}

export async function fetchRecommendations(
  input: RecommendationRequest,
): Promise<RecommendationResult> {
  const { data, error } = await supabase.functions.invoke<RecommendationResult | { error: string }>(
    "ai-router/recommendations",
    { body: input },
  );
  if (error) throw new Error(error.message);
  if (!data || (data as { error?: string }).error) {
    throw new Error((data as { error?: string })?.error ?? "Recommendation request failed");
  }
  return data as RecommendationResult;
}
