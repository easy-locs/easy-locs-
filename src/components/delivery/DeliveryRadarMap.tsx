import { useEffect } from "react";
import { useLocationStore } from "@/stores/locationStore";
import { MapPin, Radio } from "lucide-react";

export function DeliveryRadarMap() {
  const currentLocation = useLocationStore((s) => s.currentLocation);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Radio className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">Delivery Radar</h3>
      </div>
      <div className="h-32 bg-muted/20 rounded-lg flex items-center justify-center">
        <div className="text-center">
          <MapPin className="w-6 h-6 text-primary mx-auto mb-1" />
          <p className="text-xs text-muted-foreground">
            {currentLocation?.lat ? `${currentLocation.lat.toFixed(4)}, ${currentLocation.lng?.toFixed(4)}` : "Location not available"}
          </p>
          <p className="text-[10px] text-muted-foreground/60 mt-1">Scanning for riders...</p>
        </div>
      </div>
    </div>
  );
}
