import { useEffect, useState } from "react";
import { BackCard } from "@/components/ui/back-card";
import { acknowledgeAdminAlert, createAdminAlert, listAdminAlerts, resolveAdminAlert } from "@/lib/admin/alerts";
import { Button } from "@/components/ui/button";
import { AlertTriangle, CheckCircle2, Eye } from "lucide-react";
import { toast } from "sonner";

export default function AdminAlertCenterPage() {
  const [rows, setRows] = useState<any[]>([]);

  const load = async () => {
    try {
      const data = await listAdminAlerts();
      setRows(data);
    } catch (e: any) {
      console.error(e);
    }
  };

  useEffect(() => { load(); }, []);

  const createDemo = async () => {
    await createAdminAlert({
      alertType: "dispatch_failure",
      severity: "high",
      title: "Dispatch queue delayed",
      body: "Multiple jobs still unassigned after retries.",
    });
    toast.success("Demo alert created");
    await load();
  };

  const ack = async (id: string) => {
    await acknowledgeAdminAlert(id);
    toast.success("Acknowledged");
    await load();
  };

  const resolve = async (id: string) => {
    await resolveAdminAlert(id);
    toast.success("Resolved");
    await load();
  };

  const severityColor = (s: string) => {
    if (s === "critical") return "text-destructive";
    if (s === "high") return "text-orange-500";
    return "text-muted-foreground";
  };

  return (
    <div className="min-h-screen bg-background p-4 space-y-4 max-w-lg mx-auto">
      <BackCard />
      <div>
        <h1 className="text-xl font-bold text-foreground">Admin Alert Center</h1>
        <p className="text-sm text-muted-foreground">Operational alerts and actions</p>
      </div>
      <Button onClick={createDemo} variant="outline" className="w-full rounded-xl">
        <AlertTriangle className="h-4 w-4 mr-2" /> Create demo alert
      </Button>
      <div className="space-y-2">
        {rows.map((row: any) => (
          <div key={row.id} className="rounded-xl border border-border bg-card p-4 space-y-2">
            <p className="text-sm font-semibold text-foreground">{row.title}</p>
            {row.body && <p className="text-xs text-muted-foreground">{row.body}</p>}
            <p className={`text-xs ${severityColor(row.severity)}`}>
              {row.severity} · {row.status}
            </p>
            <div className="flex gap-2">
              <Button size="sm" variant="ghost" onClick={() => ack(row.id)} disabled={row.status !== "open"}>
                <Eye className="h-3 w-3 mr-1" /> Ack
              </Button>
              <Button size="sm" variant="ghost" onClick={() => resolve(row.id)} disabled={row.status === "resolved"}>
                <CheckCircle2 className="h-3 w-3 mr-1" /> Resolve
              </Button>
            </div>
          </div>
        ))}
        {!rows.length && <p className="text-sm text-muted-foreground text-center py-8">No alerts</p>}
      </div>
    </div>
  );
}
