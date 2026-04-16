import { supabase } from "@/integrations/supabase/client";

export type EnrichmentEntityType = "listing" | "seed_product" | "marketplace_service";

export interface EnrichmentOutput {
  description: string;
  tags: string[];
  seo_title: string;
  seo_description: string;
  seo_keywords: string[];
  image_alts: Record<string, string>;
  quality_score: number;
}

export interface EnrichOneInput {
  entityType: EnrichmentEntityType;
  entityId: string;
  force?: boolean;
}

export interface EnrichBulkInput {
  entityType: EnrichmentEntityType;
  limit?: number;
  missingOnly?: boolean;
  force?: boolean;
}

export interface EnrichOneResult {
  ok: true; entityId: string; cached: boolean; output?: EnrichmentOutput;
}

export interface EnrichBulkResult {
  processed: number;
  total: number;
  results: Array<{ ok: boolean; entityId: string; cached?: boolean; error?: string; output?: EnrichmentOutput }>;
}

export async function enrichEntity(input: EnrichOneInput): Promise<EnrichOneResult> {
  const { data, error } = await supabase.functions.invoke<EnrichOneResult | { ok: false; error: string }>(
    "ai-router/content-enrichment",
    { body: input },
  );
  if (error) throw new Error(error.message);
  if (!data || (data as { ok: false; error?: string }).ok === false) {
    throw new Error((data as { error?: string })?.error ?? "Enrichment failed");
  }
  return data as EnrichOneResult;
}

export async function enrichBulk(input: EnrichBulkInput): Promise<EnrichBulkResult> {
  const { data, error } = await supabase.functions.invoke<EnrichBulkResult | { error: string }>(
    "ai-router/content-enrichment",
    { body: input },
  );
  if (error) throw new Error(error.message);
  if (!data || (data as { error?: string }).error) {
    throw new Error((data as { error?: string })?.error ?? "Bulk enrichment failed");
  }
  return data as EnrichBulkResult;
}
