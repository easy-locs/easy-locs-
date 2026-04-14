/**
 * CustomerLiveLocationPage — Uses canonical locationStore for live position.
 */
import { useNavigate } from "react-router-dom";
import { useLocationStore } from "@/stores/locationStore";
import { useUiEngine } from "@/hooks/useUiEngine";
import SubPageShell from "@/components/layout/SubPageShell";

export default function CustomerLiveLocationPage() {
  useUiEngine("customer-customerlivelocationpage");
  const navigate = useNavigate();
  const loc = useLocationStore((s) => s.currentLocation);
  const error = useLocationStore((s) => s.error);

  return (
    <SubPageShell title="Live Location" subtitle="Share your real-time position" onBack={() => navigate(-1)}>
      {error ? (
        <p className="py-8 text-center text-sm text-destructive">{error}</p>
      ) : loc ? (
        <div className="rounded-2xl border border-border/20 bg-card p-4 space-y-2">
          <p className="text-sm text-foreground">Latitude: <span className="font-bold">{loc.lat.toFixed(6)}</span></p>
          <p className="text-sm text-foreground">Longitude: <span className="font-bold">{loc.lng.toFixed(6)}</span></p>
          {loc.accuracy != null && (
            <p className="text-xs text-muted-foreground">Accuracy: {Math.round(loc.accuracy)}m</p>
          )}
        </div>
      ) : (
        <div className="mx-auto h-16 rounded-2xl bg-muted animate-pulse" />
      )}
    </SubPageShell>
  );
}
