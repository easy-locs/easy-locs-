// CommsDiagnosticPanel — gutted after debugCommsStore removal (Batch A purge)
import { useOrbitStore } from "@/stores/orbitStore";
import { useLocationStore } from "@/stores/locationStore";

export function CommsDiagnosticPanel() {
  const orbit = useOrbitStore((s) => s.profile);
  const currentLocation = useLocationStore((s) => s.currentLocation);

  return (
    <div className="p-4 space-y-2 text-xs text-muted-foreground">
      <p>Orbit: {orbit?.orbitId ?? "none"}</p>
      <p>Location: {currentLocation ? `${currentLocation.lat}, ${currentLocation.lng}` : "none"}</p>
      <p className="italic">Debug store removed (Batch A purge)</p>
    </div>
  );
}
