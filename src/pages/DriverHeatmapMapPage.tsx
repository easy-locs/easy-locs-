import { useEffect, useState } from "react";
import { BackCard } from "@/components/ui/back-card";
import LiveMap from "@/components/map/LiveMap";
import { supabase } from "@/integrations/supabase/client";

export default function DriverHeatmapMapPage() {
  const [points, setPoints] = useState<{ lat: number; lng: number }[]>([]);

  useEffect(() => {
    (async () => {
      const { data } = await (supabase as any)
        .from("driver_locations")
        .select("lat, lng")
        .order("recorded_at", { ascending: false })
        .limit(200);

      setPoints(
        (data ?? []).map((r: any) => ({ lat: Number(r.lat), lng: Number(r.lng) }))
      );
    })();
  }, []);

  return (
    <div className="min-h-screen bg-background p-4 space-y-4 max-w-2xl mx-auto">
      <BackCard />
      <div>
        <h1 className="text-xl font-bold text-foreground">Driver Heatmap</h1>
        <p className="text-sm text-muted-foreground">Live driver locations on map</p>
      </div>
      <LiveMap points={points} />
      <p className="text-xs text-muted-foreground">{points.length} driver location points</p>
    </div>
  );
}
