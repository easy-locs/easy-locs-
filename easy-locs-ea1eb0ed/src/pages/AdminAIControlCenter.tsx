import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
import { useUiEngine } from "@/hooks/useUiEngine";
  Activity, Brain, Bug, Eye, Gauge, Heart, LineChart, Play,
  RefreshCw, Shield, Sparkles, TrendingUp, Zap, Clock, AlertTriangle,
  CheckCircle2, XCircle, BarChart3, Cpu,
} from "lucide-react";

interface AgentStatus {
  role: string;
  label: string;
  engineCount: number;
  runningCount: number;
  totalFindings: number;
  totalActions: number;
  errorCount: number;
  healthScore: number;
  lastActivity: number;
}

interface AgentInsight {
  timestamp: number;
  role: string;
  severity: "info" | "warning" | "critical";
  title: string;
  detail: string;
  engineSource: string;
}

interface PipelineInfo {
  id: string;
  name: string;
  description: string;
  intervalMs: number;
  lastRun: { status: string; duration: number | null; findings: string[]; actions: string[] } | null;
}

interface AIReport {
  timestamp: number;
  systemHealth: number;
  agents: AgentStatus[];
  recentInsights: AgentInsight[];
  orchestratorReport: {
    orchestrator: { booted: boolean; totalEngines: number; runningEngines: number };
    totalTicks: number;
    totalErrors: number;
    totalFindings: number;
    totalActions: number;
  };
}

interface PipelineReport {
  started: boolean;
  pipelineCount: number;
  pipelines: PipelineInfo[];
  totalRuns: number;
}

const AGENT_ICONS: Record<string, typeof Bug> = {
  debug: Bug,
  performance: Gauge,
  ux: Eye,
  data: BarChart3,
  security: Shield,
  growth: TrendingUp,
};

const AGENT_COLORS: Record<string, string> = {
  debug: "hsl(0 70% 55%)",
  performance: "hsl(200 80% 50%)",
  ux: "hsl(280 60% 55%)",
  data: "hsl(30 90% 55%)",
  security: "hsl(150 60% 45%)",
  growth: "hsl(168 72% 44%)",
};

function healthColor(score: number): string {
  if (score >= 80) return "hsl(150 70% 40%)";
  if (score >= 60) return "hsl(168 72% 44%)";
  return "hsl(0 70% 55%)";
}

function severityBadge(severity: "info" | "warning" | "critical") {
  const styles: Record<string, string> = {
    info: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
    warning: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
    critical: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  };
  return <Badge className={`text-[10px] ${styles[severity]}`}>{severity}</Badge>;
}

function timeAgo(ts: number): string {
  if (!ts) return "never";
  const diff = Date.now() - ts;
  if (diff < 60_000) return `${Math.round(diff / 1000)}s ago`;
  if (diff < 3_600_000) return `${Math.round(diff / 60_000)}m ago`;
  return `${Math.round(diff / 3_600_000)}h ago`;
}

function formatInterval(ms: number): string {
  if (ms < 60_000) return `${Math.round(ms / 1000)}s`;
  if (ms < 3_600_000) return `${Math.round(ms / 60_000)}m`;
  return `${Math.round(ms / 3_600_000)}h`;
}

