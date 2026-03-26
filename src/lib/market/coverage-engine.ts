/**
 * Market Coverage Scoring Engine
 * Evaluates marketplace density and identifies gaps.
 */
import { supabase } from "@/integrations/supabase/client";

export interface CoverageScore {
  city: string;
  countryCode: string;
  merchantCount: number;
  activeMerchantCount: number;
  activeDriverCount: number;
  failedDispatchCount: number;
  dormantMerchantCount: number;
  coverageScore: number;      // 0-100
  coverageGapScore: number;   // 0-100 (higher = bigger gap)
  acquisitionPriority: number; // 0-100
  driverSupplyPressure: number; // 0-100
  operationalRisk: number;     // 0-100
}

export async function computeCityCoverage(city: string, countryCode: string): Promise<CoverageScore> {
  const [merchants, activeM, drivers, failedD, dormantM] = await Promise.all([
    (supabase as any).from("merchant_onboarding_profiles").select("id", { count: "exact", head: true }).eq("city", city).eq("country_code", countryCode),
    (supabase as any).from("merchant_onboarding_profiles").select("id", { count: "exact", head: true }).eq("city", city).eq("country_code", countryCode).in("status", ["live", "active"]),
    (supabase as any).from("driver_profiles").select("id", { count: "exact", head: true }).eq("city", city).eq("country_code", countryCode).eq("is_online", true),
    (supabase as any).from("mobility_jobs").select("id", { count: "exact", head: true }).in("status", ["failed_no_rider", "expired"]),
    (supabase as any).from("merchant_onboarding_profiles").select("id", { count: "exact", head: true }).eq("city", city).eq("country_code", countryCode).eq("status", "dormant"),
  ]);

  const mc = merchants.count ?? 0;
  const ac = activeM.count ?? 0;
  const dc = drivers.count ?? 0;
  const fd = failedD.count ?? 0;
  const dm = dormantM.count ?? 0;

  const activationRate = mc > 0 ? (ac / mc) * 100 : 0;
  const coverageScore = Math.min(ac * 5 + dc * 10, 100);
  const coverageGapScore = 100 - coverageScore;
  const driverSupplyPressure = ac > 0 && dc === 0 ? 100 : ac > dc * 3 ? 80 : ac > dc ? 50 : 20;
  const operationalRisk = Math.min(fd * 5 + (dm / Math.max(mc, 1)) * 50, 100);
  const acquisitionPriority = Math.round(coverageGapScore * 0.5 + (100 - activationRate) * 0.3 + driverSupplyPressure * 0.2);

  return {
    city, countryCode, merchantCount: mc, activeMerchantCount: ac, activeDriverCount: dc,
    failedDispatchCount: fd, dormantMerchantCount: dm,
    coverageScore: Math.round(coverageScore),
    coverageGapScore: Math.round(coverageGapScore),
    acquisitionPriority: Math.round(acquisitionPriority),
    driverSupplyPressure: Math.round(driverSupplyPressure),
    operationalRisk: Math.round(operationalRisk),
  };
}
