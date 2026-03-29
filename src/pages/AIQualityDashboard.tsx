import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/lib/i18n";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import SEOHead from "@/components/SEOHead";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Layout, Search, Cpu, Store, Globe, TrendingUp, MessageCircle, Shield,
  Palette, Database, BarChart3, Smartphone, CreditCard, CalendarCheck, FileText,
  RefreshCw, Zap, AlertTriangle, CheckCircle2, XCircle, Info, Clock,
  ChevronRight, Sparkles, ArrowUpRight, ArrowDownRight, Minus,
} from "lucide-react";
import { runFullAudit, runLightAudit, CATEGORY_LABELS, getTriggerIssues, subscribeTriggerAudit, autoFixIssue, autoFixAll } from "@/lib/ai-audit";
import type { AuditReport, AuditIssue, ModuleScore, AuditCategory, AutoFixResult } from "@/lib/ai-audit";
import { invokeRunScheduledAudit, invokeAIAssistant } from "@/repositories/ai.repository";
import { fetchAuditReportsHistory } from "@/repositories/rental.repository";
import { toast } from "sonner";

const CATEGORY_ICON_MAP: Record<AuditCategory, React.ElementType> = {
  ui_ux: Layout, seo: Search, technical: Cpu, marketplace: Store,
  international: Globe, conversion: TrendingUp, communication: MessageCircle,
  security: Shield, brand: Palette, data_quality: Database,
  analytics: BarChart3, mobile: Smartphone, payment: CreditCard,
  booking: CalendarCheck, content: FileText,
};

const SEVERITY_COLORS: Record<string, string> = {
  critical: "bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/30",
  high: "bg-orange-500/15 text-orange-700 dark:text-orange-400 border-orange-500/30",
  medium: "bg-yellow-500/15 text-yellow-700 dark:text-yellow-400 border-yellow-500/30",
  low: "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30",
  info: "bg-muted text-muted-foreground border-border",
};

const IMPACT_LABELS: Record<string, string> = {
  revenue: "💰 Revenue", trust: "🤝 Trust", visibility: "👁️ Visibility",
  usability: "🎯 Usability", compliance: "📋 Compliance", performance: "⚡ Performance",
};

function getScoreColor(score: number) {
  if (score >= 90) return "text-green-600 dark:text-green-400";
  if (score >= 70) return "text-yellow-600 dark:text-yellow-400";
  if (score >= 50) return "text-orange-600 dark:text-orange-400";
  return "text-red-600 dark:text-red-400";
}

function getScoreGradient(score: number) {
  if (score >= 90) return "from-green-500 to-emerald-500";
  if (score >= 70) return "from-yellow-500 to-amber-500";
  if (score >= 50) return "from-orange-500 to-red-400";
  return "from-red-500 to-red-700";
}

const TrendIcon = ({ trend }: { trend: string }) => {
  if (trend === "up") return <ArrowUpRight className="h-3.5 w-3.5 text-green-500" />;
  if (trend === "down") return <ArrowDownRight className="h-3.5 w-3.5 text-red-500" />;
  return <Minus className="h-3.5 w-3.5 text-muted-foreground" />;
};

