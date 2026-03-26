import React from "react";
import { MapPin, Navigation } from "lucide-react";

export function RideLiveMap({ driver, pickup, dropoff }: any) {
  return (
    <div className="h-80 rounded-xl bg-muted border border-border flex items-center justify-center relative overflow-hidden">
      <div className="text-center space-y-2">
        <Navigation className="w-6 h-6 text-primary mx-auto" />
        <div className="text-sm font-medium text-foreground">Live Map</div>
        {driver?.lat != null && (
          <div className="text-xs text-muted-foreground flex items-center gap-1 justify-center">
            <MapPin className="w-3 h-3" />
            {Number(driver.lat).toFixed(4)}, {Number(driver.lng).toFixed(4)}
          </div>
        )}
      </div>
    </div>
  );
}
