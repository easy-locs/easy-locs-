/**
 * dispatch-wave-engine — Progressive wave-based driver offer dispatch.
 */
import { supabase } from "@/integrations/supabase/client";
import type { ScoredDriver } from "./driver-ai-scorer";

const WAVES = {
  1: { start: 0, count: 3, expiresSec: 15 },
  2: { start: 3, count: 5, expiresSec: 15 },
  3: { start: 8, count: 8, expiresSec: 20 },
} as const;

export async function createDispatchRun(jobId: string, zoneKey?: string | null) {
  const { data } = await supabase
    .from("mobility_dispatch_runs")
    .insert({
      job_id: jobId,
      zone_key: zoneKey ?? null,
      status: "running",
      dispatch_strategy: "wave_ai",
      current_wave: 1,
      max_waves: 3,
    } as any)
    .select()
    .single();

  return data;
}

export async function dispatchWave(
  jobId: string,
  drivers: ScoredDriver[],
  waveNumber: 1 | 2 | 3,
) {
  const wave = WAVES[waveNumber];
  const selected = drivers.slice(wave.start, wave.start + wave.count);

  if (!selected.length) return [];

  const expiresAt = new Date(Date.now() + wave.expiresSec * 1000).toISOString();

  await supabase.from("mobility_job_offers").insert(
    selected.map((d) => ({
      job_id: jobId,
      rider_user_id: d.rider_user_id,
      status: "pending",
      eta_minutes: Math.max(2, Math.round(3 + d.rank_index)),
      expires_at: expiresAt,
      metadata_json: {
        wave: waveNumber,
        score_total: d.score_total,
      },
    })) as any,
  );

  return selected;
}
