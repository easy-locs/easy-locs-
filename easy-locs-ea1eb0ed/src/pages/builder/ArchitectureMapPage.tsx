import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Network, Route, Database, Shield, Layers } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { projectMemory } from "@/devos/memory/project-memory";
import type { DomainMapEntry, ProjectRule } from "@/devos/types";

export default function ArchitectureMapPage() {
  const navigate = useNavigate();
  const [domains, setDomains] = useState<DomainMapEntry[]>([]);
  const [rules, setRules] = useState<ProjectRule[]>([]);

  useEffect(() => {
    setDomains(projectMemory.getDomainMap());
    setRules(projectMemory.getRules());
  }, []);

  const healthColor = (score: number) =>
    score >= 90 ? "text-emerald-400" : score >= 70 ? "text-amber-400" : "text-red-400";

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate("/builder")} className="text-gray-400 hover:text-white">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Network className="w-6 h-6 text-cyan-400" />
              Architecture Map
            </h1>
            <p className="text-gray-400 text-sm">Domains, dependencies, routes, rules</p>
          </div>
        </div>

        <Tabs defaultValue="domains" className="space-y-4">
          <TabsList className="bg-gray-900 border-gray-800">
            <TabsTrigger value="domains"><Layers className="w-4 h-4 mr-1" /> Domains</TabsTrigger>
            <TabsTrigger value="routes"><Route className="w-4 h-4 mr-1" /> Routes</TabsTrigger>
            <TabsTrigger value="rules"><Shield className="w-4 h-4 mr-1" /> Rules</TabsTrigger>
          </TabsList>

          <TabsContent value="domains" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {domains.map((d) => (
                <Card key={d.name} className="bg-gray-900 border-gray-800">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-white text-lg flex items-center justify-between">
                      {d.name}
                      <span className={`text-sm font-mono ${healthColor(d.healthScore)}`}>
                        {d.healthScore}%
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="text-gray-400">
                      <span className="text-gray-500">Path:</span> {d.path}
                    </div>
                    <div className="text-gray-400">
                      <span className="text-gray-500">Owner:</span> {d.owner}
                    </div>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {d.routes.map(r => (
                        <Badge key={r} variant="outline" className="text-xs text-cyan-300 border-cyan-800">
                          {r}
                        </Badge>
                      ))}
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {d.services.map(s => (
                        <Badge key={s} variant="secondary" className="text-xs">
                          {s}
                        </Badge>
                      ))}
                    </div>
                    {d.dependencies.length > 0 && (
                      <div className="text-gray-500 text-xs mt-1">
                        Depends on: {d.dependencies.join(", ")}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="routes" className="space-y-4">
            <Card className="bg-gray-900 border-gray-800">
              <CardHeader>
                <CardTitle className="text-white">Route Map</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {domains.flatMap(d =>
                    d.routes.map(r => (
                      <div key={`${d.name}-${r}`} className="flex items-center gap-3 text-sm py-1 border-b border-gray-800">
                        <Badge variant="outline" className="text-cyan-300 border-cyan-800 w-20 justify-center">
                          {d.name}
                        </Badge>
                        <code className="text-gray-300 flex-1">{r}</code>
                        <Database className="w-4 h-4 text-gray-600" />
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="rules" className="space-y-4">
            <Card className="bg-gray-900 border-gray-800">
              <CardHeader>
                <CardTitle className="text-white">Architecture Rules ({rules.length})</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {rules.map((rule) => (
                  <div key={rule.id} className="flex items-start gap-3 py-2 border-b border-gray-800">
                    <Shield className={`w-4 h-4 mt-0.5 ${rule.enforced ? "text-emerald-400" : "text-gray-600"}`} />
                    <div className="flex-1">
                      <div className="text-gray-300 text-sm">{rule.rule}</div>
                      <div className="flex gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">{rule.category}</Badge>
                        {rule.enforced && <Badge className="text-xs bg-emerald-900 text-emerald-300">Enforced</Badge>}
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
