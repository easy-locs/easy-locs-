import { useState, useEffect, useCallback, memo } from "react";
import { engineOrchestrator } from "@/engines/core/engine-orchestrator";
import { useI18n } from "@/lib/i18n";
import { MobilePageHeader } from "@/components/ui/mobile-page-header";
import { Activity, AlertTriangle, CheckCircle2, XCircle, RefreshCw, ChevronDown, ChevronRight } from "lucide-react";

interface EngineInfo {
  id: string;
  name: string;
  category: string;
  running: boolean;
  tickCount: number;
  errorCount: number;
  lastTick: number;
  score?: number;
  findingsCount?: number;
}

const QUALITY_ENGINE_IDS = [
  "quality-taxonomy",
  "quality-canonical-mapping",
  "quality-profile",
  "quality-address",
  "quality-module-link",
  "quality-routing",
  "quality-ui-polish",
  "quality-data-cleaning",
  "quality-seo",
  "quality-dead-code",
  "quality-dead-flow",
  "quality-wallet",
  "quality-orbit",
  "quality-radar-optimization",
  "quality-me-business",
  "quality-property",
  "quality-country-rules",
  "quality-automation",
  "quality-observability",
  "quality-test-enforcement",
  "quality-feature-flags",
  "quality-score-global",
];

function getScoreColor(score: number): string {
  if (score >= 80) return "hsl(142 70% 45%)";
  if (score >= 60) return "hsl(38 65% 56%)";
  if (score >= 40) return "hsl(25 90% 55%)";
  return "hsl(0 72% 51%)";
}

function getGrade(score: number): string {
  if (score >= 90) return "A";
  if (score >= 80) return "B";
  if (score >= 70) return "C";
  if (score >= 60) return "D";
  return "F";
}

const ScoreCircle = memo(({ score, size = 48 }: { score: number; size?: number }) => {
  const color = getScoreColor(score);
  const radius = (size - 6) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="hsl(220 15% 90%)" strokeWidth={3} />
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth={3} strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" style={{ transition: "stroke-dashoffset 0.6s ease" }} />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.28, fontWeight: 700, color }}>
        {score}
      </div>
    </div>
  );
});

const EngineCard = memo(({ engine, expanded, onToggle }: { engine: EngineInfo; expanded: boolean; onToggle: () => void }) => {
  const score = engine.score ?? -1;
  const hasScore = score >= 0;

  return (
    <div style={{ background: "white", borderRadius: 12, padding: "14px 16px", border: "1px solid hsl(220 15% 90%)", marginBottom: 8 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }} onClick={onToggle}>
        <div style={{ flexShrink: 0 }}>
          {hasScore ? <ScoreCircle score={score} size={42} /> : (
            <div style={{ width: 42, height: 42, borderRadius: "50%", background: engine.running ? "hsl(142 70% 92%)" : "hsl(0 0% 92%)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              {engine.running ? <Activity size={18} style={{ color: "hsl(142 70% 45%)" }} /> : <XCircle size={18} style={{ color: "hsl(0 0% 60%)" }} />}
            </div>
          )}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: 14, color: "hsl(220 40% 18%)" }}>{engine.name}</div>
          <div style={{ fontSize: 12, color: "hsl(220 10% 55%)", marginTop: 2 }}>
            {engine.running ? `${engine.tickCount} ticks` : "stopped"}
            {engine.errorCount > 0 && <span style={{ color: "hsl(0 72% 51%)", marginLeft: 8 }}>{engine.errorCount} errors</span>}
            {engine.findingsCount != null && engine.findingsCount > 0 && <span style={{ color: "hsl(38 65% 50%)", marginLeft: 8 }}>{engine.findingsCount} findings</span>}
          </div>
        </div>
        {hasScore && (
          <div style={{ fontWeight: 700, fontSize: 16, color: getScoreColor(score), marginRight: 4 }}>
            {getGrade(score)}
          </div>
        )}
        {expanded ? <ChevronDown size={16} style={{ color: "hsl(220 10% 55%)" }} /> : <ChevronRight size={16} style={{ color: "hsl(220 10% 55%)" }} />}
      </div>
    </div>
  );
});

