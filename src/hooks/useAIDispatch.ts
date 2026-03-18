/**
 * useAIDispatch — Unified hook combining demand prediction, supply analysis, and AI pricing.
 */
import { useMemo } from "react";
import { predictDemand, demandLabel } from "@/lib/ai/demand-predictor";
import { analyzeSupply } from "@/lib/ai/supply-analyzer";
import { aiPricing, type AIPricingResult } from "@/lib/ai/ai-pricing";

interface UseAIDispatchResult {
  demand: number;
  demandTier: ReturnType<typeof demandLabel>;
  supply: ReturnType<typeof analyzeSupply>;
  pricing: AIPricingResult;
}

export function useAIDispatch(
  drivers: Array<{ status: string }>,
  zone: string,
  basePrice = 20,
): UseAIDispatchResult {
  return useMemo(() => {
    const now = new Date();

    const demand = predictDemand({
      hour: now.getHours(),
      day: now.getDay(),
      zone,
    });

    const supply = analyzeSupply(drivers);

    const pricing = aiPricing({
      demand,
      supply: supply.available,
      basePrice,
    });

    return {
      demand,
      demandTier: demandLabel(demand),
      supply,
      pricing,
    };
  }, [drivers, zone, basePrice]);
}
