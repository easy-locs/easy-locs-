/**
 * LocationDebugPanel — Enhanced diagnostics for GPS, markers, entities, zones.
 * Toggle with triple-tap on map tab or dev menu.
 */
import { useLocationStore } from "@/stores/locationStore";
import { useGeoEntities } from "@/hooks/useGeoEntities";
import { useState } from "react";
import { Bug, X, MapPin, Wifi, WifiOff } from "lucide-react";
import { getAccuracyLevel } from "@/config/ui";

export function LocationDebugPanel() {
  const [open, setOpen] = useState(false);
  const loc = useLocationStore();
  const geoEntities = useGeoEntities();
  const entities = geoEntities?.entities ?? [];
  const storefronts = geoEntities?.storefronts ?? [];

  const accuracy = loc.currentLocation?.accuracy;
  const accLevel = getAccuracyLevel(accuracy);

  const source = loc.isFallback
    ? "fallback"
    : loc.currentLocation
      ? "gps"
      : loc.lastKnownLocation
        ? "lastKnown"
        : "none";

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-20 left-3 z-50 w-8 h-8 rounded-full bg-card/90 backdrop-blur-md border border-border/20 flex items-center justify-center shadow-lg active:scale-90 transition-transform"
      >
        <Bug className="h-3.5 w-3.5 text-muted-foreground" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-20 left-3 z-50 w-72 rounded-2xl bg-card/95 backdrop-blur-xl border border-border/30 shadow-2xl p-3 text-[11px] space-y-2">
      <div className="flex items-center justify-between">
        <span className="font-bold text-foreground flex items-center gap-1.5">
          <MapPin className="h-3.5 w-3.5" /> Location Debug
        </span>
        <button onClick={() => setOpen(false)} className="active:scale-90 transition-transform">
          <X className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
      </div>

      {/* GPS State */}
      <div className="space-y-1 text-muted-foreground">
        <Row label="Source" value={source} valueClass={source === "gps" ? "text-emerald-500" : source === "fallback" ? "text-amber-500" : ""} />
        <Row label="Permission" value={loc.permissionState} />
        <Row label="Loading" value={loc.loading ? "Yes" : "No"} />
        <Row label="Fallback" value={loc.isFallback ? "⚠️ Yes" : "No"} />
        <Row label="Lat" value={loc.currentLocation?.lat?.toFixed(6) || "—"} />
        <Row label="Lng" value={loc.currentLocation?.lng?.toFixed(6) || "—"} />
        <Row
          label="Accuracy"
          value={accuracy ? `${Math.round(accuracy)}m (${accLevel.label})` : "—"}
          valueClass={accLevel.color}
        />
      </div>

      {/* Selected / Pickup / Dropoff */}
      <div className="border-t border-border/20 pt-1.5 space-y-1 text-muted-foreground">
        <Row label="Selected" value={loc.selectedLocation?.label || "—"} />
        <Row label="Pickup" value={loc.pickupLocation?.label || "—"} />
        <Row label="Dropoff" value={loc.dropoffLocation?.label || "—"} />
        <Row label="Radius" value={`${loc.searchRadiusKm} km`} />
      </div>

      {/* Entities */}
      <div className="border-t border-border/20 pt-1.5 space-y-1 text-muted-foreground">
        <span className="font-bold text-foreground text-[10px] flex items-center gap-1">
          {entities.length > 0 ? <Wifi className="h-3 w-3 text-emerald-500" /> : <WifiOff className="h-3 w-3 text-red-400" />}
          Geo Entities
        </span>
        <Row label="Total" value={String(entities.length)} />
        <Row label="Storefronts" value={String(storefronts.length)} />
        <Row label="With coords" value={String(entities.filter((e: any) => e.lat && e.lng).length)} />
      </div>

      {loc.error && (
        <div className="text-destructive text-[10px] bg-destructive/10 rounded-lg px-2 py-1">
          {loc.error}
        </div>
      )}
    </div>
  );
}

function Row({ label, value, valueClass }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="flex justify-between">
      <span>{label}</span>
      <span className={`font-mono text-foreground ${valueClass || ""}`}>{value}</span>
    </div>
  );
}
