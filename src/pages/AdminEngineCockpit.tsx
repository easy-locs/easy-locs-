/**
 * Admin Engine Cockpit — Real-time engine health, logs, kill switches, blocked runs, browser repair.
 */
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Activity, AlertTriangle, CheckCircle2, Clock, Power, RefreshCw,
  Shield, Zap, XCircle, Timer, Database, ShieldAlert, Bug, Wrench
} from "lucide-react";

const db = supabase as any;

interface BrowserRepairRun {
  id: string;
  started_at: string;
  finished_at: string | null;
  status: string;
  scenario_count: number;
  pass_count: number;
  fail_count: number;
  fixed_count: number;
  warning_count: number;
  duration_ms: number | null;
  report_json: any;
}

interface BrowserRepairIssue {
  id: string;
  run_id: string;
  page_key: string;
  flow_key: string;
  severity: string;
  issue_type: string;
  summary: string;
  auto_fix_applied: boolean;
  fix_summary: string | null;
  verification_status: string;
  created_at: string;
}

interface EngineRow {
  engine_name: string;
  status: string;
  enabled: boolean;
  kill_switch: boolean;
  dry_run: boolean;
  last_run_at: string | null;
  last_success_at: string | null;
  last_error_at: string | null;
  last_error_message: string | null;
  last_duration_ms: number | null;
  consecutive_failures: number;
  total_runs: number;
  total_rows_affected: number;
  success_rate: number;
  timeout_ms: number;
  engine_tier: string | null;
  runtime_class: string | null;
}

interface RunLog {
  id: string;
  engine_name: string;
  started_at: string;
  finished_at: string | null;
  duration_ms: number | null;
  status: string;
  effect_summary: string | null;
  db_rows_affected: number;
  rows_read: number;
  side_effect_count: number;
  error_message: string | null;
  trigger_source: string;
  metadata_json: Record<string, any> | null;
}

interface ScrapeRun {
  id: string;
  engine_name: string;
  source: string;
  region: string;
  vertical: string;
  started_at: string;
  finished_at: string | null;
  status: string;
  discovered_count: number;
  scraped_count: number;
  parsed_count: number;
  accepted_count: number;
  rejected_count: number;
  published_count: number;
  error_message: string | null;
}

