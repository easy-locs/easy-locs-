import SubPageShell from "@/components/layout/SubPageShell";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { fleetService } from "@/services";
import { useUiEngine } from "@/hooks/useUiEngine";

export default function AdminDriverMonitorPage() {
  useUiEngine("admin-admindrivermonitorpage");
  const navigate = useNavigate();

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["admin-driver-monitor"],
    queryFn: () => fleetService.fetchAllDriverProfilesOrdered(300) as Promise<any[]>,
    staleTime: 5000,
  });

  const online = rows.filter((r: any) => !!r.is_online).length;
  const available = rows.filter((r: any) => !!r.is_online && !!r.is_available).length;
  const busy = rows.filter((r: any) => !!r.is_online && !r.is_available).length;

  return (
    <SubPageShell noContentPad className="bg-background">
      <div className="flex items-center gap-3 px-4 pt-6 pb-4">
        <button
          onClick={() => navigate("/admin")}
          className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center"
        >
          ←
        </button>
        <div>
          <h1 className="text-lg font-bold text-foreground">Driver Monitor</h1>
          <p className="text-xs text-muted-foreground">Realtime driver overview</p>
        </div>
      </div>

      {isLoading ? (
        [1, 2, 3].map((i) => (
          <div key={i} className="mx-4 mb-3 h-20 rounded-2xl bg-muted animate-pulse" />
        ))
      ) : (
        <>
          <div className="grid grid-cols-3 gap-3 px-4 py-3">
            <Metric title="Online" value={String(online)} />
            <Metric title="Available" value={String(available)} />
            <Metric title="Busy" value={String(busy)} />
          </div>

          <div className="px-4 space-y-3">
            {rows.map((row: any) => (
              <div key={row.id ?? row.user_id} className="rounded-2xl border border-border/20 bg-card p-4 space-y-1">
                <p className="text-sm font-bold text-foreground">Driver {String(row.user_id).slice(0, 8)}</p>
                <p className="text-xs text-muted-foreground">
                  {row.is_online ? "Online" : "Offline"} · {row.is_available ? "Available" : "Busy"}
                </p>
                <p className="text-xs text-muted-foreground">
                  Status: {row.current_status || "unknown"}
                </p>
                <p className="text-[11px] text-muted-foreground/70">
                  Updated: {row.updated_at ? new Date(row.updated_at).toLocaleString() : "-"}
                </p>
              </div>
            ))}
          </div>
        </>
      )}
    </SubPageShell>
  );
}

function Metric({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border/20 bg-card p-4 text-center">
      <p className="text-[11px] text-muted-foreground">{title}</p>
      <p className="text-lg font-bold text-foreground">{value}</p>
    </div>
  );
}
