import SubPageShell from "@/components/layout/SubPageShell";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Wrench, Play, RotateCcw, CheckCircle, AlertTriangle, XCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { safePatchPipeline } from "@/devos/repair-center/safe-patch-pipeline";
import type { PatchRecord, PatchPhase } from "@/devos/types";

const PIPELINE_PHASES: { phase: PatchPhase; label: string }[] = [
  { phase: 'detect', label: 'Detect' },
  { phase: 'classify', label: 'Classify' },
  { phase: 'localize', label: 'Localize' },
  { phase: 'plan', label: 'Plan' },
  { phase: 'validate-preconditions', label: 'Validate' },
  { phase: 'apply', label: 'Apply' },
  { phase: 'verify', label: 'Verify' },
  { phase: 'regression-check', label: 'Regression' },
  { phase: 'log-proof', label: 'Log Proof' },
  { phase: 'accept', label: 'Accept' },
];

export default function RepairCenterPage() {
  const navigate = useNavigate();
  const [patches, setPatches] = useState<PatchRecord[]>([]);
  const [demoPatch, setDemoPatch] = useState<PatchRecord | null>(null);

  const handleCreateDemo = () => {
    const patch = safePatchPipeline.createPatch({
      domain: 'loyalty',
      description: 'Fix loyalty points calculation for cross-domain purchases',
      files: ['src/domains/loyalty/service.ts', 'src/lib/loyalty/loyalty-core.ts'],
      risks: ['Points balance inconsistency during migration'],
      rollbackPlan: 'Revert loyalty service to previous version, recalculate affected balances',
    });
    setDemoPatch(patch);
    setPatches(prev => [...prev, patch]);
  };

  const handleAdvancePatch = () => {
    if (!demoPatch) return;
    const phases: PatchPhase[] = ['classify', 'localize', 'plan', 'validate-preconditions', 'apply', 'verify', 'regression-check', 'log-proof', 'accept'];
    const currentIdx = phases.indexOf(demoPatch.phase as PatchPhase);
    const nextPhase = phases[currentIdx + 1] || phases[0];
    const updated = safePatchPipeline.advancePatch(demoPatch, nextPhase);
    setDemoPatch(updated);
    setPatches(prev => prev.map(p => p.id === updated.id ? updated : p));
  };

  const handleApplyPatch = () => {
    if (!demoPatch) return;
    const result = safePatchPipeline.applyPatch(demoPatch);
    setDemoPatch(result);
    setPatches(prev => prev.map(p => p.id === result.id ? result : p));
  };

  const statusIcon = (status: string) => {
    switch (status) {
      case 'applied': return <CheckCircle className="w-5 h-5 text-emerald-400" />;
      case 'failed': case 'rolled-back': return <XCircle className="w-5 h-5 text-red-400" />;
      default: return <AlertTriangle className="w-5 h-5 text-amber-400" />;
    }
  };

  return (
    <SubPageShell noContentPad className="bg-gray-950 text-white p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate("/builder")} className="text-gray-400 hover:text-white">
              <ArrowLeft className="w-6 h-6" />
            </button>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Wrench className="w-6 h-6 text-cyan-400" />
                Repair Center
              </h1>
              <p className="text-gray-400 text-sm">Safe Patch Pipeline — detect, validate, apply, rollback</p>
            </div>
          </div>
          <Button onClick={handleCreateDemo} variant="outline">
            <Play className="w-4 h-4 mr-2" /> Create Demo Patch
          </Button>
        </div>

        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="text-white">Pipeline Phases</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-1 overflow-x-auto pb-2">
              {PIPELINE_PHASES.map((p, i) => {
                const isActive = demoPatch?.phase === p.phase;
                const phaseIdx = PIPELINE_PHASES.findIndex(pp => pp.phase === demoPatch?.phase);
                const isPast = demoPatch && i < phaseIdx;
                return (
                  <div key={p.phase} className="flex items-center">
                    <div className={`px-3 py-2 rounded text-xs font-medium transition-colors ${
                      isActive ? 'bg-cyan-600 text-white' :
                      isPast ? 'bg-emerald-900 text-emerald-300' :
                      'bg-gray-800 text-gray-500'
                    }`}>
                      {p.label}
                    </div>
                    {i < PIPELINE_PHASES.length - 1 && (
                      <div className={`w-4 h-0.5 ${isPast ? 'bg-emerald-600' : 'bg-gray-700'}`} />
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {demoPatch && (
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                {statusIcon(demoPatch.status)}
                Active Patch
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">ID:</span>
                  <span className="text-gray-300 ml-2 font-mono text-xs">{demoPatch.id}</span>
                </div>
                <div>
                  <span className="text-gray-500">Domain:</span>
                  <span className="text-gray-300 ml-2">{demoPatch.domain}</span>
                </div>
                <div>
                  <span className="text-gray-500">Phase:</span>
                  <Badge className="ml-2 text-xs">{demoPatch.phase}</Badge>
                </div>
                <div>
                  <span className="text-gray-500">Status:</span>
                  <Badge variant={demoPatch.status === 'applied' ? 'default' : 'secondary'} className="ml-2 text-xs">
                    {demoPatch.status}
                  </Badge>
                </div>
              </div>
              <div className="text-gray-300 text-sm">{demoPatch.description}</div>
              <div className="text-gray-500 text-xs">
                Files: {demoPatch.files.join(', ')}
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={handleAdvancePatch} disabled={demoPatch.status === 'applied' || demoPatch.status === 'failed'}>
                  <Play className="w-3 h-3 mr-1" /> Advance
                </Button>
                <Button size="sm" onClick={handleApplyPatch} variant="default" disabled={demoPatch.status === 'applied'}>
                  <CheckCircle className="w-3 h-3 mr-1" /> Apply
                </Button>
                <Button size="sm" variant="destructive" onClick={() => {
                  if (demoPatch) {
                    const rolled = safePatchPipeline.rollbackPatch(demoPatch);
                    setDemoPatch(rolled);
                    setPatches(prev => prev.map(p => p.id === rolled.id ? rolled : p));
                  }
                }}>
                  <RotateCcw className="w-3 h-3 mr-1" /> Rollback
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {patches.length > 0 && (
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle className="text-white">Patch History ({patches.length})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {patches.map((p) => (
                <div key={p.id} className="flex items-center gap-3 py-2 border-b border-gray-800 text-sm">
                  {statusIcon(p.status)}
                  <span className="text-gray-300 flex-1">{p.description}</span>
                  <Badge variant="outline" className="text-xs">{p.domain}</Badge>
                  <Badge variant={p.status === 'applied' ? 'default' : 'secondary'} className="text-xs">
                    {p.status}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </SubPageShell>
  );
}