const AIQualityDashboard = () => {
  const { user } = useAuth();
  const { t } = useI18n();
  const [report, setReport] = useState<AuditReport | null>(null);
  const [scanning, setScanning] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<AuditCategory | "all">("all");
  const [copilotInput, setCopilotInput] = useState("");
  const [copilotReply, setCopilotReply] = useState("");
  const [copilotLoading, setCopilotLoading] = useState(false);
  const [triggerIssueCount, setTriggerIssueCount] = useState(0);
  const [history, setHistory] = useState<Array<{ created_at: string; global_score: number; total_issues: number; scan_type: string }>>([]);

  // Subscribe to trigger-based issues
  useEffect(() => {
    const update = () => setTriggerIssueCount(getTriggerIssues().length);
    update();
    return subscribeTriggerAudit(update);
  }, []);

  // Load audit history
  useEffect(() => {
    const loadHistory = async () => {
      const data = await fetchAuditReportsHistory(30);
      if (data) setHistory(data);
    };
    loadHistory();
  }, [report]);

  const runScan = useCallback(async (type: "full" | "light") => {
    setScanning(true);
    toast.info(type === "full" ? "Running full platform audit..." : "Running quick scan...");
    try {
      const result = type === "full" ? await runFullAudit() : await runLightAudit();
      // Merge trigger-based issues into the report
      const triggerIssuesArr = getTriggerIssues();
      result.issues = [...result.issues, ...triggerIssuesArr];
      result.totalIssues = result.issues.length;
      result.criticalIssues = result.issues.filter(i => i.severity === "critical").length;
      setReport(result);
      toast.success(`Scan complete — Score: ${result.globalScore}/100 — ${result.totalIssues} issue(s) found`);
    } catch (err) {
      toast.error("Scan failed");
      console.error(err);
    } finally {
      setScanning(false);
    }
  }, []);

  const runScheduledScan = useCallback(async () => {
    setScanning(true);
    toast.info("Running backend scheduled audit...");
    try {
      const data = await invokeRunScheduledAudit();
      toast.success(`Backend audit complete — Score: ${data.globalScore}/100 — ${data.totalIssues} issue(s)`);
      const hist = await fetchAuditReportsHistory(30);
      if (hist) setHistory(hist);
    } catch (err) {
      toast.error("Backend audit failed");
      console.error(err);
    } finally {
      setScanning(false);
    }
  }, []);

  useEffect(() => {
    runScan("light");
  }, []);

  const filteredIssues = report?.issues.filter(
    (i) => selectedCategory === "all" || i.category === selectedCategory
  ) || [];

  const askCopilot = async () => {
    if (!copilotInput.trim()) return;
    setCopilotLoading(true);
    setCopilotReply("");
    try {
      const data = await invokeAIAssistant({
        message: `As the AI Quality Copilot for Easy-Locs, analyze this request in the context of the platform audit:\n\n${copilotInput}\n\nCurrent audit report:\n- Global Score: ${report?.globalScore || "N/A"}\n- Total Issues: ${report?.totalIssues || 0}\n- Critical: ${report?.criticalIssues || 0}`,
        task: "chat",
        locale: "en",
        context: { auditReport: report ? { globalScore: report.globalScore, totalIssues: report.totalIssues, criticalIssues: report.criticalIssues } : null },
      });
      setCopilotReply(data.reply || "No response.");
    } catch (err) {
      setCopilotReply("Copilot unavailable. Please try again later.");
    } finally {
      setCopilotLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <SEOHead title="AI Quality Center — Easy-Locs" description="AI-powered platform quality monitoring and optimization" />
      <div className="p-4 md:p-6 space-y-6 max-w-[1400px] mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-primary" />
              AI Quality Center
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              15-engine audit system • Continuous quality monitoring
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={() => runScan("light")} disabled={scanning}>
              <Zap className="h-4 w-4 mr-1.5" /> Quick Scan
            </Button>
            <Button size="sm" onClick={() => runScan("full")} disabled={scanning}>
              <RefreshCw className={`h-4 w-4 mr-1.5 ${scanning ? "animate-spin" : ""}`} />
              Full Audit
            </Button>
            <Button variant="secondary" size="sm" onClick={runScheduledScan} disabled={scanning}>
              <Database className="h-4 w-4 mr-1.5" />
              Backend Audit
            </Button>
            {report && report.issues.some(i => i.autoFixable) && (
              <Button variant="outline" size="sm" onClick={() => {
                const results = autoFixAll(report.issues);
                const fixed = results.filter(r => r.fixed).length;
                if (fixed > 0) {
                  toast.success(`Auto-fixed ${fixed} issue(s)`);
                  runScan("light");
                } else {
                  toast.info("No issues could be auto-fixed at this time.");
                }
              }} className="border-primary/30 text-primary">
                <Sparkles className="h-4 w-4 mr-1.5" />
                Auto-Fix ({report.issues.filter(i => i.autoFixable).length})
              </Button>
            )}
          </div>
        </div>

        {/* Loading state */}
        {scanning && !report && (
          <Card className="py-16">
            <CardContent className="flex flex-col items-center justify-center gap-4">
              <RefreshCw className="h-10 w-10 animate-spin text-primary" />
              <p className="text-lg font-medium text-foreground">Analyse en cours…</p>
              <p className="text-sm text-muted-foreground">Scan de 15 modules qualité</p>
            </CardContent>
          </Card>
        )}

        {/* Empty state before first scan */}
        {!scanning && !report && (
          <Card className="py-16">
            <CardContent className="flex flex-col items-center justify-center gap-4">
              <Sparkles className="h-10 w-10 text-primary" />
              <p className="text-lg font-medium text-foreground">Centre Qualité IA</p>
              <p className="text-sm text-muted-foreground text-center max-w-md">
                Lancez un audit pour analyser la qualité de votre plateforme : SEO, UX, sécurité, performance, marketplace et plus.
              </p>
              <div className="flex gap-2">
                <Button onClick={() => runScan("light")}>
                  <Zap className="h-4 w-4 mr-1.5" /> Scan Rapide
                </Button>
                <Button variant="outline" onClick={() => runScan("full")}>
                  <RefreshCw className="h-4 w-4 mr-1.5" /> Audit Complet
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Global Score Card */}
        {report && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="md:col-span-1 relative overflow-hidden">
              <div className={`absolute inset-0 bg-gradient-to-br ${getScoreGradient(report.globalScore)} opacity-10`} />
              <CardContent className="pt-6 text-center relative">
                <p className="text-sm font-medium text-muted-foreground mb-2">Global Quality Score</p>
                <p className={`text-6xl font-black ${getScoreColor(report.globalScore)}`}>
                  {report.globalScore}
                </p>
                <p className="text-xs text-muted-foreground mt-2">/ 100</p>
                <div className="mt-3">
                  <Progress value={report.globalScore} className="h-2" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6 text-center">
                <AlertTriangle className="h-8 w-8 mx-auto text-red-500 mb-2" />
                <p className="text-3xl font-bold text-foreground">{report.criticalIssues}</p>
                <p className="text-sm text-muted-foreground">Critical Issues</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6 text-center">
                <XCircle className="h-8 w-8 mx-auto text-orange-500 mb-2" />
                <p className="text-3xl font-bold text-foreground">{report.totalIssues}</p>
                <p className="text-sm text-muted-foreground">Total Issues</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6 text-center">
                <Clock className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm font-medium text-foreground">{report.scanType.toUpperCase()}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {new Date(report.scannedAt).toLocaleString()}
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Module Scores Grid */}
        {report && (
          <div>
            <h2 className="text-lg font-semibold text-foreground mb-3">Module Scores</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
              {report.modules.map((mod) => {
                const Icon = CATEGORY_ICON_MAP[mod.category] || Cpu;
                return (
                  <Card
                    key={mod.category}
                    className={`cursor-pointer transition-all hover:shadow-md ${selectedCategory === mod.category ? "ring-2 ring-primary" : ""}`}
                    onClick={() => setSelectedCategory(selectedCategory === mod.category ? "all" : mod.category)}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between mb-2">
                        <Icon className="h-4 w-4 text-muted-foreground" />
                        <TrendIcon trend={mod.trend} />
                      </div>
                      <p className={`text-2xl font-bold ${getScoreColor(mod.score)}`}>{mod.score}</p>
                      <p className="text-xs text-muted-foreground truncate">{mod.label}</p>
                      <div className="flex items-center gap-1 mt-1.5">
                        {mod.criticalCount > 0 && (
                          <Badge variant="destructive" className="text-[10px] px-1 py-0">{mod.criticalCount} crit</Badge>
                        )}
                        {mod.issueCount > 0 && (
                          <Badge variant="secondary" className="text-[10px] px-1 py-0">{mod.issueCount}</Badge>
                        )}
                        {mod.issueCount === 0 && (
                          <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* Tabs: Issues + Copilot */}
        <Tabs defaultValue="issues" className="space-y-4">
          <TabsList>
            <TabsTrigger value="issues">
              Issues {report ? `(${filteredIssues.length})` : ""}
            </TabsTrigger>
            <TabsTrigger value="copilot">AI Copilot</TabsTrigger>
            <TabsTrigger value="history">
              History {history.length > 0 ? `(${history.length})` : ""}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="issues">
            {selectedCategory !== "all" && (
              <div className="flex items-center gap-2 mb-3">
                <Badge variant="outline" className="text-sm">
                  {CATEGORY_LABELS[selectedCategory]}
                </Badge>
                <Button variant="ghost" size="sm" onClick={() => setSelectedCategory("all")}>
                  Clear filter
                </Button>
              </div>
            )}

            <ScrollArea className="h-[500px]">
              <div className="space-y-3 pr-4">
                {filteredIssues.length === 0 && (
                  <div className="text-center py-12 text-muted-foreground">
                    <CheckCircle2 className="h-12 w-12 mx-auto mb-3 text-green-500" />
                    <p className="font-medium">No issues found</p>
                    <p className="text-sm">
                      {selectedCategory !== "all"
                        ? `${CATEGORY_LABELS[selectedCategory]} module is clean!`
                        : "All modules are performing well."}
                    </p>
                  </div>
                )}

                {filteredIssues.map((issue) => (
                  <IssueCard key={issue.id} issue={issue} onFix={(i) => {
                    const result = autoFixIssue(i);
                    if (result.fixed) {
                      toast.success(`Fixed: ${result.action}`, { description: result.details });
                      runScan("light");
                    } else {
                      toast.info(`Could not auto-fix: ${result.action}`, { description: result.details });
                    }
                  }} />
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="copilot">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  AI Quality Copilot
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Ask the copilot to analyze any page, improve listing text, generate SEO metadata,
                  rewrite content, optimize mobile layout, or generate communication templates.
                </p>
                <div className="flex gap-2">
                  <input
                    className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    placeholder="e.g. Analyze the SEO of my listing pages..."
                    value={copilotInput}
                    onChange={(e) => setCopilotInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && askCopilot()}
                  />
                  <Button onClick={askCopilot} disabled={copilotLoading || !copilotInput.trim()}>
                    {copilotLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : "Analyze"}
                  </Button>
                </div>

                {/* Quick Actions */}
                <div className="flex flex-wrap gap-2">
                  {[
                    "Audit SEO of current page",
                    "Improve mobile responsiveness",
                    "Generate listing description",
                    "Optimize payment flow",
                    "Check brand consistency",
                    "Analyze marketplace completeness",
                  ].map((q) => (
                    <Button
                      key={q}
                      variant="outline"
                      size="sm"
                      className="text-xs"
                      onClick={() => {
                        setCopilotInput(q);
                        setTimeout(askCopilot, 100);
                      }}
                    >
                      {q}
                    </Button>
                  ))}
                </div>

                {copilotReply && (
                  <div className="rounded-lg bg-muted/50 p-4 text-sm whitespace-pre-wrap">
                    {copilotReply}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  Scan History
                </CardTitle>
              </CardHeader>
              <CardContent>
                {history.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No historical scans yet. Run a backend audit to start tracking.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {history.map((h, i) => (
                      <div key={i} className="flex items-center justify-between p-3 rounded-lg border bg-card">
                        <div className="flex items-center gap-3">
                          <span className={`text-lg font-bold ${getScoreColor(h.global_score)}`}>
                            {h.global_score}
                          </span>
                          <div>
                            <p className="text-sm font-medium text-foreground">
                              {h.scan_type.charAt(0).toUpperCase() + h.scan_type.slice(1)} scan
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(h.created_at).toLocaleString()}
                            </p>
                          </div>
                        </div>
                        <Badge variant={h.total_issues > 0 ? "secondary" : "outline"}>
                          {h.total_issues} issue{h.total_issues !== 1 ? "s" : ""}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

const IssueCard = ({ issue, onFix }: { issue: AuditIssue; onFix?: (issue: AuditIssue) => void }) => {
  const Icon = CATEGORY_ICON_MAP[issue.category] || Info;

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="shrink-0 mt-0.5">
            <Icon className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <Badge className={`text-[10px] border ${SEVERITY_COLORS[issue.severity]}`}>
                {issue.severity.toUpperCase()}
              </Badge>
              <Badge variant="outline" className="text-[10px]">
                {CATEGORY_LABELS[issue.category]}
              </Badge>
              <span className="text-[10px] text-muted-foreground">
                {IMPACT_LABELS[issue.businessImpact] || issue.businessImpact}
              </span>
              {issue.autoFixable && (
                <Badge
                  className="text-[10px] bg-primary/10 text-primary border-primary/20 cursor-pointer hover:bg-primary/20"
                  onClick={() => onFix?.(issue)}
                >
                  <Zap className="h-2.5 w-2.5 mr-0.5" /> Auto-fix
                </Badge>
              )}
            </div>
            <p className="font-medium text-sm text-foreground">{issue.title}</p>
            <p className="text-xs text-muted-foreground mt-1">{issue.description}</p>
            {issue.suggestedFix && (
              <p className="text-xs text-primary/80 mt-1.5 flex items-start gap-1">
                <ChevronRight className="h-3 w-3 mt-0.5 shrink-0" />
                {issue.suggestedFix}
              </p>
            )}
            {issue.location && (
              <p className="text-[10px] text-muted-foreground mt-1">📍 {issue.location}</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default AIQualityDashboard;
