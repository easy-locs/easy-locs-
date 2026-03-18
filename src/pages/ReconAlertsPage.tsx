/**
 * ReconAlertsPage — Live financial mismatch alerts.
 */
import { BackCard } from "@/components/ui/back-card";
import { useReconAlerts } from "@/hooks/useReconAlerts";

export default function ReconAlertsPage() {
  const alerts = useReconAlerts();

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
        <BackCard />
        <div>
          <h1 className="text-xl font-bold text-foreground">Recon Alerts</h1>
          <p className="text-sm text-muted-foreground">Live financial mismatch alerts</p>
        </div>

        <div className="space-y-3">
          {alerts.map((a: any) => (
            <div key={a.id} className="rounded-2xl border border-border bg-card p-4">
              <p className="text-sm font-semibold text-foreground">
                {(a.severity ?? "").toUpperCase()} · {a.title}
              </p>
              {a.body && <p className="text-xs text-muted-foreground mt-1">{a.body}</p>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
