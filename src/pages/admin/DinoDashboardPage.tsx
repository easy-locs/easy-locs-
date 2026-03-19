/**
 * DINO Control Tower Dashboard — V6: Global Intelligence + Business Engine.
 */
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { runDinoAudit, type DinoReport } from "@/lib/dino/dinoEngine";
import { buildMarketProfile, computeDesignAdaptation } from "@/lib/dino/designAdaptation";
import { analyzeUxSignals, getSignalStats } from "@/lib/dino/uxAdaptationEngine";
import { analyzeLearningTrends, getLearningStats } from "@/lib/dino/learningLoop";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft, Play, Shield, AlertTriangle, CheckCircle2, XCircle,
  Wrench, FileText, Eye, BarChart3, Zap, Image, Tag, Activity,
  Database, Globe, TrendingUp, Users, Brain, Target,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function DinoDashboardPage() {
  const navigate = useNavigate();
  const [report, setReport] = useState<DinoReport | null>(null);
  const [running, setRunning] = useState(false);

  const handleRun = () => {
    setRunning(true);
    setTimeout(() => {
      setReport(runDinoAudit());
      setRunning(false);
    }, 400);
  };

  return (
    <div className="min-h-[100dvh] bg-background">
      <header className="sticky top-0 z-20 border-b border-border/40 bg-background/95 backdrop-blur px-4 py-3 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-bold">DINO Control Tower</h1>
          <p className="text-xs text-muted-foreground">Autonomous Experience Engine</p>
        </div>
        <Button onClick={handleRun} disabled={running} size="sm">
          <Play className="h-4 w-4 mr-1" />
          {running ? "Scanning…" : "Run Audit"}
        </Button>
      </header>

      <main className="max-w-4xl mx-auto pb-24">
        {!report && !running && (
          <div className="p-4">
            <Card>
              <CardContent className="py-16 text-center">
                <Shield className="h-14 w-14 mx-auto text-muted-foreground mb-4 opacity-60" />
                <p className="text-lg font-semibold mb-1">DINO Engine Ready</p>
                <p className="text-sm text-muted-foreground mb-6">
                  Press "Run Audit" to scan all pages, routes, onboarding flows, media, and categories
                </p>
                <div className="flex flex-wrap justify-center gap-2 text-xs text-muted-foreground">
                  {["Pages", "Routes", "Onboarding", "Media", "Categories", "Labels", "Layout", "Stability"].map(t => (
                    <Badge key={t} variant="secondary" className="text-[10px]">{t}</Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {running && (
          <div className="p-4">
            <Card>
              <CardContent className="py-16 text-center">
                <div className="animate-spin h-10 w-10 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4" />
                <p className="font-semibold">Scanning platform…</p>
                <p className="text-xs text-muted-foreground mt-1">Pages • Routes • Onboarding • Media • Categories • Labels</p>
              </CardContent>
            </Card>
          </div>
        )}

        {report && (
          <Tabs defaultValue="quality" className="w-full">
            <TabsList className="w-full grid grid-cols-6 mx-4 mt-3">
              <TabsTrigger value="quality" className="text-xs gap-1"><Eye className="h-3 w-3" /> Quality</TabsTrigger>
              <TabsTrigger value="domains" className="text-xs gap-1"><Globe className="h-3 w-3" /> Domains</TabsTrigger>
              <TabsTrigger value="business" className="text-xs gap-1"><TrendingUp className="h-3 w-3" /> Business</TabsTrigger>
              <TabsTrigger value="intelligence" className="text-xs gap-1"><Brain className="h-3 w-3" /> Intel</TabsTrigger>
              <TabsTrigger value="journey" className="text-xs gap-1"><BarChart3 className="h-3 w-3" /> Journey</TabsTrigger>
              <TabsTrigger value="automation" className="text-xs gap-1"><Zap className="h-3 w-3" /> Sync</TabsTrigger>
            </TabsList>

            <TabsContent value="quality" className="p-4 space-y-4">
              <QualityTab report={report} />
            </TabsContent>

            <TabsContent value="domains" className="p-4 space-y-4">
              <DomainsTab />
            </TabsContent>

            <TabsContent value="business" className="p-4 space-y-4">
              <BusinessTab />
            </TabsContent>

            <TabsContent value="intelligence" className="p-4 space-y-4">
              <IntelligenceTab />
            </TabsContent>

            <TabsContent value="journey" className="p-4 space-y-4">
              <JourneyTab report={report} />
            </TabsContent>

            <TabsContent value="automation" className="p-4 space-y-4">
              <SyncTab />
            </TabsContent>
          </Tabs>
        )}
      </main>
    </div>
  );
}

/* ─── Quality Tab ─── */
function QualityTab({ report }: { report: DinoReport }) {
  const s = report.summary;
  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Pages" value={s.totalPages} icon={<FileText className="h-4 w-4" />} />
        <StatCard label="Routes" value={s.totalRoutes} icon={<FileText className="h-4 w-4" />} />
        <StatCard label="Issues" value={s.totalIssues} icon={<AlertTriangle className="h-4 w-4" />} variant={s.totalIssues > 0 ? "warning" : "success"} />
        <StatCard label="Auto-Fixed" value={s.autoFixed} icon={<Wrench className="h-4 w-4" />} variant="success" />
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm">Issue Severity</CardTitle></CardHeader>
        <CardContent className="flex gap-2 flex-wrap">
          <Badge variant="destructive">{s.critical} Critical</Badge>
          <Badge variant="secondary">{s.major} Major</Badge>
          <Badge variant="outline">{s.minor} Minor</Badge>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Activity className="h-4 w-4" /> Onboarding Health</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center gap-2 text-sm"><CheckCircle2 className="h-4 w-4 text-primary" /><span>{report.onboardingHealth.healthy} Healthy</span></div>
          <div className="flex items-center gap-2 text-sm"><AlertTriangle className="h-4 w-4 text-accent-foreground" /><span>{report.onboardingHealth.partial} Partial</span></div>
          <div className="flex items-center gap-2 text-sm"><XCircle className="h-4 w-4 text-destructive" /><span>{report.onboardingHealth.broken} Broken</span></div>
          <p className="text-xs text-muted-foreground pt-2">
            {report.onboardingHealth.totalFlows} flows • {report.onboardingHealth.recoveryPlan.length} recovery actions
          </p>
        </CardContent>
      </Card>

      {report.onboardingHealth.recoveryPlan.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-sm">Recovery Plan</CardTitle></CardHeader>
          <CardContent className="space-y-2 max-h-64 overflow-y-auto">
            {report.onboardingHealth.recoveryPlan.map((a, i) => (
              <div key={i} className="flex items-start gap-2 text-sm border-b border-border/30 pb-2 last:border-0">
                <Badge variant={a.priority === "high" ? "destructive" : "secondary"} className="text-[10px] shrink-0">{a.priority}</Badge>
                <div className="min-w-0">
                  <p className="font-medium truncate">{a.flowName}</p>
                  <p className="text-xs text-muted-foreground">{a.description}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle className="text-sm">Verification</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm">Resolution rate: <strong>{s.verificationRate}%</strong></p>
          <p className="text-xs text-muted-foreground mt-1">Scanned at {new Date(report.scannedAt).toLocaleString()}</p>
        </CardContent>
      </Card>
    </>
  );
}

/* ─── Journey Tab ─── */
function JourneyTab({ report }: { report: DinoReport }) {
  const s = report.summary;
  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <StatCard label="Pages Scanned" value={s.totalPages} icon={<Eye className="h-4 w-4" />} />
        <StatCard label="Onboarding Flows" value={s.onboardingFlows} icon={<Activity className="h-4 w-4" />} />
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm flex items-center gap-2"><BarChart3 className="h-4 w-4" /> Journey Intelligence</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <JourneyMetric label="Drop-off Detection" status="active" />
          <JourneyMetric label="Rage Click Detection" status="active" />
          <JourneyMetric label="Pro Onboarding Tracking" status="active" />
          <JourneyMetric label="Abandoned Cart Recovery" status="ready" />
          <JourneyMetric label="Funnel Analysis" status="ready" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-sm">Event Taxonomy</CardTitle></CardHeader>
        <CardContent className="flex flex-wrap gap-1.5">
          {["PAGE_OPEN", "CTA_CLICK", "FORM_SUBMIT", "ADD_TO_CART", "BEGIN_CHECKOUT", "BOOKING_COMPLETE", "PRO_ONBOARDING_START", "RAGE_CLICK", "SAFE_FIX_APPLIED"].map(e => (
            <Badge key={e} variant="outline" className="text-[9px] font-mono">{e}</Badge>
          ))}
        </CardContent>
      </Card>
    </>
  );
}

/* ─── Domains Tab (DB-connected) ─── */
function DomainsTab() {
  const { data: scores } = useQuery({
    queryKey: ["dino-domain-scores"],
    queryFn: async () => {
      const { data } = await supabase
        .from("dino_quality_scores")
        .select("*")
        .eq("entity_type", "service")
        .order("updated_at", { ascending: false })
        .limit(20);
      return data ?? [];
    },
    staleTime: 30_000,
  });

  const { data: recentAudits } = useQuery({
    queryKey: ["dino-recent-audits"],
    queryFn: async () => {
      const { data } = await supabase
        .from("dino_page_audits")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(15);
      return data ?? [];
    },
    staleTime: 30_000,
  });

  return (
    <>
      <Card>
        <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Database className="h-4 w-4" /> Quality by Service</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {(scores ?? []).map((s: any) => (
            <div key={s.id} className="flex items-center justify-between text-sm border-b border-border/30 pb-2 last:border-0">
              <span className="font-medium">{s.entity_id || s.route}</span>
              <div className="flex gap-2 items-center">
                <Badge variant={s.total_score >= 80 ? "default" : "destructive"} className="text-[10px]">
                  {s.total_score}/100
                </Badge>
                <span className="text-[10px] text-muted-foreground">
                  UI:{s.ui_score} UX:{s.ux_score} Media:{s.media_score}
                </span>
              </div>
            </div>
          ))}
          {(!scores || scores.length === 0) && <p className="text-sm text-muted-foreground">No domain scores yet. Run a domain audit to generate.</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-sm">Recent Page Audits</CardTitle></CardHeader>
        <CardContent className="space-y-2 max-h-64 overflow-y-auto">
          {(recentAudits ?? []).map((a: any) => (
            <div key={a.id} className="text-sm border-b border-border/30 pb-2 last:border-0">
              <p className="font-medium truncate">{a.route}</p>
              <p className="text-[10px] text-muted-foreground">{a.page_key} • {a.actor_type} • {new Date(a.created_at).toLocaleString()}</p>
            </div>
          ))}
          {(!recentAudits || recentAudits.length === 0) && <p className="text-sm text-muted-foreground">No page audits yet. Navigate pages to generate beacons.</p>}
        </CardContent>
      </Card>
    </>
  );
}

/* ─── Sync Tab (DB-connected) ─── */
function SyncTab() {
  const { data: jobs } = useQuery({
    queryKey: ["dino-sync-jobs"],
    queryFn: async () => {
      const { data } = await supabase
        .from("dino_sync_jobs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);
      return data ?? [];
    },
    staleTime: 15_000,
  });

  const { data: notifications } = useQuery({
    queryKey: ["dino-notifications"],
    queryFn: async () => {
      const { data } = await supabase
        .from("dino_notifications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);
      return data ?? [];
    },
    staleTime: 15_000,
  });

  const { data: issues } = useQuery({
    queryKey: ["dino-issues-status"],
    queryFn: async () => {
      const { data } = await supabase
        .from("dino_issues")
        .select("id, status")
        .limit(500);
      return data ?? [];
    },
    staleTime: 15_000,
  });

  const open = (issues ?? []).filter((i: any) => i.status === "open").length;
  const fixed = (issues ?? []).filter((i: any) => i.status === "fixed").length;
  const pending = (jobs ?? []).filter((j: any) => j.status === "pending").length;
  const done = (jobs ?? []).filter((j: any) => j.status === "done").length;

  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <StatCard label="Open Issues" value={open} icon={<AlertTriangle className="h-4 w-4" />} variant="warning" />
        <StatCard label="Fixed Issues" value={fixed} icon={<CheckCircle2 className="h-4 w-4" />} variant="success" />
        <StatCard label="Pending Jobs" value={pending} icon={<Database className="h-4 w-4" />} />
        <StatCard label="Completed Jobs" value={done} icon={<Wrench className="h-4 w-4" />} variant="success" />
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm">Recent Sync Jobs</CardTitle></CardHeader>
        <CardContent className="space-y-2 max-h-48 overflow-y-auto">
          {(jobs ?? []).slice(0, 10).map((j: any) => (
            <div key={j.id} className="flex items-center justify-between text-sm border-b border-border/30 pb-1 last:border-0">
              <span className="truncate font-medium">{j.job_type}</span>
              <Badge variant={j.status === "done" ? "default" : j.status === "failed" ? "destructive" : "secondary"} className="text-[10px]">{j.status}</Badge>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-sm">Notifications Queue</CardTitle></CardHeader>
        <CardContent className="space-y-2 max-h-48 overflow-y-auto">
          {(notifications ?? []).slice(0, 10).map((n: any) => (
            <div key={n.id} className="flex items-center justify-between text-sm border-b border-border/30 pb-1 last:border-0">
              <span className="truncate">{n.template_key}</span>
              <Badge variant={n.status === "sent" ? "default" : "secondary"} className="text-[10px]">{n.channel} • {n.status}</Badge>
            </div>
          ))}
          {(!notifications || notifications.length === 0) && <p className="text-sm text-muted-foreground">No notifications queued.</p>}
        </CardContent>
      </Card>
    </>
  );
}

/* ─── Automation Tab (static from report) ─── */
function AutomationTab({ report }: { report: DinoReport }) {
  const s = report.summary;
  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <StatCard label="Auto-Fixed" value={s.autoFixed} icon={<Wrench className="h-4 w-4" />} variant="success" />
        <StatCard label="Patches Needed" value={s.patchRequired} icon={<FileText className="h-4 w-4" />} variant="warning" />
        <StatCard label="Manual Review" value={s.manualRequired} icon={<AlertTriangle className="h-4 w-4" />} />
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Image className="h-4 w-4" /> Media Normalization</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p className="text-muted-foreground">Profiles: restaurant_cover, product_card, property_card, avatar, banner, radar_preview</p>
          <p>Status: <Badge variant="secondary" className="text-[10px]">Ready</Badge></p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Tag className="h-4 w-4" /> Category Cleanup</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p className="text-muted-foreground">Auto-detects malformed labels, near-duplicates, orphan categories</p>
          <p>Status: <Badge variant="secondary" className="text-[10px]">Ready</Badge></p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Zap className="h-4 w-4" /> Messaging Automation</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          <AutomationRow label="Onboarding Reminder" status="ready" />
          <AutomationRow label="Missing Photo Reminder" status="ready" />
          <AutomationRow label="Abandoned Cart Recovery" status="ready" />
          <AutomationRow label="Review Request" status="planned" />
          <AutomationRow label="Seasonal Campaign" status="planned" />
        </CardContent>
      </Card>

      {report.patches.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-sm">Patch Proposals ({report.patches.length})</CardTitle></CardHeader>
          <CardContent className="space-y-2 max-h-48 overflow-y-auto">
            {report.patches.slice(0, 10).map((p, i) => (
              <div key={i} className="text-sm border-b border-border/30 pb-2 last:border-0">
                <p className="font-medium truncate">{p.title}</p>
                <p className="text-xs text-muted-foreground">{p.rootCause}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </>
  );
}

/* ─── Shared Components ─── */
function StatCard({ label, value, icon, variant }: { label: string; value: number; icon: React.ReactNode; variant?: "success" | "warning" }) {
  return (
    <Card>
      <CardContent className="py-3 px-4 flex items-center gap-3">
        <div className={`p-2 rounded-lg ${variant === "warning" ? "bg-destructive/10 text-destructive" : variant === "success" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
          {icon}
        </div>
        <div>
          <p className="text-xl font-bold">{value}</p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function JourneyMetric({ label, status }: { label: string; status: "active" | "ready" | "planned" }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span>{label}</span>
      <Badge variant={status === "active" ? "default" : "secondary"} className="text-[10px]">
        {status}
      </Badge>
    </div>
  );
}

function AutomationRow({ label, status }: { label: string; status: "active" | "ready" | "planned" }) {
  return (
    <div className="flex items-center justify-between">
      <span>{label}</span>
      <Badge variant={status === "active" ? "default" : "outline"} className="text-[10px]">
        {status}
      </Badge>
    </div>
  );
}
