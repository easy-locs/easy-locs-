import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { fleetService } from "@/services/fleet.service";
import { useUiEngine } from "@/hooks/useUiEngine";
import SubPageShell from "@/components/layout/SubPageShell";

export default function DriverCompletedDeliveriesPage() {
  useUiEngine("driver-drivercompleteddeliveriespage");
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: rows = [], isLoading , isError } = useQuery({
    queryKey: ["driver-completed-deliveries", user?.id],
    queryFn: () => fleetService.fetchDriverCompletedOrders(user?.id),
    enabled: !!user?.id,
    staleTime: 10000,
  });

  return (
    <SubPageShell title="Completed Deliveries" subtitle="Past delivered missions" onBack={() => navigate("/driver/dashboard")} noContentPad>

      {isError && <div className="state-container"><p className="text-sm text-destructive">Something went wrong. Please try again.</p></div>}
      {isLoading && [1, 2].map((i) => (<div key={i} className="mx-4 mb-3 h-20 rounded-2xl bg-muted animate-pulse" />))}

      {!isLoading && rows.length === 0 && (
        <div className="px-4 py-12 text-center text-sm text-muted-foreground">No completed deliveries yet</div>
      )}

      {!isLoading && rows.length > 0 && (
        <div className="px-4 space-y-3">
          {rows.map((row: any) => (
            <div key={row.id} className="rounded-2xl border border-border/20 bg-card p-4">
              <p className="text-sm font-bold text-foreground">Order #{String(row.id).slice(0, 8)}</p>
              <p className="text-xs text-muted-foreground mt-1">{row.status} · {Number(row.total_amount ?? 0).toFixed(2)} {row.currency ?? "AED"}</p>
              <p className="text-[0.6875rem] text-muted-foreground/70 mt-1">{row.updated_at ? new Date(row.updated_at).toLocaleString() : ""}</p>
            </div>
          ))}
        </div>
      )}
    </SubPageShell>
  );
}
