/**
 * LocationDebugPanel — Internal diagnostics for GPS, markers, entities.
 * Toggle with triple-tap on the map tab title or via dev menu.
 */
import { useLocationStore } from "@/stores/locationStore";
import { useGeoEntities } from "@/hooks/useGeoEntities";
import { useState } from "react";
import { Bug, X } from "lucide-react";

export function LocationDebugPanel() {
  const [open, setOpen] = useState(false);
  const loc = useLocationStore();
  const { entities, storefronts, properties, services, realEstate } = useGeoEntities();

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-20 left-3 z-50 w-8 h-8 rounded-full bg-card/90 backdrop-blur-md border border-border/20 flex items-center justify-center shadow-lg"
      >
        <Bug className="h-3.5 w-3.5 text-muted-foreground" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-20 left-3 z-50 w-72 rounded-2xl bg-card/95 backdrop-blur-xl border border-border/30 shadow-2xl p-3 text-[11px] space-y-2">
      <div className="flex items-center justify-between">
        <span className="font-bold text-foreground">📍 Location Debug</span>
        <button onClick={() => setOpen(false)}><X className="h-3.5 w-3.5 text-muted-foreground" /></button>
      </div>

      <div className="space-y-1 text-muted-foreground">
        <Row label="Permission" value={loc.permissionState} />
        <Row label="Loading" value={loc.loading ? "Yes" : "No"} />
        <Row label="Fallback" value={loc.isFallback ? "⚠️ Yes" : "No"} />
        <Row label="Lat" value={loc.currentLocation?.lat?.toFixed(6) || "—"} />
        <Row label="Lng" value={loc.currentLocation?.lng?.toFixed(6) || "—"} />
        <Row label="Accuracy" value={loc.currentLocation?.accuracy ? `${Math.round(loc.currentLocation.accuracy)}m` : "—"} />
        <Row label="Selected" value={loc.selectedLocation?.label || "—"} />
        <Row label="Radius" value={`${loc.searchRadiusKm} km`} />
      </div>

      <div className="border-t border-border/20 pt-1.5 space-y-1 text-muted-foreground">
        <span className="font-bold text-foreground text-[10px]">Geo Entities</span>
        <Row label="Total" value={String(entities.length)} />
        <Row label="Storefronts" value={String(storefronts.length)} />
        <Row label="Properties" value={String(properties.length)} />
        <Row label="Services" value={String(services.length)} />
        <Row label="Real Estate" value={String(realEstate.length)} />
      </div>

      {loc.error && (
        <div className="text-destructive text-[10px] bg-destructive/10 rounded-lg px-2 py-1">
          {loc.error}
        </div>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span>{label}</span>
      <span className="font-mono text-foreground">{value}</span>
    </div>
  );
}
