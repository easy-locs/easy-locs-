import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshCw, CheckCircle, XCircle, AlertTriangle, ArrowUp } from "lucide-react";
import { fetchReviewQueue, resolveReviewItem, type ReviewQueueItem } from "@/lib/admin/review-queue";
import { useUiEngine } from "@/hooks/useUiEngine";

const AdminReviewQueuePage = () => {
  const [items, setItems] = useState<ReviewQueueItem[]>([]);
  const [filter, setFilter] = useState<string>("pending");
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    const data = await fetchReviewQueue(filter || undefined);
    setItems(data);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, [filter]);

  const handleAction = async (id: string, action: "approve" | "reject" | "escalate") => {
    await resolveReviewItem(id, action);
    loadData();
  };

  useUiEngine("adminreviewqueuepage");

  return (
    <div className="min-h-screen bg-background p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Review Queue</h1>
          <p className="text-sm text-muted-foreground">Handle flagged transactions and anomalies</p>
        </div>
        <Button variant="outline" size="sm" onClick={loadData} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <div className="flex gap-2">
        {["pending", "approved", "rejected", "escalated"].map((s) => (
          <Button key={s} size="sm" variant={filter === s ? "default" : "outline"} onClick={() => setFilter(s)}>
            {s}
          </Button>
        ))}
      </div>

      <div className="space-y-3">
        {items.map((item) => (
          <Card key={item.id}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-500" />
                  <div>
                    <p className="font-medium text-sm text-foreground">{item.approvalType}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.entityType}:{item.entityId?.slice(0, 8)} · {new Date(item.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {item.priority && <Badge variant="outline">{item.priority}</Badge>}
                  <Badge variant={item.status === "pending" ? "secondary" : "outline"}>{item.status}</Badge>
                </div>
              </div>
              {item.requestedReason && (
                <p className="text-xs text-muted-foreground mb-3">{item.requestedReason}</p>
              )}
              {item.status === "pending" && (
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => handleAction(item.id, "approve")}>
                    <CheckCircle className="h-3 w-3 mr-1" />Approve
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => handleAction(item.id, "reject")}>
                    <XCircle className="h-3 w-3 mr-1" />Reject
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleAction(item.id, "escalate")}>
                    <ArrowUp className="h-3 w-3 mr-1" />Escalate
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
        {items.length === 0 && <p className="text-center text-muted-foreground py-8">No items in queue</p>}
      </div>
    </div>
  );
};

export default AdminReviewQueuePage;
