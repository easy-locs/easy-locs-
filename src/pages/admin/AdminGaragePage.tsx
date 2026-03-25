import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshCw, Wrench, ShieldAlert, Eye, EyeOff, CheckCircle, AlertTriangle, XCircle, Activity, Settings2 } from "lucide-react";
import { ENGINE_METADATA } from "@/lib/engines/engine-metadata-registry";
import { useBackendEngineStatus } from "@/hooks/useBackendEngineStatus";

type GarageLayer = "sensors" | "toolbox" | "mechanics" | "orchestrator" | "all";

const LAYER_MAP: Record<string, GarageLayer> = {
  // Sensors
  "backend-connectivity": "sensors", "entity-integrity": "sensors", "dead-flow-elimination": "sensors",
  "full-stack-linkage": "sensors", "coherence-sweep": "sensors", "data-trust-scan": "sensors",
  "shop-quality": "sensors", "journey-coherence": "sensors", "ui-ux-consistency": "sensors",
  "i18n-integrity": "sensors", "performance-audit": "sensors", "platform-cleanup": "sensors",
  "seo-check": "sensors",
  // Toolbox
  "vertical-classifier": "toolbox", "food-menu-normalizer": "toolbox", "hotel-inventory-normalizer": "toolbox",
  "service-catalog-normalizer": "toolbox", "grocery-normalizer": "toolbox", "publish-gate": "toolbox",
  "publish-gate-food": "toolbox", "publish-gate-hotel": "toolbox", "publish-gate-service": "toolbox",
  "publish-gate-grocery": "toolbox", "central-ranking-rerank": "toolbox", "adaptive-taxonomy": "toolbox",
  "auto-publish": "toolbox", "auto-unpublish": "toolbox", "visibility-optimizer": "toolbox",
  "category-mapping-sync": "toolbox", "onboarding-correction": "toolbox",
  // Mechanics
  "auto-repair": "mechanics", "shop-backend-repair": "mechanics", "module-link-repair": "mechanics",
  "entity-state-healing": "mechanics", "self-healing-scan": "mechanics", "entity-recovery": "mechanics",
  "shop-cleanup": "mechanics", "auto-fix": "mechanics",
  // Orchestrator
  "platform-orchestrator": "orchestrator", "global-orchestration": "orchestrator",
};

function getLayer(name: string): GarageLayer {
  return LAYER_MAP[name] || "toolbox";
}

const layerConfig: Record<GarageLayer, { label: string; icon: any; color: string }> = {
  sensors: { label: "🔍 Sensors", icon: Eye, color: "text-blue-400" },
  toolbox: { label: "🧰 Toolbox", icon: Settings2, color: "text-amber-400" },
  mechanics: { label: "🔧 Mechanics", icon: Wrench, color: "text-green-400" },
  orchestrator: { label: "🧠 Chief Orchestrator", icon: Activity, color: "text-purple-400" },
  all: { label: "All", icon: Activity, color: "" },
};

const statusIcon = (s: string) => {
  if (s === "ok") return <CheckCircle className="h-3 w-3 text-green-500" />;
  if (s === "warning") return <AlertTriangle className="h-3 w-3 text-yellow-500" />;
  if (s === "error") return <XCircle className="h-3 w-3 text-red-500" />;
  if (s === "idle") return <EyeOff className="h-3 w-3 text-muted-foreground" />;
  return <RefreshCw className="h-3 w-3 animate-spin text-muted-foreground" />;
};