export default function AdminAIControlCenter() {
  useUiEngine("adminaicontrolcenter");
  const [aiReport, setAiReport] = useState<AIReport | null>(null);
  const [pipelineReport, setPipelineReport] = useState<PipelineReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [runningPipeline, setRunningPipeline] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      setAiReport(null);
      setPipelineReport(null);
    } catch {
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 15_000);
    return () => clearInterval(interval);
  }, [loadData]);

  const triggerPipeline = async (_pipelineId: string) => {
    setRunningPipeline(null);
  };

  const orch = aiReport?.orchestratorReport;
  const systemHealth = aiReport?.systemHealth ?? 0;

  return (
    <div className="min-h-screen bg-background text-foreground p-4 md:p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Brain className="w-6 h-6" style={{ color: "hsl(var(--primary))" }} />
            AI Control Center
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            AI engines removed in engine reduction phase — dashboard retained for reference
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={loadData} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-1 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* System Health Overview */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-3xl font-extrabold tabular-nums" style={{ color: healthColor(systemHealth) }}>
              {systemHealth}
            </div>
            <div className="text-xs text-muted-foreground mt-1">System Health</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-3xl font-extrabold tabular-nums" style={{ color: "hsl(var(--primary))" }}>
              {orch?.orchestrator.totalEngines ?? 0}
            </div>
            <div className="text-xs text-muted-foreground mt-1">Total Engines</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-3xl font-extrabold tabular-nums" style={{ color: "hsl(150 70% 40%)" }}>
              {orch?.orchestrator.runningEngines ?? 0}
            </div>
            <div className="text-xs text-muted-foreground mt-1">Running</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-3xl font-extrabold tabular-nums">{orch?.totalTicks ?? 0}</div>
            <div className="text-xs text-muted-foreground mt-1">Total Ticks</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-3xl font-extrabold tabular-nums" style={{ color: (orch?.totalErrors ?? 0) > 0 ? "hsl(0 70% 55%)" : "hsl(150 70% 40%)" }}>
              {orch?.totalErrors ?? 0}
            </div>
            <div className="text-xs text-muted-foreground mt-1">Total Errors</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="agents" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="agents" className="text-xs">
            <Sparkles className="w-3.5 h-3.5 mr-1" /> Agents
          </TabsTrigger>
          <TabsTrigger value="pipelines" className="text-xs">
            <Cpu className="w-3.5 h-3.5 mr-1" /> Pipelines
          </TabsTrigger>
          <TabsTrigger value="insights" className="text-xs">
            <LineChart className="w-3.5 h-3.5 mr-1" /> Insights
          </TabsTrigger>
        </TabsList>

        {/* AGENTS TAB */}
        <TabsContent value="agents" className="space-y-3">
          {(aiReport?.agents ?? []).map((agent) => {
            const Icon = AGENT_ICONS[agent.role] ?? Activity;
            const color = AGENT_COLORS[agent.role] ?? "hsl(var(--foreground))";
            return (
              <Card key={agent.role}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                      style={{ background: `${color}20`, color }}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm">{agent.label}</span>
                        <Badge variant="outline" className="text-[10px]">
                          {agent.runningCount}/{agent.engineCount} engines
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        <span>{agent.totalFindings} findings</span>
                        <span>{agent.totalActions} actions</span>
                        {agent.errorCount > 0 && (
                          <span style={{ color: "hsl(0 70% 55%)" }}>{agent.errorCount} errors</span>
                        )}
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {timeAgo(agent.lastActivity)}
                        </span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-lg font-bold" style={{ color: healthColor(agent.healthScore) }}>
                        {agent.healthScore}
                      </div>
                      <div className="text-[10px] text-muted-foreground">health</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>

        {/* PIPELINES TAB */}
        <TabsContent value="pipelines" className="space-y-3">
          {(pipelineReport?.pipelines ?? []).map((pipeline) => (
            <Card key={pipeline.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-sm flex items-center gap-2">
                      {pipeline.name}
                      <Badge variant="outline" className="text-[10px]">
                        every {formatInterval(pipeline.intervalMs)}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{pipeline.description}</p>
                    {pipeline.lastRun && (
                      <div className="flex items-center gap-2 mt-2 text-xs">
                        {pipeline.lastRun.status === "completed" ? (
                          <CheckCircle2 className="w-3.5 h-3.5" style={{ color: "hsl(150 70% 40%)" }} />
                        ) : pipeline.lastRun.status === "failed" ? (
                          <XCircle className="w-3.5 h-3.5" style={{ color: "hsl(0 70% 55%)" }} />
                        ) : (
                          <Activity className="w-3.5 h-3.5 animate-pulse" />
                        )}
                        <span className="text-muted-foreground">
                          {pipeline.lastRun.findings.length} findings, {pipeline.lastRun.actions.length} actions
                          {pipeline.lastRun.duration != null && ` (${pipeline.lastRun.duration}ms)`}
                        </span>
                      </div>
                    )}
                    {pipeline.lastRun?.findings && pipeline.lastRun.findings.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {pipeline.lastRun.findings.slice(0, 5).map((f, i) => (
                          <div key={i} className="text-[11px] text-muted-foreground flex items-start gap-1.5">
                            <AlertTriangle className="w-3 h-3 shrink-0 mt-0.5" style={{ color: "hsl(168 72% 44%)" }} />
                            {f}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => triggerPipeline(pipeline.id)}
                    disabled={runningPipeline === pipeline.id}
                    className="shrink-0"
                  >
                    {runningPipeline === pipeline.id ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Play className="w-3.5 h-3.5" />
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
          {(pipelineReport?.pipelines ?? []).length === 0 && (
            <div className="text-center py-12 text-muted-foreground text-sm">
              No pipelines registered. System may still be booting.
            </div>
          )}
        </TabsContent>

        {/* INSIGHTS TAB */}
        <TabsContent value="insights">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Recent AI Insights</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[500px]">
                <div className="divide-y divide-border">
                  {(aiReport?.recentInsights ?? []).length === 0 && (
                    <div className="text-center py-12 text-muted-foreground text-sm">
                      No insights yet. Agents are analyzing the system.
                    </div>
                  )}
                  {(aiReport?.recentInsights ?? []).reverse().map((insight, i) => {
                    const Icon = AGENT_ICONS[insight.role] ?? Activity;
                    return (
                      <div key={i} className="px-4 py-3 hover:bg-muted/30 transition-colors">
                        <div className="flex items-start gap-3">
                          <Icon className="w-4 h-4 shrink-0 mt-0.5" style={{ color: AGENT_COLORS[insight.role] }} />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium">{insight.title}</span>
                              {severityBadge(insight.severity)}
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">{insight.detail}</p>
                            <div className="text-[10px] text-muted-foreground/60 mt-1">
                              {timeAgo(insight.timestamp)} · {insight.engineSource}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Safety Rules Banner */}
      <Card className="border-dashed">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Heart className="w-5 h-5 shrink-0 mt-0.5" style={{ color: "hsl(var(--primary))" }} />
            <div>
              <div className="text-sm font-semibold">Safety Rules Active</div>
              <p className="text-xs text-muted-foreground mt-0.5">
                AI agents operate in observe/detect/propose mode only. No direct production modifications.
                All changes require admin validation. System stability is maintained at all times.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