export default function EnginesDashboardPage() {
  const { t } = useI18n();
  const [engines, setEngines] = useState<EngineInfo[]>([]);
  const [globalScore, setGlobalScore] = useState(0);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const loadEngines = useCallback(() => {
    const allStats = engineOrchestrator.getAllStats();
    const infos: EngineInfo[] = allStats
      .filter(s => QUALITY_ENGINE_IDS.includes(s.id))
      .map(s => {
        const engine = engineOrchestrator.getEngine(s.id) as any;
        return {
          ...s,
          score: typeof engine?.getScore === "function" ? engine.getScore() : undefined,
          findingsCount: typeof engine?.getFindings === "function" ? engine.getFindings()?.length : undefined,
        };
      });

    setEngines(infos);

    const globalEngine = engineOrchestrator.getEngine("quality-score-global") as any;
    if (globalEngine && typeof globalEngine.getScore === "function") {
      setGlobalScore(globalEngine.getScore());
    } else {
      const scored = infos.filter(e => e.score != null && e.score >= 0);
      if (scored.length > 0) {
        setGlobalScore(Math.round(scored.reduce((s, e) => s + (e.score ?? 0), 0) / scored.length));
      }
    }
  }, []);

  useEffect(() => {
    loadEngines();
    const interval = setInterval(loadEngines, 10000);
    return () => clearInterval(interval);
  }, [loadEngines, refreshKey]);

  const totalFindings = engines.reduce((s, e) => s + (e.findingsCount || 0), 0);
  const runningCount = engines.filter(e => e.running).length;
  const weakEngines = engines.filter(e => e.score != null && e.score < 60);

  return (
    <div style={{ minHeight: "100vh", background: "hsl(220 20% 97%)" }}>
      <MobilePageHeader title="Quality Engines" />

      <div style={{ padding: "16px 16px 100px" }}>
        <div style={{ background: "hsl(220 40% 18%)", borderRadius: 16, padding: 24, marginBottom: 20, color: "white" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
            <ScoreCircle score={globalScore} size={80} />
            <div>
              <div style={{ fontSize: 13, opacity: 0.7, marginBottom: 4 }}>Platform Quality Score</div>
              <div style={{ fontSize: 32, fontWeight: 800, color: "hsl(38 65% 56%)" }}>{getGrade(globalScore)}</div>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginTop: 20 }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 20, fontWeight: 700 }}>{runningCount}</div>
              <div style={{ fontSize: 11, opacity: 0.7 }}>Active Engines</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: totalFindings > 0 ? "hsl(38 65% 56%)" : "white" }}>{totalFindings}</div>
              <div style={{ fontSize: 11, opacity: 0.7 }}>Total Findings</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: weakEngines.length > 0 ? "hsl(0 72% 65%)" : "white" }}>{weakEngines.length}</div>
              <div style={{ fontSize: 11, opacity: 0.7 }}>Weak Areas</div>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <div style={{ fontWeight: 700, fontSize: 16, color: "hsl(220 40% 18%)" }}>
            Quality Engines ({engines.length})
          </div>
          <button onClick={() => setRefreshKey(k => k + 1)} style={{ background: "none", border: "none", cursor: "pointer", padding: 8 }}>
            <RefreshCw size={18} style={{ color: "hsl(220 10% 55%)" }} />
          </button>
        </div>

        {engines.sort((a, b) => (a.score ?? 999) - (b.score ?? 999)).map(engine => (
          <EngineCard
            key={engine.id}
            engine={engine}
            expanded={expandedId === engine.id}
            onToggle={() => setExpandedId(expandedId === engine.id ? null : engine.id)}
          />
        ))}

        {engines.length === 0 && (
          <div style={{ textAlign: "center", padding: 40, color: "hsl(220 10% 55%)" }}>
            <Activity size={32} style={{ margin: "0 auto 12px", opacity: 0.5 }} />
            <div style={{ fontSize: 14 }}>Quality engines loading...</div>
            <div style={{ fontSize: 12, marginTop: 4 }}>They start 12 seconds after app boot</div>
          </div>
        )}
      </div>
    </div>
  );
}
