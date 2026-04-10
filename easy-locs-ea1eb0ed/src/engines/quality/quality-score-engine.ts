import { BaseEngine, type EngineTickResult } from "../core/base-engine";
import { engineOrchestrator } from "../core/engine-orchestrator";

interface DimensionScore {
  dimension: string;
  score: number;
  engineId: string;
  findingsCount: number;
}

interface QualityReport {
  overallScore: number;
  grade: string;
  dimensions: DimensionScore[];
  strongAreas: string[];
  weakAreas: string[];
  timestamp: number;
}

const QUALITY_ENGINE_IDS: Record<string, string> = {
  "Taxonomy": "quality-taxonomy",
  "Canonical Mapping": "quality-canonical-mapping",
  "Profile Quality": "quality-profile",
  "Address Quality": "quality-address",
  "Module Links": "quality-module-link",
  "Routing": "quality-routing",
  "UI Polish": "quality-ui-polish",
  "Data Cleaning": "quality-data-cleaning",
  "SEO": "quality-seo",
  "Dead Code": "quality-dead-code",
  "Dead Flows": "quality-dead-flow",
  "Wallet": "quality-wallet",
  "Orbit": "quality-orbit",
  "Radar": "quality-radar-optimization",
  "Me Business": "quality-me-business",
  "Property": "quality-property",
  "Country Rules": "quality-country-rules",
  "Automation": "quality-automation",
  "Observability": "quality-observability",
  "Test Enforcement": "quality-test-enforcement",
  "Feature Flags": "quality-feature-flags",
};

function scoreToGrade(score: number): string {
  if (score >= 90) return "A";
  if (score >= 80) return "B";
  if (score >= 70) return "C";
  if (score >= 60) return "D";
  return "F";
}

export class QualityScoreEngine extends BaseEngine {
  private report: QualityReport = { overallScore: 0, grade: "?", dimensions: [], strongAreas: [], weakAreas: [], timestamp: 0 };

  constructor() {
    super({
      id: "quality-score-global",
      name: "Global Quality Score Engine",
      category: "quality",
      intervalMs: 120_000,
    });
  }

  async tick(): Promise<EngineTickResult> {
    const dimensions: DimensionScore[] = [];
    let totalScore = 0;
    let count = 0;

    for (const [dimension, engineId] of Object.entries(QUALITY_ENGINE_IDS)) {
      const engine = engineOrchestrator.getEngine(engineId) as any;
      if (engine && typeof engine.getScore === "function") {
        const score = engine.getScore();
        const findingsCount = typeof engine.getFindings === "function" ? engine.getFindings().length : 0;
        dimensions.push({ dimension, score, engineId, findingsCount });
        totalScore += score;
        count++;
      } else {
        dimensions.push({ dimension, score: -1, engineId, findingsCount: 0 });
      }
    }

    const overallScore = count > 0 ? Math.round(totalScore / count) : 0;
    const strongAreas = dimensions.filter(d => d.score >= 80 && d.score >= 0).map(d => d.dimension);
    const weakAreas = dimensions.filter(d => d.score >= 0 && d.score < 60).map(d => d.dimension);

    this.report = {
      overallScore,
      grade: scoreToGrade(overallScore),
      dimensions: dimensions.sort((a, b) => a.score - b.score),
      strongAreas,
      weakAreas,
      timestamp: Date.now(),
    };

    this.emit("report", {
      overallScore,
      grade: this.report.grade,
      dimensionCount: dimensions.filter(d => d.score >= 0).length,
      weak: weakAreas.length,
      strong: strongAreas.length,
    });

    return {
      level: weakAreas.length > 3 ? "detect" : "observe",
      findings: weakAreas.length,
      actions: [],
      duration: 0,
    };
  }

  getReport() { return { ...this.report }; }
  getScore() { return this.report.overallScore; }
}
