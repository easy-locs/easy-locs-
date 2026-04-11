import type { OpportunitySignal, OmegaEngineStatus } from "../omega-types";

const MAX_SIGNALS = 1_000;
let signalIdCounter = 0;

type SignalType = OpportunitySignal["signal_type"];

class BusinessOpportunityEngine {
  readonly name = "omega-business-opportunity";
  readonly domain = "omega";
  status: OmegaEngineStatus = "idle";
  lastRunAt = 0;

  private signals = new Map<string, OpportunitySignal>();

  getStatus(): OmegaEngineStatus { return this.status; }
  getHeartbeat() { return { alive: this.status !== "stopped", lastBeat: this.lastRunAt }; }

  detectSignal(
    signalType: SignalType,
    geoScope: string,
    categoryScope: string,
    confidenceScore: number,
    impactScore: number,
    evidence: Record<string, unknown>,
    recommendedAction: string,
  ): OpportunitySignal {
    if (this.signals.size >= MAX_SIGNALS) {
      const lowest = [...this.signals.entries()].sort((a, b) => a[1].impact_score - b[1].impact_score)[0];
      if (lowest) this.signals.delete(lowest[0]);
    }
    const signal: OpportunitySignal = {
      signal_id: `opp_${++signalIdCounter}`,
      signal_type: signalType,
      geo_scope: geoScope,
      category_scope: categoryScope,
      confidence_score: Math.min(Math.max(confidenceScore, 0), 1),
      impact_score: Math.min(Math.max(impactScore, 0), 100),
      evidence,
      recommended_action: recommendedAction,
      created_at: Date.now(),
    };
    this.signals.set(signal.signal_id, signal);
    this.lastRunAt = Date.now();
    return signal;
  }

  detectHighDemandZone(geoZone: string, searchVolume: number, listingCount: number): OpportunitySignal | null {
    const ratio = listingCount > 0 ? searchVolume / listingCount : searchVolume;
    if (ratio < 3) return null;
    return this.detectSignal("high_demand_zone", geoZone, "all", Math.min(ratio / 10, 1), Math.min(ratio * 5, 100),
      { search_volume: searchVolume, listing_count: listingCount, ratio },
      `Expand supply in ${geoZone} - demand/supply ratio: ${ratio.toFixed(1)}`);
  }

  detectWeakSupplyZone(geoZone: string, category: string, qualityScore: number): OpportunitySignal | null {
    if (qualityScore > 60) return null;
    return this.detectSignal("weak_supply_zone", geoZone, category, 0.7, 100 - qualityScore,
      { quality_score: qualityScore },
      `Improve supply quality in ${geoZone}/${category} - score: ${qualityScore}`);
  }

  detectHighValueCategory(category: string, avgBasket: number, conversionRate: number): OpportunitySignal | null {
    const value = avgBasket * conversionRate;
    if (value < 10) return null;
    return this.detectSignal("high_value_category", "global", category, Math.min(conversionRate, 1), Math.min(value, 100),
      { avg_basket: avgBasket, conversion_rate: conversionRate, combined_value: value },
      `Prioritize ${category} - high value (basket: ${avgBasket}, conv: ${(conversionRate * 100).toFixed(1)}%)`);
  }

  detectVerticalExpansion(category: string, demandSignals: number, currentSupply: number): OpportunitySignal | null {
    const gap = demandSignals - currentSupply;
    if (gap < 10) return null;
    return this.detectSignal("vertical_expansion", "global", category, Math.min(gap / 50, 1), Math.min(gap * 2, 100),
      { demand_signals: demandSignals, current_supply: currentSupply, gap },
      `Consider expanding ${category} vertical - gap: ${gap}`);
  }

  detectContentEnrichment(category: string, incompleteListings: number, totalListings: number): OpportunitySignal | null {
    const ratio = totalListings > 0 ? incompleteListings / totalListings : 0;
    if (ratio < 0.3) return null;
    return this.detectSignal("content_enrichment", "global", category, ratio, ratio * 80,
      { incomplete: incompleteListings, total: totalListings, ratio },
      `Enrich content in ${category} - ${(ratio * 100).toFixed(0)}% incomplete`);
  }

  getTopOpportunities(limit = 20): OpportunitySignal[] {
    return [...this.signals.values()]
      .sort((a, b) => b.impact_score * b.confidence_score - a.impact_score * a.confidence_score)
      .slice(0, limit);
  }

  getByType(type: SignalType): OpportunitySignal[] {
    return [...this.signals.values()].filter((s) => s.signal_type === type);
  }

  getByGeo(geoScope: string): OpportunitySignal[] {
    return [...this.signals.values()].filter((s) => s.geo_scope === geoScope);
  }

  getGeoPriorityMap(): Array<{ geo: string; total_impact: number; signal_count: number }> {
    const geoMap = new Map<string, { impact: number; count: number }>();
    for (const [, s] of this.signals) {
      if (!geoMap.has(s.geo_scope)) geoMap.set(s.geo_scope, { impact: 0, count: 0 });
      const g = geoMap.get(s.geo_scope)!;
      g.impact += s.impact_score;
      g.count++;
    }
    return [...geoMap.entries()]
      .map(([geo, v]) => ({ geo, total_impact: v.impact, signal_count: v.count }))
      .sort((a, b) => b.total_impact - a.total_impact);
  }

  getStats() {
    const typeCounts: Record<string, number> = {};
    for (const [, s] of this.signals) {
      typeCounts[s.signal_type] = (typeCounts[s.signal_type] || 0) + 1;
    }
    return {
      total_signals: this.signals.size,
      by_type: typeCounts,
      geo_zones: new Set([...this.signals.values()].map((s) => s.geo_scope)).size,
      top_impact: this.getTopOpportunities(1)[0]?.impact_score || 0,
    };
  }

  boot(): void {
    this.status = "active";
    this.lastRunAt = Date.now();
    console.log(`[OMEGA] BusinessOpportunityEngine booted | signals: ${this.signals.size}`);
  }

  shutdown(): void { this.status = "stopped"; }
}

export const businessOpportunityEngine = new BusinessOpportunityEngine();
