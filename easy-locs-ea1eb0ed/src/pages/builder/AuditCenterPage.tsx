import SubPageShell from "@/components/layout/SubPageShell";
import { useState, useEffect } from "react";
import { AppCard, CardContent, CardHeader, CardTitle } from "@/components/ui/AppCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, FileSearch, AlertTriangle, CheckCircle, RefreshCw, Activity } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { auditEngine } from "@/devos/audit/audit-engine";
import { proofRegistry } from "@/devos/observability/proof-registry";
import type { AuditResult, Violation } from "@/devos/types";

export default function AuditCenterPage() {
  const navigate = useNavigate();
  const [audits, setAudits] = useState<AuditResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    setAudits(auditEngine.runFullAudit());
  }, []);

  const handleRunAudit = () => {
    setIsRunning(true);
    setTimeout(() => {
      const results = auditEngine.runFullAudit();
      setAudits(results);
      proofRegistry.logProof({
        type: 'audit',
        summary: `Full audit completed: ${results.length} checks, ${results.reduce((s, r) => s + r.violations.length, 0)} violations`,
        details: { auditCount: results.length },
        actor: 'audit-center',
      });
      setIsRunning(false);
    }, 1000);
  };

  const totalViolations = audits.reduce((s, a) => s + a.violations.length, 0);
  const avgScore = audits.length > 0 ? Math.round(audits.reduce((s, a) => s + a.score, 0) / audits.length) : 0;

  const severityColor = {
    critical: "text-red-400 bg-red-950",
    high: "text-orange-400 bg-orange-950",
    medium: "text-amber-400 bg-amber-950",
    low: "text-blue-400 bg-blue-950",
    info: "text-gray-400 bg-gray-800",
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
                <FileSearch className="w-6 h-6 text-cyan-400" />
                Audit Center
              </h1>
              <p className="text-gray-400 text-sm">Violations, scores, structural analysis</p>
            </div>
          </div>
          <Button onClick={handleRunAudit} disabled={isRunning} variant="outline">
            <RefreshCw className={`w-4 h-4 mr-2 ${isRunning ? "animate-spin" : ""}`} />
            {isRunning ? "Running..." : "Run Full Audit"}
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <AppCard className="bg-gray-900 border-gray-800">
            <CardContent className="pt-6 text-center">
              <Activity className="w-8 h-8 mx-auto text-cyan-400 mb-2" />
              <div className="text-3xl font-bold">{avgScore}</div>
              <div className="text-gray-400 text-sm">Average Score</div>
            </CardContent>
          </AppCard>
          <AppCard className="bg-gray-900 border-gray-800">
            <CardContent className="pt-6 text-center">
              <CheckCircle className="w-8 h-8 mx-auto text-emerald-400 mb-2" />
              <div className="text-3xl font-bold">{audits.length}</div>
              <div className="text-gray-400 text-sm">Audits Run</div>
            </CardContent>
          </AppCard>
          <AppCard className="bg-gray-900 border-gray-800">
            <CardContent className="pt-6 text-center">
              <AlertTriangle className="w-8 h-8 mx-auto text-amber-400 mb-2" />
              <div className="text-3xl font-bold">{totalViolations}</div>
              <div className="text-gray-400 text-sm">Total Violations</div>
            </CardContent>
          </AppCard>
        </div>

        <Tabs defaultValue="all" className="space-y-4">
          <TabsList className="bg-gray-900 border-gray-800">
            <TabsTrigger value="all">All Audits</TabsTrigger>
            <TabsTrigger value="violations">Violations</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-4">
            {audits.map((audit) => (
              <AppCard key={audit.id} className="bg-gray-900 border-gray-800">
                <CardHeader className="pb-2">
                  <CardTitle className="text-white text-lg flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileSearch className="w-5 h-5 text-cyan-400" />
                      {audit.type} audit — {audit.domain}
                    </div>
                    <Badge variant={audit.score >= 80 ? "default" : "destructive"}>
                      Score: {audit.score}/100
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-gray-400 text-sm">
                    {audit.violations.length} violation(s) found · {audit.timestamp}
                  </div>
                </CardContent>
              </AppCard>
            ))}
          </TabsContent>

          <TabsContent value="violations" className="space-y-3">
            {audits.flatMap(a => a.violations).length === 0 ? (
              <AppCard className="bg-gray-900 border-gray-800">
                <CardContent className="py-12 text-center">
                  <CheckCircle className="w-12 h-12 mx-auto text-emerald-400 mb-3" />
                  <div className="text-gray-300 text-lg">No violations detected</div>
                  <div className="text-gray-500 text-sm">Architecture is clean</div>
                </CardContent>
              </AppCard>
            ) : (
              audits.flatMap(a => a.violations).map((v: Violation) => (
                <AppCard key={v.id} className="bg-gray-900 border-gray-800">
                  <CardContent className="py-4">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className={`w-5 h-5 mt-0.5 ${v.severity === 'critical' ? 'text-red-400' : 'text-amber-400'}`} />
                      <div className="flex-1">
                        <div className="text-gray-200">{v.message}</div>
                        <div className="flex gap-2 mt-2">
                          <Badge className={severityColor[v.severity]}>{v.severity}</Badge>
                          <Badge variant="outline" className="text-xs">{v.type}</Badge>
                          <Badge variant="outline" className="text-xs text-cyan-300">{v.domain}</Badge>
                        </div>
                        {v.suggestion && (
                          <div className="text-gray-500 text-xs mt-2">💡 {v.suggestion}</div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </AppCard>
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
    </SubPageShell>
  );
}
