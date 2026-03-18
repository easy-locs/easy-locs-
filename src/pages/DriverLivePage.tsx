import { useEffect, useState } from "react";
import { BackCard } from "@/components/ui/back-card";
import { useActiveWorkspace } from "@/hooks/useActiveWorkspace";
import { getOrCreateDriverProfile, updateDriverAvailability } from "@/lib/services/service-profiles";
import { useDriverLiveMode } from "@/hooks/useDriverLiveMode";

export default function DriverLivePage() {
  const { activeWorkspace } = useActiveWorkspace();
  const [driver, setDriver] = useState<any | null>(null);
  const [liveEnabled, setLiveEnabled] = useState(false);

  useEffect(() => {
    if (!activeWorkspace?.id) return;
    getOrCreateDriverProfile({
      workspaceId: activeWorkspace.id,
      serviceMode: "delivery",
      vehicleType: "bike",
    }).then(setDriver).catch(console.error);
  }, [activeWorkspace?.id]);

  const { coords, error } = useDriverLiveMode({
    enabled: liveEnabled,
    driverId: driver?.id,
    serviceMode: driver?.service_mode,
  });

  const goOnline = async () => {
    if (!driver) return;
    const updated = await updateDriverAvailability({
      driverId: driver.id,
      isOnline: true,
      isAvailable: true,
      currentStatus: "online",
    });
    setDriver(updated);
    setLiveEnabled(true);
  };

  const goOffline = async () => {
    if (!driver) return;
    const updated = await updateDriverAvailability({
      driverId: driver.id,
      isOnline: false,
      isAvailable: false,
      currentStatus: "offline",
    });
    setDriver(updated);
    setLiveEnabled(false);
  };

  return (
    <div className="min-h-screen bg-background p-4 space-y-6">
      <BackCard label="Back" to="/dashboard" />
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-foreground">Driver Live</h1>
        <p className="text-sm text-muted-foreground">Online / offline · GPS live · delivery or taxi mode</p>
      </div>

      <div className="flex gap-2">
        <button onClick={goOnline} className="flex-1 bg-primary text-primary-foreground py-2 rounded-xl text-sm font-semibold">Go online</button>
        <button onClick={goOffline} className="flex-1 bg-secondary text-secondary-foreground py-2 rounded-xl text-sm font-semibold">Go offline</button>
      </div>

      {!!driver && (
        <div className="bg-card border border-border rounded-xl p-4 space-y-1">
          <p className="text-sm text-foreground">mode: {driver.service_mode}</p>
          <p className="text-xs text-muted-foreground">vehicle: {driver.vehicle_type}</p>
          <p className="text-xs text-muted-foreground">status: {driver.current_status}</p>
          <p className="text-xs text-muted-foreground">online: {driver.is_online ? "yes" : "no"} · available: {driver.is_available ? "yes" : "no"}</p>
        </div>
      )}

      {!!coords && (
        <div className="bg-card border border-border rounded-xl p-4 space-y-1">
          <p className="text-xs text-muted-foreground">lat: {coords.latitude.toFixed(6)}</p>
          <p className="text-xs text-muted-foreground">lng: {coords.longitude.toFixed(6)}</p>
          <p className="text-xs text-muted-foreground">accuracy: {coords.accuracy?.toFixed(0)}m</p>
        </div>
      )}

      {!!error && (
        <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-4">
          <p className="text-sm text-destructive">Location error: {error}</p>
        </div>
      )}
    </div>
  );
}
