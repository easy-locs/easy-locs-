/**
 * DemandHeatmapPage — /driver/heatmap — Live demand zones with surge info.
 */
import { useEffect, useState } from "react";
import { BackCard } from "@/components/ui/back-card";
import { supabase } from "@/integrations/supabase/client";

export default function DemandHeatmapPage() {
  const [zones, setZones] = useState<any[]>([]);

  useEffect(() => {
    supabase
      .from("demand_zones" as any)
      .select("*")
      .order("updated_at", { ascending: false })
      .then(({ data }) => setZones((data as any[]) ?? []));
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-lg mx-auto px-4 py-6 space-y-5">
        <BackCard />

        <div className="space-y-1">
          <h1 className="text-lg font-bold text-foreground">Demand heatmap</h1>
          <p className="text-xs text-muted-foreground">
            Live demand, supply and surge by zone
          </p>
        </div>

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
      </div>
    </div>
  );
}
