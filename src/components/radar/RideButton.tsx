/**
 * RideButton — Smart ride CTA with radar awareness.
 * Shows driver count + best ETA, triggers matching on click.
 */
import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Car, Zap, Loader2 } from "lucide-react";
import { useRadar } from "@/hooks/useRadar";
import { selectBestDriver } from "@/lib/radar/radar-engine";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { haptic } from "@/lib/haptics";

interface RideButtonProps {
  className?: string;
  variant?: "full" | "compact";
}

export default function RideButton({ className = "", variant = "full" }: RideButtonProps) {
  const { radar, formatETA } = useRadar({ type: "taxi" });
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const handleRide = useCallback(async () => {
    haptic("medium");

    if (!user) {
      navigate("/login");
      return;
    }

    if (!radar || radar.availableCount === 0) {
      toast.error("No drivers nearby — try again shortly");
      return;
    }

    setLoading(true);
    try {
      const best = selectBestDriver(radar.nearbyDrivers);
      if (!best) {
        toast.error("No available drivers right now");
        return;
      }

      // Navigate to ride flow
      navigate("/mobility/taxi");
    } catch (err) {
      toast.error("Could not start ride");
    } finally {
      setLoading(false);
    }
  }, [user, radar, navigate]);

  if (variant === "compact") {
    return (
      <button
        onClick={handleRide}
        disabled={loading}
        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all active:scale-95 ${className}`}
        style={{
          background: "hsl(var(--hud-primary))",
          color: "white",
          boxShadow: "0 4px 16px hsl(var(--hud-primary) / 0.3)",
        }}
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Car className="h-4 w-4" />}
        <span>Ride</span>
        {radar && radar.etaMinutes !== null && (
          <span className="text-xs opacity-80">· {formatETA(radar.etaMinutes)}</span>
        )}
      </button>
    );
  }

  return (
    <motion.button
      onClick={handleRide}
      disabled={loading}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.97 }}
      className={`w-full p-4 rounded-2xl font-bold text-base transition-all relative overflow-hidden ${className}`}
      style={{
        background: "linear-gradient(135deg, hsl(var(--hud-primary)), hsl(var(--hud-primary) / 0.85))",
        color: "white",
        boxShadow: "0 6px 24px hsl(var(--hud-primary) / 0.3)",
      }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {loading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Car className="h-5 w-5" />
          )}
          <span>🚕 Get a ride</span>
        </div>

        {radar && radar.availableCount > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs opacity-80">
              {radar.availableCount} nearby
            </span>
            {radar.etaMinutes !== null && (
              <span className="flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full"
                style={{ background: "hsl(0 0% 100% / 0.2)" }}>
                <Zap className="h-3 w-3" />
                {formatETA(radar.etaMinutes)}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Shimmer */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full hover:translate-x-full transition-transform duration-700" />
    </motion.button>
  );
}
