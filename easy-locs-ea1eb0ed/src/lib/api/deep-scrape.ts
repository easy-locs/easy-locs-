/**
 * Deep Scrape & Build API — Scrapes a URL, validates menu, computes readiness, and inserts into pipeline.
 */
import { supabase } from "@/integrations/supabase/client";

export interface DeepScrapeResult {
  url: string;
  success: boolean;
  entity_id?: string;
  quality_score?: number;
  visibility_mode?: string;
  truth_status?: string;
  publish_status?: string;
  menu?: { items: number; score: number; valid: boolean };
  readiness?: Record<string, string>;
  active_modules?: string;
  hints?: string[];
  error?: string;
}

export async function deepScrapeAndBuild(
  urls: string[],
  city = "Dubai",
  country = "AE"
): Promise<{ success: boolean; results: DeepScrapeResult[]; total: number }> {
  const { data, error } = await supabase.functions.invoke("deep-scrape-build", {
    body: { urls, city, country },
  });

  if (error) throw new Error(error.message);
  return data;
}

export async function deepScrapeSingle(
  url: string,
  city = "Dubai",
  country = "AE"
): Promise<DeepScrapeResult> {
  const result = await deepScrapeAndBuild([url], city, country);
  return result.results[0];
}
