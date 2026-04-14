import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useActiveWorkspace } from "@/hooks/useActiveWorkspace";
import { getOrCreateDriverProfile, updateDriverAvailability } from "@/lib/services/service-profiles";
import { useDriverLiveMode } from "@/hooks/useDriverLiveMode";
import { useUiEngine } from "@/hooks/useUiEngine";
import {
  ArrowLeft, Power, Satellite, Navigation, MapPin, Signal,
  Car, Bike, Settings, Shield, Zap
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useUiEngine } from "@/hooks/useUiEngine";

export default function DriverLivePage() {
  useUiEngine("driver-live");
  const navigate = useNavigate();
  const { activeWorkspace } = useActiveWorkspace();
  const [driver, setDriver] = useState<any | null>(null);
  const [liveEnabled, setLiveEnabled] = useState(false);

  useEffect(() => {
    if (!activeWorkspace?.id) return;
    getOrCreateDriverProfile({
      workspaceId: activeWorkspace.id,
      serviceMode: "delivery",
      vehicleType: "bike",
    }).then(setDriver).catch(() => {
      toast.error("Failed to load driver profile");
    });
  }, [activeWorkspace?.id]);

  const { coords, error } = useDriverLiveMode({
    enabled: liveEnabled,
    driverId: driver?.id,
    serviceMode: driver?.service_mode,
  });

  const goOnline = async () => {
    if (!driver) return;
    try {
      const updated = await updateDriverAvailability({
        driverId: driver.id,
        isOnline: true,
        isAvailable: true,
        currentStatus: "online",
      });
      setDriver(updated);
      setLiveEnabled(true);
      toast.success("You're now online!");
    } catch { toast.error("Could not go online"); }
  };

  const goOffline = async () => {
    if (!driver) return;
    try {
      const updated = await updateDriverAvailability({
        driverId: driver.id,
        isOnline: false,
        isAvailable: false,
        currentStatus: "offline",
      });
      setDriver(updated);
      setLiveEnabled(false);
      toast.success("You're now offline");
    } catch { toast.error("Could not go offline"); }
  };

  const isOnline = driver?.is_online;
  const modeLabel = driver?.service_mode === "taxi" ? "Taxi" : "Delivery";
  const vehicleLabel = driver?.vehicle_type === "car" ? "Car" : driver?.vehicle_type === "bike" ? "Bike" : driver?.vehicle_type || "—";

  return (
    <div className="app-mobile-page flex flex-col bg-background">
      <header className="flex items-center gap-3 px-4 pt-4 pb-2 shrink-0">
        <button onClick={() => navigate("/driver/dashboard")} className="w-9 h-9 rounded-xl flex items-center justify-center bg-muted/60 active:scale-95 transition-transform">
          <ArrowLeft className="w-4.5 h-4.5" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-bold text-foreground tracking-tight">Live Cockpit</h1>
          <p className="text-[11px] text-muted-foreground">GPS tracking & availability</p>
        </div>
        <button onClick={() => navigate("/settings")} className="w-9 h-9 rounded-xl flex items-center justify-center bg-muted/60 active:scale-95 transition-transform">
          <Settings className="w-4 h-4 text-muted-foreground" />
        </button>
      </header>

      <div className="flex-1 overflow-y-auto px-4 pb-24 space-y-4 pt-2">
        <div className={cn(
          "rounded-2xl p-5 border-2 transition-all text-center space-y-4",
          isOnline
            ? "border-emerald-500/30 bg-gradient-to-br from-emerald-500/8 to-emerald-500/3"
            : "border-border/20 bg-card"
        )}>
          <div className={cn(
            "w-16 h-16 rounded-full mx-auto flex items-center justify-center transition-colors",
            isOnline ? "bg-emerald-500/15" : "bg-muted"
          )}>
            <Power className={cn("w-7 h-7", isOnline ? "text-emerald-500" : "text-muted-foreground")} />
          </div>
          <div>
            <p className="text-lg font-bold text-foreground">{isOnline ? "Online" : "Offline"}</p>
            <p className="text-xs text-muted-foreground">{isOnline ? "Receiving jobs — GPS active" : "Tap to start receiving jobs"}</p>
          </div>
          <button
            onClick={isOnline ? goOffline : goOnline}
            className={cn(
              "w-full rounded-2xl py-3.5 text-sm font-bold transition-all active:scale-[0.97]",
              isOnline
                ? "bg-red-500/10 text-red-500 border border-red-500/20"
                : "bg-emerald-500 text-white shadow-lg shadow-emerald-500/25"
            )}
          >
            {isOnline ? "Go Offline" : "Go Online"}
          </button>
        </div>

        {driver && (
          <div className="rounded-2xl border border-border/15 bg-card p-4">
            <p className="text-[11px] uppercase tracking-wider font-bold text-muted-foreground mb-3">Profile</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  {driver.service_mode === "taxi" ? <Car className="w-4 h-4 text-blue-500" /> : <Bike className="w-4 h-4 text-blue-500" />}
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] text-muted-foreground">Mode</p>
                  <p className="text-xs font-bold text-foreground">{modeLabel}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center">
                  <Navigation className="w-4 h-4 text-violet-500" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] text-muted-foreground">Vehicle</p>
                  <p className="text-xs font-bold text-foreground">{vehicleLabel}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                  <Shield className="w-4 h-4 text-emerald-500" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] text-muted-foreground">Status</p>
                  <p className="text-xs font-bold text-foreground capitalize">{driver.current_status || "—"}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                  <Zap className="w-4 h-4 text-amber-500" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] text-muted-foreground">Available</p>
                  <p className="text-xs font-bold text-foreground">{driver.is_available ? "Yes" : "No"}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {coords && (
          <div className="rounded-2xl border border-border/15 bg-card p-4">
            <div className="flex items-center gap-2 mb-3">
              <Satellite className="w-4 h-4 text-emerald-500" />
              <p className="text-[11px] uppercase tracking-wider font-bold text-muted-foreground">GPS Signal</p>
              <div className="ml-auto flex items-center gap-1">
                <Signal className="w-3 h-3 text-emerald-500" />
                <span className="text-[10px] font-bold text-emerald-500">Active</span>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-xl bg-muted/30 p-2.5 text-center">
                <p className="text-[10px] text-muted-foreground">Latitude</p>
                <p className="text-xs font-bold text-foreground tabular-nums">{coords.latitude.toFixed(5)}</p>
              </div>
              <div className="rounded-xl bg-muted/30 p-2.5 text-center">
                <p className="text-[10px] text-muted-foreground">Longitude</p>
                <p className="text-xs font-bold text-foreground tabular-nums">{coords.longitude.toFixed(5)}</p>
              </div>
              <div className="rounded-xl bg-muted/30 p-2.5 text-center">
                <p className="text-[10px] text-muted-foreground">Accuracy</p>
                <p className="text-xs font-bold text-foreground tabular-nums">{coords.accuracy?.toFixed(0) || "—"}m</p>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-4 flex items-start gap-3">
            <MapPin className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-destructive">Location Error</p>
              <p className="text-[11px] text-destructive/80 mt-0.5">{error}</p>
            </div>
          </div>
        )}

        <button
          onClick={() => navigate("/driver/live-missions")}
          className="w-full rounded-2xl bg-primary text-primary-foreground px-4 py-3.5 text-sm font-bold active:scale-[0.97] transition-transform shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
        >
          <Navigation className="w-4 h-4" />
          View Live Missions
        </button>
      </div>
    </div>
  );
}
