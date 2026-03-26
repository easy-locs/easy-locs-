import { useEffect } from "react";
import { useLocationStore } from "@/stores/locationStore";
import { useRiderDispatchStore } from "@/stores/riderDispatchStore";
import { MapPin, Radio } from "lucide-react";

export function DeliveryRadarMap() {
  const currentLocation = useLocationStore((s) => s.currentLocation);
  const drivers = useDriverStore((s) => s.drivers);
  const hydrate = useDriverStore((s) => s.hydrateDrivers);

  useEffect(() => {
    void hydrate();
    const i = setInterval(() => void hydrate(), 5000);
    return () => clearInterval(i);
  }, [hydrate]);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Radio className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">Radar — Live Drivers</h3>
      </div>

      <p className="text-xs text-muted-foreground">
        You: {(currentLocation?.lat ?? 0).toFixed(4)}, {(currentLocation?.lng ?? 0).toFixed(4)}
      </p>

      {drivers.length === 0 ? (
        <p className="text-xs text-muted-foreground">No drivers online</p>
      ) : (
        <ul className="space-y-1.5">
          {drivers.map((d) => (
            <li
              key={d.orbit_id}
              className="flex items-center justify-between rounded-lg bg-muted/20 px-3 py-2"
            >
              <div className="flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-sm text-foreground truncate">
                  {d.orbit_id.slice(0, 12)}…
                </span>
              </div>
              <span className="text-xs text-muted-foreground shrink-0 ml-2">
                {d.lat?.toFixed(4)}, {d.lng?.toFixed(4)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