const AdminGaragePage = () => {
  const backendStatus = useBackendEngineStatus(4000);
  const status = backendStatus;
  const [layer, setLayer] = useState<GarageLayer>("all");
  const loading = backendStatus.loading;
  const filtered = useMemo(() => layer === "all" ? status.jobs : status.jobs.filter(j => getLayer(j.name) === layer), [layer, status.jobs]);

  if (loading) return <div className="p-6 text-muted-foreground">Loading garage...</div>;

  // Stats
  const mechanics = status.jobs.filter(j => getLayer(j.name) === "mechanics");
  const sensors = status.jobs.filter(j => getLayer(j.name) === "sensors");
  const totalRepairs = mechanics.reduce((s, j) => s + j.rowsAffected, 0);
  const totalDetected = sensors.reduce((s, j) => s + j.itemsProcessed, 0);
  const errCount = status.jobs.filter(j => j.lastStatus === "error").length;
  const healthScore = Math.max(0, 100 - errCount * 5 - mechanics.filter(j => j.lastStatus === "error").length * 10);

  return (
    <div className="min-h-screen bg-background p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Wrench className="h-6 w-6" /> Garage — Atelier Intelligent
          </h1>
          <p className="text-sm text-muted-foreground">4 couches : Sensors → Toolbox → Mechanics → Orchestrator</p>
        </div>
        <Button variant="outline" size="sm">
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} /> Refresh
        </Button>
      </div>

      {/* Health Score */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card><CardContent className="p-3 text-center">
          <p className="text-xs text-muted-foreground">Health</p>
          <p className={`text-2xl font-bold ${healthScore >= 80 ? "text-green-500" : healthScore >= 50 ? "text-yellow-500" : "text-red-500"}`}>{healthScore}/100</p>
        </CardContent></Card>
        <Card><CardContent className="p-3 text-center">
          <p className="text-xs text-muted-foreground">Pannes détectées</p>
          <p className="text-2xl font-bold text-foreground">{totalDetected}</p>
        </CardContent></Card>
        <Card><CardContent className="p-3 text-center">
          <p className="text-xs text-muted-foreground">Réparations auto</p>
          <p className="text-2xl font-bold text-green-500">{totalRepairs}</p>
        </CardContent></Card>
        <Card><CardContent className="p-3 text-center">
          <p className="text-xs text-muted-foreground">Bloquées</p>
          <p className="text-2xl font-bold text-red-500">{errCount}</p>
        </CardContent></Card>
        <Card><CardContent className="p-3 text-center">
          <p className="text-xs text-muted-foreground">Engines actifs</p>
          <p className="text-2xl font-bold text-foreground">{status.totalJobs}</p>
        </CardContent></Card>
      </div>

      {/* Layer Filters */}
      <div className="flex gap-2 flex-wrap">
        {(["all", "sensors", "toolbox", "mechanics", "orchestrator"] as GarageLayer[]).map(l => {
          const conf = layerConfig[l];
          const count = l === "all" ? status.jobs.length : status.jobs.filter(j => getLayer(j.name) === l).length;
          return (
            <Button key={l} size="sm" variant={layer === l ? "default" : "outline"} onClick={() => setLayer(l)} className="gap-1">
              {conf.label} <Badge variant="secondary" className="ml-1 text-xs">{count}</Badge>
            </Button>
          );
        })}
      </div>

      {/* Engine Cards */}
      <div className="space-y-2">
        {filtered.map(job => {
          const meta = ENGINE_METADATA[job.name];
          const jobLayer = getLayer(job.name);
          const lConf = layerConfig[jobLayer];
          return (
            <Card key={job.name} className={`border-l-4 ${job.lastStatus === "error" ? "border-l-red-500" : job.lastStatus === "warning" ? "border-l-yellow-500" : job.lastStatus === "ok" ? "border-l-green-500" : "border-l-muted"}`}>
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {statusIcon(job.lastStatus)}
                    <div>
                      <p className="font-medium text-sm text-foreground">{job.name}</p>
                      <p className="text-xs text-muted-foreground">{meta?.description || ""}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">{lConf.label}</Badge>
                    {meta?.tier && <Badge variant={meta.tier === "critical" ? "destructive" : "secondary"} className="text-xs">{meta.tier}</Badge>}
                  </div>
                </div>
                {(job.summary || job.businessImpact) && (
                  <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-2 text-xs text-muted-foreground">
                    {job.itemsProcessed > 0 && <span>📊 {job.itemsProcessed} items</span>}
                    {job.rowsAffected > 0 && <span>✏️ {job.rowsAffected} rows</span>}
                    {job.summary && <span>📝 {job.summary}</span>}
                    {job.businessImpact && <span>💼 {job.businessImpact}</span>}
                  </div>
                )}
                <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                  <span>Runs: {job.runCount}</span>
                  {job.lastRun && <span>Last: {new Date(job.lastRun).toLocaleTimeString()}</span>}
                  {job.lastDetail && <span>⏱ {job.lastDetail}</span>}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default AdminGaragePage;
