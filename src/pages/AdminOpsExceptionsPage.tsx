import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertTriangle, RefreshCw, CheckCircle, XCircle, Clock, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { fetchReviewQueue, resolveReviewItem, type ReviewQueueItem } from "@/lib/admin/review-queue";

const AdminOpsExceptionsPage = () => {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [reviewItems, setReviewItems] = useState<ReviewQueueItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    const [alertsRes, reviews] = await Promise.all([
      (supabase as any).from("admin_alerts").select("*").eq("status", "open").order("created_at", { ascending: false }).limit(50),
      fetchReviewQueue("pending"),
    ]);
    setAlerts(alertsRes.data ?? []);
    setReviewItems(reviews);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const severityColor = (s: string) => {
    switch (s) {
      case "critical": return "destructive";
      case "high": return "destructive";
      case "warning": return "secondary";
      default: return "outline";
    }
  };

  const handleResolveReview = async (id: string, action: "approve" | "reject" | "escalate") => {
    await resolveReviewItem(id, action, `Admin action: ${action}`);
    loadData();
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Ops Exceptions</h1>
          <p className="text-sm text-muted-foreground">Exception-only operations — handle what automation can't</p>
        </div>
        <Button variant="outline" size="sm" onClick={loadData} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Open Alerts", value: alerts.length, icon: AlertTriangle, color: "text-destructive" },
          { label: "Critical", value: alerts.filter(a => a.severity === "critical").length, icon: XCircle, color: "text-destructive" },
          { label: "Pending Reviews", value: reviewItems.length, icon: Clock, color: "text-yellow-500" },
          { label: "Settlement Failures", value: alerts.filter(a => a.alert_type === "settlement_failed").length, icon: AlertTriangle, color: "text-orange-500" },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-4 flex items-center gap-3">
              <stat.icon className={`h-5 w-5 ${stat.color}`} />
              <div>
                <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="alerts">
        <TabsList>
          <TabsTrigger value="alerts">Alerts ({alerts.length})</TabsTrigger>
          <TabsTrigger value="reviews">Review Queue ({reviewItems.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="alerts" className="space-y-3 mt-4">
          {alerts.map((alert) => (
            <Card key={alert.id}>
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                  <div>
                    <p className="font-medium text-foreground text-sm">{alert.title}</p>
                    <p className="text-xs text-muted-foreground">{alert.alert_type} · {alert.entity_type}:{alert.entity_id?.slice(0, 8)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={severityColor(alert.severity) as any}>{alert.severity}</Badge>
                  <Button size="sm" variant="ghost"><ArrowRight className="h-3 w-3" /></Button>
                </div>
              </CardContent>
            </Card>
          ))}
          {alerts.length === 0 && <p className="text-center text-muted-foreground py-8">No open alerts — all clear ✓</p>}
        </TabsContent>

        <TabsContent value="reviews" className="space-y-3 mt-4">
          {reviewItems.map((item) => (
            <Card key={item.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="font-medium text-foreground text-sm">{item.approvalType}</p>
                    <p className="text-xs text-muted-foreground">{item.entityType}:{item.entityId?.slice(0, 8)} · {item.priority}</p>
                  </div>
                  <Badge variant="outline">{item.status}</Badge>
                </div>
                <div className="flex gap-2 mt-2">
                  <Button size="sm" variant="default" onClick={() => handleResolveReview(item.id, "approve")}>
                    <CheckCircle className="h-3 w-3 mr-1" />Approve
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => handleResolveReview(item.id, "reject")}>
                    <XCircle className="h-3 w-3 mr-1" />Reject
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleResolveReview(item.id, "escalate")}>Escalate</Button>
                </div>
              </CardContent>
            </Card>
          ))}
          {reviewItems.length === 0 && <p className="text-center text-muted-foreground py-8">No pending reviews</p>}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminOpsExceptionsPage;
