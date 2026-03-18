import { useEffect, useState } from "react";
import { BackCard } from "@/components/ui/back-card";
import { useActiveWorkspace } from "@/hooks/useActiveWorkspace";
import { collectOpsHealthSnapshot } from "@/lib/qa/system-health";
import { Card, CardContent } from "@/components/ui/card";
import { Activity } from "lucide-react";

export default function OpsWallboardPage() {
  const { activeWorkspace } = useActiveWorkspace();
  const [snapshot, setSnapshot] = useState<any | null>(null);

  const load = async () => {
    const data = await collectOpsHealthSnapshot(activeWorkspace?.id);
    setSnapshot(data);
  };

  useEffect(() => {
    load();
    const interval = setInterval(load, 15000);
    return () => clearInterval(interval);
  }, [activeWorkspace?.id]);

  return (
    <div className="min-h-screen bg-background p-4 space-y-6 max-w-2xl mx-auto">
      <BackCard label="Back" />

      <div>
        <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
          <Activity className="h-5 w-5 text-primary" /> Ops Wallboard
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Live high-level operations status</p>
      </div>

      {!!snapshot && (
        <div className="space-y-3">
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">System Status</p>
              <p className={`text-lg font-bold ${snapshot.status === "healthy" ? "text-success" : "text-destructive"}`}>
                {snapshot.status.toUpperCase()}
              </p>
            </CardContent>
          </Card>

          <div className="grid grid-cols-2 gap-3">
            {Object.entries(snapshot.details).map(([key, value]) => (
              <Card key={key}>
                <CardContent className="p-3">
                  <p className="text-xs text-muted-foreground">{key}</p>
                  <p className="text-lg font-bold text-foreground">{String(value)}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
