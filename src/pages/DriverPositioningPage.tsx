import { useState } from "react";
import { BackCard } from "@/components/ui/back-card";
import { suggestBestDriverZone } from "@/lib/ai/suggest-best-driver-zone";

export default function DriverPositioningPage() {
  const [zone, setZone] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const handleSuggest = async () => {
    setLoading(true);
    try {
      const result = await suggestBestDriverZone("CURRENT_DRIVER_ID");
      setZone(result);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="mx-auto max-w-md space-y-6">
        <BackCard title="Smart Positioning" />

        <p className="text-sm text-muted-foreground">
          AI suggests the best live zone to increase trips
        </p>

        <button
          onClick={handleSuggest}
          disabled={loading}
          className="w-full rounded-2xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground"
        >
          {loading ? "Analyzing..." : "Find best zone"}
        </button>

        {zone && (
          <div className="rounded-2xl border border-border bg-card p-4">
            <p className="font-semibold">{zone.zone_key}</p>
            <p className="text-sm text-muted-foreground mt-1">
              Surge {Number(zone.surge_multiplier || 1).toFixed(2)}x · Predicted demand{" "}
              {zone.predicted_demand}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
