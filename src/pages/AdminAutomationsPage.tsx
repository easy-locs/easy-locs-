import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RefreshCw, Play, Square, RotateCcw, XCircle, Zap } from "lucide-react";
import { stopWorkflow, resumeWorkflow, cancelWorkflow, executeWorkflowStep } from "@/lib/automation/automation-engine";
import { toast } from "sonner";

const statusColors: Record<string, string> = {
  queued: "bg-blue-100 text-blue-800",
  scheduled: "bg-yellow-100 text-yellow-800",
  running: "bg-purple-100 text-purple-800",
  completed: "bg-green-100 text-green-800",
  failed: "bg-red-100 text-red-800",
  stopped: "bg-orange-100 text-orange-800",
  cancelled: "bg-muted text-muted-foreground",
};

export default function AdminAutomationsPage() {
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    let query = (supabase as any).from("automation_workflows").select("*")
      .order("priority", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(100);

    if (filter !== "all") query = query.eq("status", filter);
    const { data } = await query;
    setWorkflows(data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [filter]);

  const handleAction = async (action: string, wfId: string) => {
    try {
      if (action === "stop") await stopWorkflow(wfId, "admin_manual");
      if (action === "resume") await resumeWorkflow(wfId);
      if (action === "cancel") await cancelWorkflow(wfId);
      if (action === "retry") await executeWorkflowStep(wfId);
      toast.success(`Workflow ${action}d`);
      load();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const counts = {
    all: workflows.length,
    queued: workflows.filter(w => w.status === "queued").length,
    running: workflows.filter(w => w.status === "running").length,
    failed: workflows.filter(w => w.status === "failed").length,
    completed: workflows.filter(w => w.status === "completed").length,
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Zap className="w-6 h-6" /> Automation Engine
        </h1>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-1 ${loading ? "animate-spin" : ""}`} /> Refresh
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {(["all", "queued", "running", "failed", "completed"] as const).map(key => (
          <Card key={key} className={`cursor-pointer ${filter === key ? "ring-2 ring-primary" : ""}`} onClick={() => setFilter(key)}>
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold text-foreground">{counts[key]}</p>
              <p className="text-xs text-muted-foreground capitalize">{key}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Workflow list */}
      <div className="space-y-3">
        {workflows.map(wf => (
          <Card key={wf.id}>
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <Badge className={statusColors[wf.status] ?? ""}>{wf.status}</Badge>
                  <span className="font-medium text-sm text-foreground">{wf.workflow_type}</span>
                  <span className="text-xs text-muted-foreground">{wf.entity_type}:{wf.entity_id?.slice(0, 8)}</span>
                </div>
                <div className="flex gap-1">
                  {["stopped", "failed"].includes(wf.status) && (
                    <Button size="sm" variant="outline" onClick={() => handleAction("resume", wf.id)}>
                      <Play className="w-3 h-3 mr-1" /> Resume
                    </Button>
                  )}
                  {["queued", "scheduled", "running"].includes(wf.status) && (
                    <Button size="sm" variant="outline" onClick={() => handleAction("stop", wf.id)}>
                      <Square className="w-3 h-3 mr-1" /> Stop
                    </Button>
                  )}
                  {wf.status === "failed" && (
                    <Button size="sm" variant="outline" onClick={() => handleAction("retry", wf.id)}>
                      <RotateCcw className="w-3 h-3 mr-1" /> Retry
                    </Button>
                  )}
                  {!["completed", "cancelled"].includes(wf.status) && (
                    <Button size="sm" variant="destructive" onClick={() => handleAction("cancel", wf.id)}>
                      <XCircle className="w-3 h-3 mr-1" /> Cancel
                    </Button>
                  )}
                </div>
              </div>
              <div className="text-xs text-muted-foreground flex gap-4 flex-wrap">
                <span>Step: {wf.current_step}/{(wf.steps_json?.length ?? 0)}</span>
                <span>Priority: {wf.priority}</span>
                <span>Retries: {wf.retry_count ?? 0}</span>
                {wf.trigger_source && <span>Trigger: {wf.trigger_source}</span>}
                {wf.stop_reason && <span className="text-destructive">Reason: {wf.stop_reason}</span>}
                {wf.scheduled_at && <span>Next: {new Date(wf.scheduled_at).toLocaleString()}</span>}
              </div>
            </CardContent>
          </Card>
        ))}
        {!workflows.length && <p className="text-muted-foreground text-center py-8">No workflows found</p>}
      </div>
    </div>
  );
}
