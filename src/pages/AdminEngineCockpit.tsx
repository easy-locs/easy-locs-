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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Activity, AlertTriangle, CheckCircle2, Clock, Power, RefreshCw,
  Shield, Zap, XCircle, Timer, Database, ShieldAlert, Bug, Wrench,
  Eye, Radio, MessageSquare, Phone, Users, CreditCard, Hotel, Utensils
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
  total_checks: number;
  repaired_count: number;
  blocked_count: number;
  critical_count: number;
  report_json: any;
  metadata_json: any;
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

interface BrowserRepairEvent {
  id: string;
  run_id: string;
  area: string;
  flow: string;
  route: string | null;
  severity: string;
  issue_code: string | null;
  issue_label: string | null;
  detected_value: string | null;
  attempted_fix: boolean;
  fix_status: string | null;
  fix_summary: string | null;
  created_at: string;
}

interface WatchdogEntry {
  id: string;
  page_key: string;
  last_seen_ok_at: string | null;
  consecutive_failures: number;
  current_status: string;
  current_issue: string | null;
  updated_at: string;
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

type RepairFilter = "all" | "critical" | "repaired" | "blocked" | "messaging" | "calls" | "contacts" | "groups" | "wallet" | "booking" | "onboarding" | "route_dead";

export default function AdminEngineCockpit() {
  const [engines, setEngines] = useState<EngineRow[]>([]);
  const [logs, setLogs] = useState<RunLog[]>([]);
  const [scrapeRuns, setScrapeRuns] = useState<ScrapeRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "real" | "noop" | "error" | "blocked" | "browser_repair">("all");
  const [selectedEngine, setSelectedEngine] = useState<string | null>(null);
  const [repairRuns, setRepairRuns] = useState<BrowserRepairRun[]>([]);
  const [repairIssues, setRepairIssues] = useState<BrowserRepairIssue[]>([]);
  const [repairEvents, setRepairEvents] = useState<BrowserRepairEvent[]>([]);
  const [watchdog, setWatchdog] = useState<WatchdogEntry[]>([]);
  const [repairFilter, setRepairFilter] = useState<RepairFilter>("all");
  const [activeTab, setActiveTab] = useState("engines");

  const fetchData = useCallback(async () => {
    const [{ data: eng }, { data: runLogs }, { data: scrRuns }, { data: brRuns }, { data: brIssues }, { data: brEvents }, { data: wd }] = await Promise.all([
      db.from("engine_supervisor").select("*").order("engine_name"),
      db.from("engine_run_logs").select("*").order("started_at", { ascending: false }).limit(300),
      db.from("merchant_scrape_runs").select("*").order("started_at", { ascending: false }).limit(20),
      db.from("browser_repair_runs").select("*").order("started_at", { ascending: false }).limit(30),
      db.from("browser_repair_issues").select("*").order("created_at", { ascending: false }).limit(200),
      db.from("browser_repair_events").select("*").order("created_at", { ascending: false }).limit(200),
      db.from("browser_repair_watchdog").select("*").order("page_key"),
    ]);
    if (eng) setEngines(eng);
    if (runLogs) setLogs(runLogs);
    if (scrRuns) setScrapeRuns(scrRuns);
    if (brRuns) setRepairRuns(brRuns);
    if (brIssues) setRepairIssues(brIssues);
    if (brEvents) setRepairEvents(brEvents);
    if (wd) setWatchdog(wd);
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
    if (filter === "blocked") return blockedLogs.some(l => l.engine_name === e.engine_name);
    if (filter === "browser_repair") return e.engine_name === "browser-user-repair-engine";
    return true;
  });

  const engineLogs = selectedEngine ? logs.filter(l => l.engine_name === selectedEngine) : [];
  const engineBlockedLogs = selectedEngine ? blockedLogs.filter(l => l.engine_name === selectedEngine) : [];

  // Browser repair stats
  const latestRepairRun = repairRuns[0];
  const totalRepairIssues = repairIssues.length;
  const autoFixedIssues = repairIssues.filter(i => i.auto_fix_applied).length;
  const criticalIssues = repairIssues.filter(i => i.severity === "critical").length;
  const failingPages = watchdog.filter(w => w.current_status === "failing").length;

  // Filter repair issues
  const filteredRepairIssues = repairIssues.filter(i => {
    if (repairFilter === "all") return true;
    if (repairFilter === "critical") return i.severity === "critical";
    if (repairFilter === "repaired") return i.auto_fix_applied;
    if (repairFilter === "blocked") return i.verification_status === "detected" && !i.auto_fix_applied;
    if (repairFilter === "messaging") return i.flow_key.includes("messag") || i.page_key.includes("orbit");
    if (repairFilter === "calls") return i.flow_key.includes("call");
    if (repairFilter === "contacts") return i.flow_key.includes("contact") || i.flow_key.includes("search");
    if (repairFilter === "groups") return i.flow_key.includes("group");
    if (repairFilter === "wallet") return i.page_key.includes("wallet") || i.flow_key.includes("payment");
    if (repairFilter === "booking") return i.page_key.includes("travel") || i.flow_key.includes("hotel") || i.flow_key.includes("booking");
    if (repairFilter === "onboarding") return i.page_key.includes("onboarding");
    if (repairFilter === "route_dead") return i.issue_type === "broken_route";
    return true;
  });

  const statusIcon = (status: string) => {
    switch (status) {
      case "ok": case "clean": return <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />;
      case "error": case "issues_found": return <XCircle className="h-3.5 w-3.5 text-red-500" />;
      case "blocked": return <ShieldAlert className="h-3.5 w-3.5 text-orange-500" />;
      case "running": return <RefreshCw className="h-3.5 w-3.5 text-blue-500 animate-spin" />;
      case "partial": return <AlertTriangle className="h-3.5 w-3.5 text-yellow-500" />;
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
            Real-time engine health, browser repair, firewall blocks, and kill switches
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
          { label: "Real (effects)", value: realCount, icon: Database, color: "text-blue-500" },
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

      {/* Tabs: Engines | Browser Repair */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="engines" className="gap-1"><Zap className="h-3.5 w-3.5" /> Engines</TabsTrigger>
          <TabsTrigger value="browser_repair" className="gap-1"><Bug className="h-3.5 w-3.5" /> Browser Repair</TabsTrigger>
          <TabsTrigger value="watchdog" className="gap-1"><Eye className="h-3.5 w-3.5" /> Watchdog</TabsTrigger>
        </TabsList>

        {/* ═══ TAB: ENGINES ═══ */}
        <TabsContent value="engines" className="space-y-4">
          {/* Source Runs */}
          {latestScrape && (
            <Card className="border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Database className="h-4 w-4 text-primary" /> Source Runs — Deliveroo Dubai
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-3 md:grid-cols-8 gap-2 text-xs">
                {[
                  { l: "Status", v: latestScrape.status },
                  { l: "Last Run", v: timeAgo(latestScrape.started_at) },
                  { l: "Discovered", v: latestScrape.discovered_count },
                  { l: "Scraped", v: latestScrape.scraped_count },
                  { l: "Parsed", v: latestScrape.parsed_count, c: "text-blue-500" },
                  { l: "Accepted", v: latestScrape.accepted_count, c: "text-green-500" },
                  { l: "Rejected", v: latestScrape.rejected_count, c: "text-orange-500" },
                  { l: "Published", v: latestScrape.published_count, c: "text-emerald-500" },
                ].map(x => (
                  <div key={x.l} className="bg-muted/30 rounded p-2">
                    <p className="text-[10px] text-muted-foreground">{x.l}</p>
                    <p className={`font-medium ${x.c ?? ""}`}>{x.v}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Filter */}
          <div className="flex gap-2 flex-wrap">
            {(["all", "real", "noop", "error", "blocked", "browser_repair"] as const).map(f => (
              <Button key={f} variant={filter === f ? "default" : "outline"} size="sm" onClick={() => setFilter(f)} className="text-xs capitalize">
                {f === "noop" ? `No-Op (${noopCount})` : f === "real" ? `Real (${realCount})` : f === "error" ? `Errors (${errored})` : f === "blocked" ? `Blocked (${blockedCount})` : f === "browser_repair" ? `Browser Repair` : `All (${total})`}
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
                      <Card key={e.engine_name} className={`border cursor-pointer transition-colors hover:border-primary/30 ${selectedEngine === e.engine_name ? "border-primary bg-primary/5" : "border-border/40"} ${e.kill_switch ? "opacity-50" : ""}`} onClick={() => setSelectedEngine(e.engine_name)}>
                        <CardContent className="p-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 min-w-0">
                              {statusIcon(e.status)}
                              <span className="font-mono text-sm truncate">{e.engine_name}</span>
                              {(e.last_duration_ms ?? 0) === 0 && <Badge variant="outline" className="text-[9px] px-1 py-0 text-orange-500 border-orange-500/30">NO-OP</Badge>}
                              {e.kill_switch && <Badge variant="destructive" className="text-[9px] px-1 py-0">KILLED</Badge>}
                              {e.dry_run && <Badge variant="secondary" className="text-[9px] px-1 py-0">DRY-RUN</Badge>}
                              {engBlocked > 0 && <Badge className="text-[9px] px-1 py-0 bg-orange-500/20 text-orange-500 border-orange-500/30">{engBlocked} BLOCKED</Badge>}
                            </div>
                            <div className="flex items-center gap-3 text-[10px] text-muted-foreground shrink-0">
                              <span>{e.last_duration_ms ?? 0}ms</span>
                              <span>{timeAgo(e.last_run_at)}</span>
                              <span>{e.total_rows_affected ?? 0} rows</span>
                            </div>
                          </div>
                          {e.consecutive_failures > 0 && <p className="text-[10px] text-red-500 mt-1 truncate">{e.last_error_message}</p>}
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
                  <CardHeader className="pb-3"><CardTitle className="text-base font-mono">{selectedEngine}</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    {(() => {
                      const e = engines.find(x => x.engine_name === selectedEngine);
                      if (!e) return null;
                      return (
                        <>
                          <div className="space-y-3">
                            <div className="flex items-center justify-between"><span className="text-sm">Enabled</span><Switch checked={e.enabled} onCheckedChange={() => toggleEnabled(e.engine_name, e.enabled)} /></div>
                            <div className="flex items-center justify-between"><span className="text-sm text-red-500 flex items-center gap-1"><Shield className="h-3.5 w-3.5" /> Kill Switch</span><Switch checked={e.kill_switch} onCheckedChange={() => toggleKillSwitch(e.engine_name, e.kill_switch)} /></div>
                            <div className="flex items-center justify-between"><span className="text-sm">Dry Run</span><Switch checked={e.dry_run} onCheckedChange={() => toggleDryRun(e.engine_name, e.dry_run)} /></div>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            {[
                              { l: "Status", v: <span className="flex items-center gap-1">{statusIcon(e.status)} {e.status}</span> },
                              { l: "Duration", v: `${e.last_duration_ms ?? 0}ms` },
                              { l: "Total Runs", v: e.total_runs ?? 0 },
                              { l: "Rows Affected", v: e.total_rows_affected ?? 0 },
                              { l: "Failures", v: e.consecutive_failures },
                              { l: "Timeout", v: `${(e.timeout_ms ?? 30000) / 1000}s` },
                            ].map(x => (
                              <div key={x.l} className="bg-muted/30 rounded p-2">
                                <p className="text-[10px] text-muted-foreground">{x.l}</p>
                                <p className="font-medium">{x.v}</p>
                              </div>
                            ))}
                          </div>
                          {e.last_error_message && (
                            <div className="bg-red-500/10 border border-red-500/20 rounded p-2">
                              <p className="text-[10px] text-red-500">Last Error</p>
                              <p className="text-xs text-red-400 break-all">{e.last_error_message}</p>
                            </div>
                          )}
                          {engineBlockedLogs.length > 0 && (
                            <div>
                              <p className="text-xs font-medium mb-2 flex items-center gap-1 text-orange-500"><ShieldAlert className="h-3.5 w-3.5" /> Blocked ({engineBlockedLogs.length})</p>
                              <ScrollArea className="h-[150px]">
                                <div className="space-y-1.5">
                                  {engineBlockedLogs.map(l => (
                                    <div key={l.id} className="bg-orange-500/5 border border-orange-500/20 rounded p-2 text-[10px] space-y-0.5">
                                      <div className="flex justify-between"><span className="text-orange-500 font-medium">BLOCKED</span><span className="text-muted-foreground">{timeAgo(l.started_at)}</span></div>
                                      {l.effect_summary && <p className="text-orange-400">{l.effect_summary}</p>}
                                    </div>
                                  ))}
                                </div>
                              </ScrollArea>
                            </div>
                          )}
                          <div>
                            <p className="text-xs font-medium mb-2">Recent Runs ({engineLogs.length})</p>
                            <ScrollArea className="h-[200px]">
                              <div className="space-y-1">
                                {engineLogs.length === 0 ? <p className="text-xs text-muted-foreground">No run logs yet</p> : engineLogs.map(l => (
                                  <div key={l.id} className="bg-muted/20 rounded p-2 text-[10px] space-y-0.5">
                                    <div className="flex justify-between"><span className="flex items-center gap-1">{statusIcon(l.status)} {l.status}</span><span>{l.duration_ms}ms</span></div>
                                    {l.effect_summary && <p className="text-muted-foreground truncate">{l.effect_summary}</p>}
                                    {l.error_message && <p className="text-red-400 truncate">{l.error_message}</p>}
                                    <div className="flex gap-2 text-muted-foreground"><span>R:{l.rows_read}</span><span>W:{l.db_rows_affected}</span><span>FX:{l.side_effect_count}</span></div>
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
                <Card className="border-dashed"><CardContent className="p-8 text-center text-muted-foreground"><Activity className="h-8 w-8 mx-auto mb-2 opacity-30" /><p className="text-sm">Select an engine</p></CardContent></Card>
              )}
            </div>
          </div>
        </TabsContent>

        {/* ═══ TAB: BROWSER REPAIR ═══ */}
        <TabsContent value="browser_repair" className="space-y-4">
          {/* Repair Stats */}
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
            {[
              { label: "Last Run", value: latestRepairRun ? timeAgo(latestRepairRun.started_at) : "never", icon: Clock, color: "text-muted-foreground" },
              { label: "Scenarios", value: latestRepairRun?.scenario_count ?? 0, icon: Activity, color: "text-primary" },
              { label: "Pass", value: latestRepairRun?.pass_count ?? 0, icon: CheckCircle2, color: "text-green-500" },
              { label: "Fail", value: latestRepairRun?.fail_count ?? 0, icon: XCircle, color: "text-red-500" },
              { label: "Auto-Fixed", value: autoFixedIssues, icon: Wrench, color: "text-blue-500" },
              { label: "Critical", value: criticalIssues, icon: AlertTriangle, color: "text-red-500" },
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

          {/* Filter bar */}
          <div className="flex gap-1.5 flex-wrap">
            {([
              { key: "all", label: "All", icon: Activity },
              { key: "critical", label: "Critical", icon: AlertTriangle },
              { key: "repaired", label: "Auto-Fixed", icon: Wrench },
              { key: "blocked", label: "Needs Review", icon: ShieldAlert },
              { key: "messaging", label: "Messages", icon: MessageSquare },
              { key: "calls", label: "Calls", icon: Phone },
              { key: "contacts", label: "Contacts", icon: Users },
              { key: "groups", label: "Groups", icon: Users },
              { key: "wallet", label: "Wallet", icon: CreditCard },
              { key: "booking", label: "Booking", icon: Hotel },
              { key: "onboarding", label: "Onboarding", icon: Radio },
            ] as { key: RepairFilter; label: string; icon: any }[]).map(f => (
              <Button key={f.key} variant={repairFilter === f.key ? "default" : "outline"} size="sm" onClick={() => setRepairFilter(f.key)} className="text-xs gap-1">
                <f.icon className="h-3 w-3" /> {f.label}
              </Button>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Recent Runs */}
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Bug className="h-4 w-4 text-primary" /> Recent Runs</CardTitle></CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px]">
                  <div className="space-y-1.5">
                    {repairRuns.map(run => (
                      <div key={run.id} className={`rounded p-2.5 text-xs border ${run.status === "clean" ? "bg-green-500/5 border-green-500/20" : run.status === "issues_found" ? "bg-red-500/5 border-red-500/20" : "bg-muted/20 border-border/30"}`}>
                        <div className="flex justify-between items-center mb-1">
                          <span className="flex items-center gap-1 font-medium">{statusIcon(run.status)} {run.status}</span>
                          <span className="text-muted-foreground">{timeAgo(run.started_at)}</span>
                        </div>
                        <div className="grid grid-cols-5 gap-1 text-[10px]">
                          <span className="text-green-500">✓ {run.pass_count}</span>
                          <span className="text-red-500">✗ {run.fail_count}</span>
                          <span className="text-blue-500">⚡ {run.fixed_count}</span>
                          <span className="text-orange-500">⚠ {run.warning_count}</span>
                          <span>{run.duration_ms ?? 0}ms</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Issues */}
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Wrench className="h-4 w-4 text-primary" /> Issues ({filteredRepairIssues.length})</CardTitle></CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px]">
                  <div className="space-y-1">
                    {filteredRepairIssues.map(issue => (
                      <div key={issue.id} className={`rounded p-2 text-[10px] space-y-0.5 border ${issue.severity === "critical" ? "bg-red-500/5 border-red-500/20" : issue.severity === "warning" ? "bg-orange-500/5 border-orange-500/20" : "bg-muted/20 border-border/30"}`}>
                        <div className="flex justify-between items-center">
                          <span className="font-medium flex items-center gap-1">
                            {issue.severity === "critical" ? <XCircle className="h-2.5 w-2.5 text-red-500" /> : issue.severity === "warning" ? <AlertTriangle className="h-2.5 w-2.5 text-orange-500" /> : <CheckCircle2 className="h-2.5 w-2.5 text-muted-foreground" />}
                            {issue.page_key} / {issue.flow_key}
                          </span>
                          <div className="flex items-center gap-1">
                            {issue.auto_fix_applied && <Badge className="text-[8px] px-1 py-0 bg-blue-500/20 text-blue-500">AUTO-FIX</Badge>}
                            <Badge variant="outline" className="text-[8px] px-1 py-0">{issue.issue_type}</Badge>
                          </div>
                        </div>
                        <p className="text-muted-foreground">{issue.summary}</p>
                        {issue.fix_summary && <p className="text-blue-400">Fix: {issue.fix_summary}</p>}
                        <p className="text-muted-foreground">{timeAgo(issue.created_at)}</p>
                      </div>
                    ))}
                    {filteredRepairIssues.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">No issues match filter</p>}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ═══ TAB: WATCHDOG ═══ */}
        <TabsContent value="watchdog" className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card className="border-border/50">
              <CardContent className="p-3 flex items-center gap-3">
                <Eye className="h-5 w-5 text-primary" />
                <div><p className="text-xl font-bold">{watchdog.length}</p><p className="text-[10px] text-muted-foreground">Monitored Pages</p></div>
              </CardContent>
            </Card>
            <Card className="border-border/50">
              <CardContent className="p-3 flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                <div><p className="text-xl font-bold">{watchdog.filter(w => w.current_status === "ok").length}</p><p className="text-[10px] text-muted-foreground">Healthy</p></div>
              </CardContent>
            </Card>
            <Card className="border-border/50">
              <CardContent className="p-3 flex items-center gap-3">
                <XCircle className="h-5 w-5 text-red-500" />
                <div><p className="text-xl font-bold">{failingPages}</p><p className="text-[10px] text-muted-foreground">Failing</p></div>
              </CardContent>
            </Card>
            <Card className="border-border/50">
              <CardContent className="p-3 flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-orange-500" />
                <div><p className="text-xl font-bold">{watchdog.filter(w => w.consecutive_failures > 2).length}</p><p className="text-[10px] text-muted-foreground">Consecutive Fails &gt;2</p></div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Page Health Watchdog</CardTitle></CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <div className="space-y-1.5">
                  {watchdog.sort((a, b) => (b.consecutive_failures ?? 0) - (a.consecutive_failures ?? 0)).map(w => (
                    <div key={w.id} className={`rounded p-2.5 text-xs border flex justify-between items-center ${w.current_status === "ok" ? "bg-green-500/5 border-green-500/20" : "bg-red-500/5 border-red-500/20"}`}>
                      <div className="flex items-center gap-2">
                        {w.current_status === "ok" ? <CheckCircle2 className="h-3.5 w-3.5 text-green-500" /> : <XCircle className="h-3.5 w-3.5 text-red-500" />}
                        <span className="font-mono">{w.page_key}</span>
                      </div>
                      <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                        {w.consecutive_failures > 0 && <Badge variant="destructive" className="text-[8px] px-1 py-0">{w.consecutive_failures} fails</Badge>}
                        {w.current_issue && <span className="text-red-400 max-w-[200px] truncate">{w.current_issue}</span>}
                        <span>Last OK: {timeAgo(w.last_seen_ok_at)}</span>
                      </div>
                    </div>
                  ))}
                  {watchdog.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">No watchdog data yet — run the engine first</p>}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
