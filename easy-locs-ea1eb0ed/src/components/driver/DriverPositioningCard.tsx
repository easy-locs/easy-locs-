import { useState } from "react";
import { suggestDriverPosition } from "@/lib/ai/driver-positioning";

export default function DriverPositioningCard({ driverId }: { driverId?: string }) {
  const [zone, setZone] = useState<any>(null);

  const run = async () => {
    const z = await suggestDriverPosition(driverId ?? "CURRENT_DRIVER_ID");
    setZone(z);
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <p className="font-semibold">Smart positioning</p>

      <button
        onClick={run}
        className="mt-3 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
      >
        Find best zone
      </button>

      {zone && (
        <p className="mt-2 text-sm text-muted-foreground">
          Move to: {zone.zone_key} · Surge {Number(zone.surge_multiplier || 1).toFixed(2)}x
        </p>
      )}
    </div>
  );
}
