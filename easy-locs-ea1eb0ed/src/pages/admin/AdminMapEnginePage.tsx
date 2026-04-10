import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getMapMerchantPins, getNearbyMerchants } from "@/lib/map/mapEngine";

export default function AdminMapEnginePage() {
  const navigate = useNavigate();

  const { data: pins = [], isLoading, error: pinsError } = useQuery({
    queryKey: ["admin-map-engine-pins"],
    queryFn: () => getMapMerchantPins({ limit: 300 }),
    staleTime: 10000,
  });

  const { data: nearby = [], error: nearbyError } = useQuery({
    queryKey: ["admin-map-engine-nearby"],
    queryFn: () =>
      getNearbyMerchants({ lat: 25.2048, lng: 55.2708, radiusKm: 12, limit: 20 }),
    staleTime: 10000,
  });

  return (
    <div className="min-h-[100dvh] bg-background pb-24">
      <div className="flex items-center gap-3 px-4 pt-6 pb-4">
        <button
          onClick={() => navigate("/admin")}
          className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center"
        >
          ←
        </button>
        <div>
          <h1 className="text-lg font-bold text-foreground">Map Engine</h1>
          <p className="text-xs text-muted-foreground">Location indexing and nearby discovery</p>
        </div>
      </div>

      {isLoading &&
        [1, 2].map((i) => (
          <div key={i} className="mx-4 mb-3 h-20 rounded-2xl bg-muted animate-pulse" />
        ))}

      {!isLoading && (pinsError || nearbyError) && (
        <div className="mx-4 py-8 text-center">
          <p className="text-sm text-destructive font-medium">Failed to load map data</p>
          <p className="text-xs text-muted-foreground mt-1">Check your connection and reload.</p>
        </div>
      )}

      {!isLoading && !pinsError && !nearbyError && (
        <>
          <div className="grid grid-cols-2 gap-3 px-4 py-4">
            <Metric title="Total Pins" value={String(pins.length)} />
            <Metric
              title="With Coords"
              value={String(pins.filter((p) => p.lat != null && p.lng != null).length)}
            />
          </div>

          <div className="px-4 py-3 space-y-2">
            <p className="text-sm font-bold text-foreground">Closest Merchants</p>
            {nearby.length === 0 ? (
              <p className="text-xs text-muted-foreground">No nearby merchants found</p>
            ) : (
              nearby.map((row: any) => (
                <div key={row.id} className="rounded-xl border border-border/20 bg-card p-3">
                  <p className="text-sm font-semibold text-foreground">{row.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {row.category} · {row.area || row.city || "Dubai"} ·{" "}
                    {row.distanceKm.toFixed(2)} km
                  </p>
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}

function Metric({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border/20 bg-card p-4">
      <p className="text-xs text-muted-foreground">{title}</p>
      <p className="text-lg font-bold text-foreground">{value}</p>
    </div>
  );
}
