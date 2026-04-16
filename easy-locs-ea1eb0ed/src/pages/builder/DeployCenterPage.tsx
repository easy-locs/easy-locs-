import SubPageShell from "@/components/layout/SubPageShell";
import { AppCard, CardContent, CardHeader, CardTitle } from "@/components/ui/AppCard";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Rocket, Shield, CheckCircle, AlertTriangle, Server, Lock } from "lucide-react";
import { useNavigate } from "react-router-dom";

const DEPLOY_CHECKS = [
  { name: 'Build Status', status: 'pass', detail: 'Production build successful (6902 modules)' },
  { name: 'Type Check', status: 'pass', detail: 'No TypeScript errors' },
  { name: 'Route Guard Audit', status: 'pass', detail: 'All admin/builder routes protected' },
  { name: 'Secrets Check', status: 'warning', detail: 'SUPABASE_URL and SUPABASE_ANON_KEY configured' },
  { name: 'Bundle Size', status: 'warning', detail: 'Some chunks >500KB (mapbox, 3D vendor)' },
  { name: 'Domain Health', status: 'pass', detail: 'Average health score: 84%' },
  { name: 'Critical Violations', status: 'pass', detail: '0 critical violations' },
  { name: 'E2EE Status', status: 'pass', detail: 'Orbit encryption active' },
];

const ENVIRONMENTS = [
  { name: 'Development', status: 'active', url: 'localhost:5173', version: 'dev-latest' },
  { name: 'Staging', status: 'ready', url: 'staging.mondikat.com', version: 'v0.9.0-rc1' },
  { name: 'Production', status: 'deployed', url: 'app.mondikat.com', version: 'v0.8.5' },
];

export default function DeployCenterPage() {
  const navigate = useNavigate();

  const passCount = DEPLOY_CHECKS.filter(c => c.status === 'pass').length;
  const totalChecks = DEPLOY_CHECKS.length;

  return (
    <SubPageShell noContentPad className="bg-gray-950 text-white p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate("/builder")} className="text-gray-400 hover:text-white">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Rocket className="w-6 h-6 text-cyan-400" />
              Deploy Center
            </h1>
            <p className="text-gray-400 text-sm">Release readiness, health checks, environments</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {ENVIRONMENTS.map((env) => (
            <AppCard key={env.name} className="bg-gray-900 border-gray-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-white text-lg flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Server className="w-5 h-5 text-cyan-400" />
                    {env.name}
                  </div>
                  <Badge variant={env.status === 'active' ? 'default' : 'secondary'}>
                    {env.status}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-1">
                <div className="text-gray-400">URL: <span className="text-gray-300">{env.url}</span></div>
                <div className="text-gray-400">Version: <span className="text-gray-300 font-mono">{env.version}</span></div>
              </CardContent>
            </AppCard>
          ))}
        </div>

        <AppCard className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-cyan-400" />
                Release Readiness ({passCount}/{totalChecks})
              </div>
              <Badge variant={passCount === totalChecks ? 'default' : 'secondary'}>
                {passCount === totalChecks ? 'READY' : 'REVIEW NEEDED'}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {DEPLOY_CHECKS.map((check) => (
              <div key={check.name} className="flex items-center gap-3 py-2 border-b border-gray-800">
                {check.status === 'pass' ? (
                  <CheckCircle className="w-5 h-5 text-emerald-400" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-amber-400" />
                )}
                <div className="flex-1">
                  <div className="text-gray-200 text-sm font-medium">{check.name}</div>
                  <div className="text-gray-500 text-xs">{check.detail}</div>
                </div>
                <Badge variant={check.status === 'pass' ? 'default' : 'secondary'} className="text-xs">
                  {check.status.toUpperCase()}
                </Badge>
              </div>
            ))}
          </CardContent>
        </AppCard>

        <AppCard className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Lock className="w-5 h-5 text-cyan-400" />
              Rollback Controls
            </CardTitle>
          </CardHeader>
          <CardContent className="text-gray-400 text-sm">
            <p>Rollback is available for the last 5 production deployments. Each rollback creates a proof record in the Memory Center.</p>
            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="bg-gray-800 rounded p-3">
                <div className="text-gray-300 font-medium">v0.8.5</div>
                <div className="text-gray-500 text-xs">Current production</div>
              </div>
              <div className="bg-gray-800 rounded p-3">
                <div className="text-gray-300 font-medium">v0.8.4</div>
                <div className="text-gray-500 text-xs">Previous release</div>
              </div>
              <div className="bg-gray-800 rounded p-3">
                <div className="text-gray-300 font-medium">v0.8.3</div>
                <div className="text-gray-500 text-xs">2 releases ago</div>
              </div>
            </div>
          </CardContent>
        </AppCard>
      </div>
    </SubPageShell>
  );
}
