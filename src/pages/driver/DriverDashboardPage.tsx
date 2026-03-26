import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useDriverLive } from "@/hooks/useDriverLive";
import { setDriverLiveStatus } from "@/lib/driver/driverLive";
import { ArrowLeft, Navigation, Power, Zap } from "lucide-react";
import { toast } from "sonner";

export default function DriverDashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: profile, refetch } = useDriverLive(user?.id);

  const online = !!profile?.is_online;
  const available = !!profile?.is_available;

  const toggleOnline = async () => {
    if (!user?.id) return;
    try {
      await setDriverLiveStatus({
        userId: user.id,
        isOnline: !online,
        currentStatus: !online ? "online" : "offline",
      });
      refetch();
    } catch (err: any) {
      toast.error(err.message || "Could not update online status");
    }
  };

  const toggleAvailable = async () => {
    if (!user?.id) return;
    try {
      await setDriverLiveStatus({
        userId: user.id,
        isAvailable: !available,
        currentStatus: !available ? "available" : "busy",
      });
      refetch();
    } catch (err: any) {
      toast.error(err.message || "Could not update availability");
    }
  };

  return (
    <div className="app-mobile-page flex flex-col bg-background">
      <header className="flex items-center gap-3 px-4 pt-4 pb-3">
        <button onClick={() => navigate("/")} className="w-9 h-9 rounded-xl flex items-center justify-center bg-muted active:scale-95 transition-transform">
          <ArrowLeft className="w-4.5 h-4.5" />
        </button>
        <div>
          <h1 className="text-lg font-bold text-foreground">Driver Dashboard</h1>
          <p className="text-xs text-muted-foreground">Mission-oriented operations</p>
        </div>
      </header>

      <div className="flex-1 px-4 pb-24 space-y-4">
        {/* Status toggles */}
        <div className="rounded-2xl border border-border/20 bg-card p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Power className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-semibold text-foreground">Online</span>
            </div>
            <button
              onClick={toggleOnline}
              className={`rounded-full px-4 py-2 text-xs font-bold transition-colors ${
                online ? "bg-emerald-500/10 text-emerald-400" : "bg-muted text-muted-foreground"
              }`}
            >
              {online ? "Online" : "Offline"}
            </button>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-semibold text-foreground">Availability</span>
            </div>
            <button
              onClick={toggleAvailable}
              className={`rounded-full px-4 py-2 text-xs font-bold transition-colors ${
                available ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
              }`}
            >
              {available ? "Available" : "Busy"}
            </button>
          </div>
        </div>

        {/* Profile Status */}
        <div className="rounded-2xl border border-border/20 bg-card p-4">
          <p className="text-sm font-bold text-foreground">Profile Status</p>
          <p className="mt-2 text-sm text-muted-foreground">
            current: {(profile as any)?.current_status || "unknown"}
          </p>
        </div>

        {/* Quick actions */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => navigate("/driver/missions")}
            className="rounded-2xl bg-primary text-primary-foreground px-4 py-4 text-sm font-bold flex items-center justify-center gap-2 active:scale-[0.97] transition-transform"
          >
            <Navigation className="w-4 h-4" />
            View Missions
          </button>
          <button
            onClick={() => navigate("/driver/missions")}
            className="rounded-2xl bg-muted px-4 py-4 text-sm font-bold text-foreground flex items-center justify-center gap-2 active:scale-[0.97] transition-transform"
          >
            History
          </button>
        </div>

        {/* Earnings placeholder */}
        <div className="rounded-2xl border border-border/20 bg-card p-4">
          <p className="text-sm font-bold text-foreground">Earnings</p>
          <p className="mt-2 text-sm text-muted-foreground">No earnings data available</p>
        </div>
      </div>
    </div>
  );
}
