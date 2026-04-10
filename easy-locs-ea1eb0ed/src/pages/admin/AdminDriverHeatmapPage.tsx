import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { fleetService } from "@/services";

export default function AdminDriverHeatmapPage() {
  const navigate = useNavigate();

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["admin-driver-heatmap"],
    queryFn: () => fleetService.fetchAllDriverProfiles(1000) as Promise<any[]>,
    staleTime: 5000,
  });

  const zones = rows.reduce((acc: Record<string, number>, row: any) => {
    const zone = String(row.zone || row.city || "Unknown");
    acc[zone] = (acc[zone] || 0) + 1;
    return acc;
  }, {});

  const zoneRows = Object.entries(zones).sort((a, b) => (b[1] as number) - (a[1] as number));

  return (
    <div className="min-h-[100dvh] bg-background pb-24">
      <div className="flex items-center gap-3 px-4 pt-6 pb-4">
        <button onClick={() => navigate("/admin")} className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center">←</button>
        <div>
          <h1 className="text-lg font-bold text-foreground">Driver Heatmap</h1>
          <p className="text-xs text-muted-foreground">Driver density by zone</p>
        </div>
      </div>

      {isLoading && [1, 2, 3].map((i) => (
        <div key={i} className="mx-4 mb-3 h-16 rounded-2xl bg-muted animate-pulse" />
      ))}

      {!isLoading && zoneRows.length === 0 && (
        <p className="px-4 py-8 text-center text-sm text-muted-foreground">No driver zone data yet</p>
      )}

      {!isLoading && zoneRows.length > 0 && (
        <div className="px-4 space-y-3">
          {zoneRows.map(([zone, count]) => (
            <div key={zone} className="rounded-2xl border border-border/20 bg-card p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-foreground">{zone}</p>
                <p className="text-sm font-bold text-foreground">{String(count)}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
