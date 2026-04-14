import SubPageShell from "@/components/layout/SubPageShell";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Database, Shield, AlertTriangle, CheckCircle, FileText } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { projectMemory } from "@/devos/memory/project-memory";
import type { ProjectRule, IncidentRecord, ProofRecord } from "@/devos/types";

export default function MemoryCenterPage() {
  const navigate = useNavigate();
  const [rules, setRules] = useState<ProjectRule[]>([]);
  const [incidents, setIncidents] = useState<IncidentRecord[]>([]);
  const [proofs, setProofs] = useState<ProofRecord[]>([]);
  const [summary, setSummary] = useState<ReturnType<typeof projectMemory.getProjectSummary> | null>(null);

  useEffect(() => {
    setRules(projectMemory.getRules());
    setIncidents(projectMemory.getIncidents());
    setProofs(projectMemory.getProofs());
    setSummary(projectMemory.getProjectSummary());
  }, []);

  if (!summary) return null;

  return (
    <SubPageShell noContentPad className="bg-gray-950 text-white p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate("/builder")} className="text-gray-400 hover:text-white">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Database className="w-6 h-6 text-cyan-400" />
              Memory Center
            </h1>
            <p className="text-gray-400 text-sm">Project rules, incidents, proofs, knowledge base</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="pt-6 text-center">
              <Shield className="w-6 h-6 mx-auto text-cyan-400 mb-2" />
              <div className="text-2xl font-bold">{summary.totalRules}</div>
              <div className="text-gray-400 text-xs">Rules</div>
            </CardContent>
          </Card>
          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="pt-6 text-center">
              <AlertTriangle className="w-6 h-6 mx-auto text-amber-400 mb-2" />
              <div className="text-2xl font-bold">{summary.totalIncidents}</div>
              <div className="text-gray-400 text-xs">Incidents</div>
            </CardContent>
          </Card>
          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="pt-6 text-center">
              <CheckCircle className="w-6 h-6 mx-auto text-emerald-400 mb-2" />
              <div className="text-2xl font-bold">{summary.totalProofs}</div>
              <div className="text-gray-400 text-xs">Proofs</div>
            </CardContent>
          </Card>
          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="pt-6 text-center">
              <FileText className="w-6 h-6 mx-auto text-purple-400 mb-2" />
              <div className="text-2xl font-bold">{summary.averageHealthScore}%</div>
              <div className="text-gray-400 text-xs">Avg Health</div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="rules" className="space-y-4">
          <TabsList className="bg-gray-900 border-gray-800">
            <TabsTrigger value="rules">Rules ({rules.length})</TabsTrigger>
            <TabsTrigger value="incidents">Incidents ({incidents.length})</TabsTrigger>
            <TabsTrigger value="proofs">Proofs ({proofs.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="rules" className="space-y-3">
            {rules.map((rule) => (
              <Card key={rule.id} className="bg-gray-900 border-gray-800">
                <CardContent className="py-4">
                  <div className="flex items-start gap-3">
                    <Shield className={`w-4 h-4 mt-0.5 ${rule.enforced ? "text-emerald-400" : "text-gray-600"}`} />
                    <div className="flex-1">
                      <div className="text-gray-200 text-sm">{rule.rule}</div>
                      <div className="flex gap-2 mt-2">
                        <Badge variant="outline" className="text-xs">{rule.category}</Badge>
                        {rule.enforced && <Badge className="text-xs bg-emerald-900 text-emerald-300">Enforced</Badge>}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="incidents" className="space-y-3">
            {incidents.length === 0 ? (
              <Card className="bg-gray-900 border-gray-800">
                <CardContent className="py-12 text-center">
                  <CheckCircle className="w-12 h-12 mx-auto text-emerald-400 mb-3" />
                  <div className="text-gray-300">No incidents recorded</div>
                </CardContent>
              </Card>
            ) : (
              incidents.map((inc) => (
                <Card key={inc.id} className="bg-gray-900 border-gray-800">
                  <CardContent className="py-4">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="w-4 h-4 mt-0.5 text-amber-400" />
                      <div className="flex-1">
                        <div className="text-gray-200 text-sm">{inc.description}</div>
                        <div className="flex gap-2 mt-2">
                          <Badge variant="destructive" className="text-xs">{inc.severity}</Badge>
                          <Badge variant="outline" className="text-xs">{inc.domain}</Badge>
                          {inc.resolvedAt && <Badge className="text-xs bg-emerald-900 text-emerald-300">Resolved</Badge>}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="proofs" className="space-y-3">
            {proofs.length === 0 ? (
              <Card className="bg-gray-900 border-gray-800">
                <CardContent className="py-12 text-center">
                  <FileText className="w-12 h-12 mx-auto text-gray-600 mb-3" />
                  <div className="text-gray-300">No proofs recorded yet</div>
                  <div className="text-gray-500 text-sm">Run audits or apply patches to generate proofs</div>
                </CardContent>
              </Card>
            ) : (
              proofs.map((p) => (
                <Card key={p.id} className="bg-gray-900 border-gray-800">
                  <CardContent className="py-4">
                    <div className="flex items-start gap-3">
                      <CheckCircle className="w-4 h-4 mt-0.5 text-emerald-400" />
                      <div className="flex-1">
                        <div className="text-gray-200 text-sm">{p.summary}</div>
                        <div className="flex gap-2 mt-2">
                          <Badge variant="outline" className="text-xs">{p.type}</Badge>
                          <span className="text-gray-500 text-xs">{p.actor} · {p.timestamp}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
    </SubPageShell>
  );
}
