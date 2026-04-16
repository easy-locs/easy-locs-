import SubPageShell from "@/components/layout/SubPageShell";
import { useState, useEffect } from "react";
import { useVisibilityAwareInterval } from "@/hooks/useVisibilityAwareInterval";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Shield, Activity, AlertTriangle, CheckCircle, Brain,
  Map, FileSearch, Wrench, Database, Rocket, ArrowRight,
  Power, Clock, Terminal,
} from "lucide-react";
import { proofRegistry } from "@/devos/observability/proof-registry";
import { getDevOSStatus } from "@/devos/runtime/devos-runtime";
import { devosPersistence } from "@/devos/runtime/devos-persistence";

export default function DevOSDashboardPage() {
  const navigate = useNavigate();
  const [dashboard, setDashboard] = useState<ReturnType<typeof proofRegistry.getHealthDashboard> | null>(null);
  const [engineHealth, setEngineHealth] = useState<ReturnType<typeof proofRegistry.getEngineHealthSummary> | null>(null);
  const [runtimeStatus, setRuntimeStatus] = useState<ReturnType<typeof getDevOSStatus> | null>(null);

  useEffect(() => {
    setDashboard(proofRegistry.getHealthDashboard());
    setEngineHealth(proofRegistry.getEngineHealthSummary());
    setRuntimeStatus(getDevOSStatus());
  }, []);

  useVisibilityAwareInterval(() => {
    setRuntimeStatus(getDevOSStatus());
    setDashboard(proofRegistry.getHealthDashboard());
  }, 10);

  if (!dashboard || !engineHealth) return null;

  const statusColor = {
    healthy: "bg-emerald-500",
    warning: "bg-amber-500",
    critical: "bg-red-500",
  };

  const statusBadge = {
    healthy: "default" as const,
    warning: "secondary" as const,
    critical: "destructive" as const,
  };

  const navCards = [
    { icon: Map, label: "Architecture Map", desc: "Domains, routes, dependencies", path: "/builder/architecture" },
    { icon: FileSearch, label: "Audit Center", desc: "Violations, scores, analysis", path: "/builder/audit" },
    { icon: Wrench, label: "Repair Center", desc: "Patches, validation, rollback", path: "/builder/repair" },
    { icon: Database, label: "Memory Center", desc: "Rules, incidents, proofs", path: "/builder/memory" },
    { icon: Rocket, label: "Deploy Center", desc: "Staging, production, health", path: "/builder/deploy" },
  ];

  const logLevelColor = {
    info: "text-cyan-400",
    warn: "text-amber-400",
    error: "text-red-400",
  };

  return (
    <SubPageShell noContentPad className="bg-gray-950 text-white p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Shield className="w-8 h-8 text-cyan-400" />
              Mondikat DevOS
            </h1>
            <p className="text-gray-400 mt-1">Internal Builder System — Autonomous 24/7 Runtime</p>
          </div>
          <div className="flex items-center gap-3">
            {runtimeStatus?.isRunning && (
              <Badge className="bg-emerald-900 text-emerald-300 flex items-center gap-1">
                <Power className="w-3 h-3" />
                RUNTIME ACTIVE
              </Badge>
            )}
            <Badge variant={statusBadge[dashboard.overall.status]} className="text-lg px-4 py-2">
              {dashboard.overall.status.toUpperCase()} — {dashboard.overall.score}/100
            </Badge>
          </div>
        </div>

        {runtimeStatus && (
          <Card className="bg-gray-900 border-gray-800 border-l-4 border-l-emerald-500">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${runtimeStatus.isRunning ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
                    <span className="text-gray-300 text-sm font-medium">DevOS Runtime</span>
                  </div>
                  <div className="text-gray-500 text-xs flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Last scan: {runtimeStatus.lastScan ? new Date(runtimeStatus.lastScan).toLocaleString() : 'pending...'}
                  </div>
                </div>
                <div className="flex items-center gap-4 text-xs text-gray-400">
                  <span>{runtimeStatus.totalAuditsRun} audits</span>
                  <span>{runtimeStatus.totalIncidents} incidents</span>
                  <span>{runtimeStatus.totalProofs} proofs</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="pt-6 text-center">
              <Activity className="w-8 h-8 mx-auto text-cyan-400 mb-2" />
              <div className="text-3xl font-bold">{dashboard.overall.totalDomains}</div>
              <div className="text-gray-400 text-sm">Active Domains</div>
            </CardContent>
          </Card>
          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="pt-6 text-center">
              <Shield className="w-8 h-8 mx-auto text-emerald-400 mb-2" />
              <div className="text-3xl font-bold">{dashboard.overall.totalRules}</div>
              <div className="text-gray-400 text-sm">Architecture Rules</div>
            </CardContent>
          </Card>
          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="pt-6 text-center">
              <AlertTriangle className="w-8 h-8 mx-auto text-amber-400 mb-2" />
              <div className="text-3xl font-bold">{dashboard.overall.openIncidents}</div>
              <div className="text-gray-400 text-sm">Open Incidents</div>
            </CardContent>
          </Card>
          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="pt-6 text-center">
              <Brain className="w-8 h-8 mx-auto text-purple-400 mb-2" />
              <div className="text-3xl font-bold">{engineHealth.wired}/{engineHealth.totalEngines}</div>
              <div className="text-gray-400 text-sm">Engines Wired</div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Activity className="w-5 h-5 text-cyan-400" />
                Domain Health
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {dashboard.domains.map((d) => (
                <div key={d.name} className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${statusColor[d.status]}`} />
                  <span className="text-gray-300 w-28">{d.name}</span>
                  <Progress value={d.score} className="flex-1" />
                  <span className="text-gray-400 text-sm w-12 text-right">{d.score}%</span>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Brain className="w-5 h-5 text-purple-400" />
                Engine Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {engineHealth.engines.map((e) => (
                <div key={e.name} className="flex items-center gap-3">
                  {e.status === "wired" ? (
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                  )}
                  <span className="text-gray-300 flex-1">{e.name}</span>
                  <Badge variant={e.status === "wired" ? "default" : "secondary"} className="text-xs">
                    {e.status}
                  </Badge>
                  <span className="text-gray-400 text-sm w-12 text-right">{e.health}%</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {runtimeStatus && runtimeStatus.recentLogs.length > 0 && (
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Terminal className="w-5 h-5 text-cyan-400" />
                Runtime Activity Log
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-gray-950 rounded-lg p-3 font-mono text-xs max-h-60 overflow-y-auto space-y-1">
                {runtimeStatus.recentLogs.map((log, i) => (
                  <div key={i} className="flex gap-2">
                    <span className="text-gray-600 w-20 shrink-0">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </span>
                    <span className={`w-12 shrink-0 uppercase ${logLevelColor[log.level]}`}>
                      {log.level}
                    </span>
                    <span className="text-gray-500 w-16 shrink-0">[{log.source}]</span>
                    <span className="text-gray-300">{log.message}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {navCards.map((card) => (
            <Card
              key={card.path}
              className="bg-gray-900 border-gray-800 hover:border-cyan-600 transition-colors cursor-pointer"
              onClick={() => navigate(card.path)}
            >
              <CardContent className="pt-6 text-center space-y-2">
                <card.icon className="w-8 h-8 mx-auto text-cyan-400" />
                <div className="font-semibold text-white">{card.label}</div>
                <div className="text-gray-400 text-xs">{card.desc}</div>
                <ArrowRight className="w-4 h-4 mx-auto text-gray-600" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </SubPageShell>
  );
}
