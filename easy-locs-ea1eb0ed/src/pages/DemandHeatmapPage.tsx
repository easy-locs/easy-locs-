/**
 * DemandHeatmapPage — /driver/heatmap — Live demand zones with surge info.
 */
import { db } from "@/services/db";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useUiEngine } from "@/hooks/useUiEngine";
import SubPageShell from "@/components/layout/SubPageShell";
import { useImmersiveStatusBar } from "@/hooks/useStatusBar";

export default function DemandHeatmapPage() {
  useUiEngine("demandheatmappage");
  useImmersiveStatusBar();
  const navigate = useNavigate();
  const [zones, setZones] = useState<any[]>([]);

  useEffect(() => {
    db
      .from("demand_zones" as any)
      .select("*")
      .order("updated_at", { ascending: false })
      .then(({ data }) => setZones((data as any[]) ?? []));
  }, []);

  return (
    <SubPageShell title="Demand heatmap" subtitle="Live demand, supply and surge by zone" onBack={() => navigate(-1)}>
      <div className="space-y-3">
          {zones.length === 0 && (
            <p className="text-sm text-muted-foreground">No active zones</p>
          )}

          {zones.map((zone) => (
            <div key={zone.id} className="rounded-2xl border border-border bg-card p-4 space-y-2">
              <div className="flex justify-between items-center">
                <p className="text-sm font-semibold text-foreground">{zone.zone_key}</p>
                <p className="text-sm font-bold text-accent">
                  {Number(zone.surge_multiplier || 1).toFixed(2)}x
                </p>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <p className="text-[10px] text-muted-foreground">Demand</p>
                  <p className="text-sm font-semibold text-foreground">{zone.active_requests}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground">Supply</p>
                  <p className="text-sm font-semibold text-foreground">{zone.active_drivers}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground">Predicted</p>
                  <p className="text-sm font-semibold text-foreground">{zone.predicted_demand}</p>
                </div>
              </div>
            </div>
          ))}
      </div>
    </SubPageShell>
  );
}
