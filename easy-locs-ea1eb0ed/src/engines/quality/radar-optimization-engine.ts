import { BaseEngine, type EngineTickResult } from "../core/base-engine";

interface RadarFinding {
  type: "slow_search" | "empty_results" | "filter_unused" | "map_heavy" | "ranking_issue" | "cluster_gap";
  severity: "low" | "medium" | "high";
  detail: string;
  recommendation: string;
}

export class RadarOptimizationEngine extends BaseEngine {
  private findings: RadarFinding[] = [];
  private score = 100;
  private searchHistory: Array<{ query: string; resultCount: number; durationMs: number; timestamp: number }> = [];

  constructor() {
    super({
      id: "quality-radar-optimization",
      name: "Radar Optimization Engine",
      category: "quality",
      intervalMs: 60_000,
    });
  }

  async tick(): Promise<EngineTickResult> {
    const findings: RadarFinding[] = [];

    const searchMeasures = performance.getEntriesByName("radar-search");
    for (const entry of searchMeasures) {
      if (entry.duration > 2000) {
        findings.push({
          type: "slow_search",
          severity: "high",
          detail: `Radar search took ${Math.round(entry.duration)}ms (target: <500ms)`,
          recommendation: "Optimize search query — add indexes, reduce payload, implement caching",
        });
      }
    }

    const radarContainer = document.querySelector("[data-radar-results]");
    if (radarContainer) {
      const resultCards = radarContainer.querySelectorAll("[data-radar-card]");
      if (resultCards.length === 0) {
        const hasSearch = document.querySelector("[data-radar-search]");
        if (hasSearch) {
          findings.push({
            type: "empty_results",
            severity: "medium",
            detail: "Radar showing 0 results — user may have no nearby entities",
            recommendation: "Show helpful fallback: expand radius, suggest categories, show trending",
          });
        }
      }

      if (resultCards.length > 100) {
        findings.push({
          type: "map_heavy",
          severity: "medium",
          detail: `${resultCards.length} result cards rendered — may cause scroll lag`,
          recommendation: "Implement pagination or virtual scrolling for large result sets",
        });
      }
    }

    const mapPins = document.querySelectorAll("[data-map-pin], .leaflet-marker-icon, .mapboxgl-marker");
    if (mapPins.length > 100) {
      findings.push({
        type: "map_heavy",
        severity: "medium",
        detail: `${mapPins.length} map markers rendered — may cause map lag`,
        recommendation: "Implement marker clustering for >80 pins",
      });
    }

    const filterChips = document.querySelectorAll("[data-filter-chip]");
    const activeFilters = document.querySelectorAll("[data-filter-chip][data-active='true']");
    if (filterChips.length > 0 && activeFilters.length === 0) {
      findings.push({
        type: "filter_unused",
        severity: "low",
        detail: `${filterChips.length} filter chips available but none active — users may not discover filters`,
        recommendation: "Consider pre-selecting a smart default filter based on context",
      });
    }

    this.findings = findings;
    this.score = Math.max(0, 100 - findings.filter(f => f.severity === "high").length * 15 - findings.filter(f => f.severity === "medium").length * 5 - findings.filter(f => f.severity === "low").length * 2);

    this.emit("report", { score: this.score, totalFindings: findings.length });
    return { level: findings.length > 0 ? "detect" : "observe", findings: findings.length, actions: [], duration: 0 };
  }

  getFindings() { return [...this.findings]; }
  getScore() { return this.score; }
  getReport() { return { score: this.score, findings: this.findings }; }
}
