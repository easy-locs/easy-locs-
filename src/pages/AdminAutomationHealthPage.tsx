import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshCw, Activity, CheckCircle, XCircle, Clock, Zap } from "lucide-react";
import { getSchedulerHealth } from "@/lib/automation/automation-scheduler";
import { supabase } from "@/integrations/supabase/client";

const AdminAutomationHealthPage = () => {
  const [health, setHealth] = useState<any>(null);
  const [recentWorkflows, setRecentWorkflows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    const [h, { data: recent }] = await Promise.all([
      getSchedulerHealth(),
      (supabase as any).from("automation_workflows").select("*").order("created_at", { ascending: false }).limit(20),
    ]);
    setHealth(h);
    setRecentWorkflows(recent ?? []);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const statusColor = (s: string) => {
    switch (s) {
      case "completed": return "text-green-500";
      case "failed": return "text-destructive";
      case "running": return "text-blue-500";
      case "scheduled": return "text-yellow-500";
      default: return "text-muted-foreground";
    }
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Automation Health</h1>
          <p className="text-sm text-muted-foreground">Monitor the autonomy layer</p>
        </div>
        <Button variant="outline" size="sm" onClick={loadData} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {health && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {[
            { label: "Queued", value: health.queued, icon: Clock, color: "text-muted-foreground" },
            { label: "Running", value: health.running, icon: Activity, color: "text-blue-500" },
            { label: "Scheduled", value: health.scheduled, icon: Zap, color: "text-yellow-500" },
            { label: "Done Today", value: health.completedToday, icon: CheckCircle, color: "text-green-500" },
            { label: "Failed Today", value: health.failedToday, icon: XCircle, color: "text-destructive" },
            { label: "Scheduler", value: health.schedulerRunning ? "ON" : "OFF", icon: Activity, color: health.schedulerRunning ? "text-green-500" : "text-destructive" },
          ].map((stat) => (
            <Card key={stat.label}>
              <CardContent className="p-4 flex items-center gap-3">
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
                <div>
                  <p className="text-xl font-bold text-foreground">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Recent Workflows</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {recentWorkflows.map((wf: any) => (
              <div key={wf.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div>
                  <p className="font-medium text-sm text-foreground">{wf.workflow_type}</p>
                  <p className="text-xs text-muted-foreground">{wf.entity_type}:{wf.entity_id?.slice(0, 8)} · Step {wf.current_step}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={statusColor(wf.status)}>{wf.status}</Badge>
                  <span className="text-xs text-muted-foreground">P{wf.priority}</span>
                </div>
              </div>
            ))}
            {recentWorkflows.length === 0 && <p className="text-center text-muted-foreground py-4">No workflows yet</p>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminAutomationHealthPage;
