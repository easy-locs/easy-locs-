import { BackCard } from "@/components/ui/back-card";
import { getDeploymentChecklist } from "@/lib/system/deployment-checks";
import { CheckCircle2 } from "lucide-react";

export default function DeploymentChecklistPage() {
  const rows = getDeploymentChecklist();

  return (
    <div className="min-h-screen bg-background p-4 space-y-4 max-w-lg mx-auto">
      <BackCard />
      <div>
        <h1 className="text-xl font-bold text-foreground">Deployment Checklist</h1>
        <p className="text-sm text-muted-foreground">Production hardening before launch</p>
      </div>
      <div className="space-y-2">
        {rows.map((row, idx) => (
          <div key={idx} className="flex items-start gap-2 rounded-xl border border-border bg-card p-3">
            <CheckCircle2 className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
            <p className="text-sm text-foreground">{row}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