export default function AdminEngineCockpit() {
  const [engines, setEngines] = useState<EngineRow[]>([]);
  const [logs, setLogs] = useState<RunLog[]>([]);
  const [scrapeRuns, setScrapeRuns] = useState<ScrapeRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "real" | "noop" | "error" | "blocked" | "browser_repair">("all");
  const [selectedEngine, setSelectedEngine] = useState<string | null>(null);
  const [repairRuns, setRepairRuns] = useState<BrowserRepairRun[]>([]);
  const [repairIssues, setRepairIssues] = useState<BrowserRepairIssue[]>([]);

  const fetchData = useCallback(async () => {
    const [{ data: eng }, { data: runLogs }, { data: scrRuns }, { data: brRuns }, { data: brIssues }] = await Promise.all([
      db.from("engine_supervisor").select("*").order("engine_name"),
      db.from("engine_run_logs").select("*").order("started_at", { ascending: false }).limit(300),
      db.from("merchant_scrape_runs").select("*").order("started_at", { ascending: false }).limit(20),
      db.from("browser_repair_runs").select("*").order("started_at", { ascending: false }).limit(20),
      db.from("browser_repair_issues").select("*").order("created_at", { ascending: false }).limit(100),
    ]);
    if (eng) setEngines(eng);
    if (runLogs) setLogs(runLogs);
    if (scrRuns) setScrapeRuns(scrRuns);
    if (brRuns) setRepairRuns(brRuns);
    if (brIssues) setRepairIssues(brIssues);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
    const timer = setInterval(fetchData, 10000);
    return () => clearInterval(timer);
  }, [fetchData]);

  const toggleKillSwitch = async (name: string, current: boolean) => {
    await db.from("engine_supervisor").update({ kill_switch: !current }).eq("engine_name", name);
    fetchData();
  };

  const toggleEnabled = async (name: string, current: boolean) => {
    await db.from("engine_supervisor").update({ enabled: !current }).eq("engine_name", name);
    fetchData();
  };

  const toggleDryRun = async (name: string, current: boolean) => {
    await db.from("engine_supervisor").update({ dry_run: !current }).eq("engine_name", name);
    fetchData();
  };

  // Stats
  const total = engines.length;
  const healthy = engines.filter(e => e.status === "ok" && e.enabled).length;
  const errored = engines.filter(e => e.status === "error").length;
  const killed = engines.filter(e => e.kill_switch).length;
  const noopCount = engines.filter(e => (e.last_duration_ms ?? 0) === 0).length;
  const realCount = engines.filter(e => (e.total_rows_affected ?? 0) > 0).length;
  const blockedCount = logs.filter(l => l.status === "blocked").length;
  const totalRuns = logs.length;

  const blockedLogs = logs.filter(l => l.status === "blocked");

  const filtered = engines.filter(e => {
    if (filter === "real") return (e.total_rows_affected ?? 0) > 0 || (e.last_duration_ms ?? 0) > 100;
    if (filter === "noop") return (e.last_duration_ms ?? 0) === 0;
    if (filter === "error") return e.status === "error" || e.consecutive_failures > 0;
    if (filter === "blocked") {
      return blockedLogs.some(l => l.engine_name === e.engine_name);
    }
    return true;
  });

  const engineLogs = selectedEngine ? logs.filter(l => l.engine_name === selectedEngine) : [];
  const engineBlockedLogs = selectedEngine ? blockedLogs.filter(l => l.engine_name === selectedEngine) : [];

  const statusIcon = (status: string) => {
    switch (status) {
      case "ok": return <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />;
      case "error": return <XCircle className="h-3.5 w-3.5 text-red-500" />;
      case "blocked": return <ShieldAlert className="h-3.5 w-3.5 text-orange-500" />;
      case "running": return <RefreshCw className="h-3.5 w-3.5 text-blue-500 animate-spin" />;
      default: return <Clock className="h-3.5 w-3.5 text-muted-foreground" />;
    }
  };

  const timeAgo = (ts: string | null) => {
    if (!ts) return "never";
    const diff = Date.now() - new Date(ts).getTime();
    if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`;
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    return `${Math.floor(diff / 3600000)}h ago`;
  };

  // Latest scrape run for deliveroo/dubai
  const latestScrape = scrapeRuns.find(r => r.source === "deliveroo" && r.region === "dubai");

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Activity className="h-6 w-6 text-primary" />
            Engine Cockpit
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Real-time engine health, execution logs, firewall blocks, and kill switches
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchData}>
          <RefreshCw className="h-4 w-4 mr-1" /> Refresh
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-7 gap-3">
        {[
          { label: "Total Engines", value: total, icon: Zap, color: "text-primary" },
          { label: "Healthy", value: healthy, icon: CheckCircle2, color: "text-green-500" },
          { label: "Errors", value: errored, icon: AlertTriangle, color: "text-red-500" },
          { label: "Blocked", value: blockedCount, icon: ShieldAlert, color: "text-orange-500" },
          { label: "Kill Switched", value: killed, icon: Power, color: "text-orange-500" },
          { label: "Real (with effects)", value: realCount, icon: Database, color: "text-blue-500" },
          { label: "Run Logs", value: totalRuns, icon: Timer, color: "text-purple-500" },
        ].map(s => (
          <Card key={s.label} className="border-border/50">
            <CardContent className="p-3 flex items-center gap-3">
              <s.icon className={`h-5 w-5 ${s.color}`} />
              <div>
                <p className="text-xl font-bold">{s.value}</p>
                <p className="text-[10px] text-muted-foreground leading-tight">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Source Runs Panel */}
      {latestScrape && (
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Database className="h-4 w-4 text-primary" />
              Source Runs — Deliveroo Dubai
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-3 md:grid-cols-9 gap-2 text-xs">
            <div className="bg-muted/30 rounded p-2">
              <p className="text-[10px] text-muted-foreground">Status</p>
              <p className="font-medium">{latestScrape.status}</p>
            </div>
            <div className="bg-muted/30 rounded p-2">
              <p className="text-[10px] text-muted-foreground">Last Run</p>
              <p className="font-medium">{timeAgo(latestScrape.started_at)}</p>
            </div>
            <div className="bg-muted/30 rounded p-2">
              <p className="text-[10px] text-muted-foreground">Discovered</p>
              <p className="font-medium">{latestScrape.discovered_count}</p>
            </div>
            <div className="bg-muted/30 rounded p-2">
              <p className="text-[10px] text-muted-foreground">Scraped</p>
              <p className="font-medium">{latestScrape.scraped_count}</p>
            </div>
            <div className="bg-muted/30 rounded p-2">
              <p className="text-[10px] text-muted-foreground">Parsed</p>
              <p className="font-medium text-blue-500">{latestScrape.parsed_count}</p>
            </div>
            <div className="bg-muted/30 rounded p-2">
              <p className="text-[10px] text-muted-foreground">Accepted</p>
              <p className="font-medium text-green-500">{latestScrape.accepted_count}</p>
            </div>
            <div className="bg-muted/30 rounded p-2">
              <p className="text-[10px] text-muted-foreground">Rejected</p>
              <p className="font-medium text-orange-500">{latestScrape.rejected_count}</p>
            </div>
            <div className="bg-muted/30 rounded p-2">
              <p className="text-[10px] text-muted-foreground">Published</p>
              <p className="font-medium text-emerald-500">{latestScrape.published_count}</p>
            </div>
            {latestScrape.error_message && (
              <div className="bg-red-500/10 rounded p-2 col-span-full">
                <p className="text-[10px] text-red-500">{latestScrape.error_message}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Filter */}
      <div className="flex gap-2 flex-wrap">
        {(["all", "real", "noop", "error", "blocked"] as const).map(f => (
          <Button
            key={f}
            variant={filter === f ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter(f)}
            className="text-xs capitalize"
          >
            {f === "noop" ? `No-Op (${noopCount})`
              : f === "real" ? `Real (${realCount})`
              : f === "error" ? `Errors (${errored})`
              : f === "blocked" ? `Blocked (${blockedCount})`
              : `All (${total})`}
          </Button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Engine List */}
        <div className="lg:col-span-2">
          <ScrollArea className="h-[600px]">
            <div className="space-y-1.5">
              {filtered.map(e => {
                const engBlocked = blockedLogs.filter(l => l.engine_name === e.engine_name).length;
                return (
                  <Card
                    key={e.engine_name}
                    className={`border cursor-pointer transition-colors hover:border-primary/30 ${
                      selectedEngine === e.engine_name ? "border-primary bg-primary/5" : "border-border/40"
                    } ${e.kill_switch ? "opacity-50" : ""}`}
                    onClick={() => setSelectedEngine(e.engine_name)}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 min-w-0">
                          {statusIcon(e.status)}
                          <span className="font-mono text-sm truncate">{e.engine_name}</span>
                          {(e.last_duration_ms ?? 0) === 0 && (
                            <Badge variant="outline" className="text-[9px] px-1 py-0 text-orange-500 border-orange-500/30">NO-OP</Badge>
                          )}
                          {e.kill_switch && (
                            <Badge variant="destructive" className="text-[9px] px-1 py-0">KILLED</Badge>
                          )}
                          {e.dry_run && (
                            <Badge variant="secondary" className="text-[9px] px-1 py-0">DRY-RUN</Badge>
                          )}
                          {engBlocked > 0 && (
                            <Badge className="text-[9px] px-1 py-0 bg-orange-500/20 text-orange-500 border-orange-500/30">
                              {engBlocked} BLOCKED
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-[10px] text-muted-foreground shrink-0">
                          <span>{e.last_duration_ms ?? 0}ms</span>
                          <span>{timeAgo(e.last_run_at)}</span>
                          <span>{e.total_rows_affected ?? 0} rows</span>
                        </div>
                      </div>
                      {e.consecutive_failures > 0 && (
                        <p className="text-[10px] text-red-500 mt-1 truncate">{e.last_error_message}</p>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </ScrollArea>
        </div>

        {/* Detail Panel */}
        <div>
          {selectedEngine ? (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-mono">{selectedEngine}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {(() => {
                  const e = engines.find(x => x.engine_name === selectedEngine);
                  if (!e) return null;
                  return (
                    <>
                      {/* Controls */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Enabled</span>
                          <Switch checked={e.enabled} onCheckedChange={() => toggleEnabled(e.engine_name, e.enabled)} />
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-red-500 flex items-center gap-1">
                            <Shield className="h-3.5 w-3.5" /> Kill Switch
                          </span>
                          <Switch checked={e.kill_switch} onCheckedChange={() => toggleKillSwitch(e.engine_name, e.kill_switch)} />
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Dry Run</span>
                          <Switch checked={e.dry_run} onCheckedChange={() => toggleDryRun(e.engine_name, e.dry_run)} />
                        </div>
                      </div>

                      {/* Stats */}
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="bg-muted/30 rounded p-2">
                          <p className="text-[10px] text-muted-foreground">Status</p>
                          <p className="font-medium flex items-center gap-1">{statusIcon(e.status)} {e.status}</p>
                        </div>
                        <div className="bg-muted/30 rounded p-2">
                          <p className="text-[10px] text-muted-foreground">Duration</p>
                          <p className="font-medium">{e.last_duration_ms ?? 0}ms</p>
                        </div>
                        <div className="bg-muted/30 rounded p-2">
                          <p className="text-[10px] text-muted-foreground">Total Runs</p>
                          <p className="font-medium">{e.total_runs ?? 0}</p>
                        </div>
                        <div className="bg-muted/30 rounded p-2">
                          <p className="text-[10px] text-muted-foreground">Rows Affected</p>
                          <p className="font-medium">{e.total_rows_affected ?? 0}</p>
                        </div>
                        <div className="bg-muted/30 rounded p-2">
                          <p className="text-[10px] text-muted-foreground">Failures</p>
                          <p className="font-medium">{e.consecutive_failures}</p>
                        </div>
                        <div className="bg-muted/30 rounded p-2">
                          <p className="text-[10px] text-muted-foreground">Timeout</p>
                          <p className="font-medium">{(e.timeout_ms ?? 30000) / 1000}s</p>
                        </div>
                      </div>

                      {e.last_error_message && (
                        <div className="bg-red-500/10 border border-red-500/20 rounded p-2">
                          <p className="text-[10px] text-red-500">Last Error</p>
                          <p className="text-xs text-red-400 break-all">{e.last_error_message}</p>
                        </div>
                      )}

                      {/* Blocked Runs Section */}
                      {engineBlockedLogs.length > 0 && (
                        <div>
                          <p className="text-xs font-medium mb-2 flex items-center gap-1 text-orange-500">
                            <ShieldAlert className="h-3.5 w-3.5" />
                            Blocked Runs ({engineBlockedLogs.length})
                          </p>
                          <ScrollArea className="h-[180px]">
                            <div className="space-y-1.5">
                              {engineBlockedLogs.map(l => (
                                <div key={l.id} className="bg-orange-500/5 border border-orange-500/20 rounded p-2 text-[10px] space-y-0.5">
                                  <div className="flex justify-between">
                                    <span className="flex items-center gap-1 text-orange-500 font-medium">
                                      <ShieldAlert className="h-2.5 w-2.5" /> BLOCKED
                                    </span>
                                    <span className="text-muted-foreground">{timeAgo(l.started_at)}</span>
                                  </div>
                                  {l.effect_summary && (
                                    <p className="text-orange-400">{l.effect_summary}</p>
                                  )}
                                  {l.metadata_json?.firewall_rule && (
                                    <p className="text-muted-foreground">
                                      Rule: <span className="text-orange-400 font-mono">{l.metadata_json.firewall_rule}</span>
                                    </p>
                                  )}
                                  {l.metadata_json?.entity_id && (
                                    <p className="text-muted-foreground">
                                      Entity: <span className="font-mono">{l.metadata_json.entity_id}</span>
                                    </p>
                                  )}
                                  {l.metadata_json?.table && (
                                    <p className="text-muted-foreground">
                                      Table: <span className="font-mono">{l.metadata_json.table}</span>
                                    </p>
                                  )}
                                  {l.metadata_json?.reasons && Array.isArray(l.metadata_json.reasons) && (
                                    <div className="text-muted-foreground">
                                      {l.metadata_json.reasons.map((r: string, i: number) => (
                                        <p key={i} className="text-orange-400">• {r}</p>
                                      ))}
                                    </div>
                                  )}
                                  <p className="text-muted-foreground">Trigger: {l.trigger_source}</p>
                                </div>
                              ))}
                            </div>
                          </ScrollArea>
                        </div>
                      )}

                      {/* Recent Logs */}
                      <div>
                        <p className="text-xs font-medium mb-2">Recent Runs ({engineLogs.length})</p>
                        <ScrollArea className="h-[200px]">
                          <div className="space-y-1">
                            {engineLogs.length === 0 ? (
                              <p className="text-xs text-muted-foreground">No run logs yet</p>
                            ) : engineLogs.map(l => (
                              <div key={l.id} className="bg-muted/20 rounded p-2 text-[10px] space-y-0.5">
                                <div className="flex justify-between">
                                  <span className="flex items-center gap-1">
                                    {statusIcon(l.status)}
                                    {l.status}
                                  </span>
                                  <span>{l.duration_ms}ms</span>
                                </div>
                                {l.effect_summary && <p className="text-muted-foreground truncate">{l.effect_summary}</p>}
                                {l.error_message && <p className="text-red-400 truncate">{l.error_message}</p>}
                                <div className="flex gap-2 text-muted-foreground">
                                  <span>R:{l.rows_read}</span>
                                  <span>W:{l.db_rows_affected}</span>
                                  <span>FX:{l.side_effect_count}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                      </div>
                    </>
                  );
                })()}
              </CardContent>
            </Card>
          ) : (
            <Card className="border-dashed">
              <CardContent className="p-8 text-center text-muted-foreground">
                <Activity className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Select an engine to view details</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
