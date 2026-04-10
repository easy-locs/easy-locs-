import { useNavigate } from "react-router-dom";
import { LiveOrderTrackingCard } from "@/components/live/LiveOrderTrackingCard";
import { DriverMiniMap } from "@/components/live/DriverMiniMap";

export default function LiveTrackingPage() {
  const navigate = useNavigate();

  return (
    <div className="max-w-md mx-auto px-4 py-4 space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center">←</button>
        <div>
          <h1 className="text-lg font-bold">Live Tracking</h1>
          <p className="text-xs text-muted-foreground">Real-time order status</p>
        </div>
      </div>

      <LiveOrderTrackingCard />
      <DriverMiniMap />
    </div>
  );
}
