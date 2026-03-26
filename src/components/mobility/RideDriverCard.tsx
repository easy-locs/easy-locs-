/**
 * RideDriverCard — Displays assigned driver info with call/chat actions.
 */
import { Button } from "@/components/ui/button";
import { tc } from "@/lib/i18n-canonical";
import { Phone, MessageSquare, Star } from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";

interface Props {
  driver: {
    display_name?: string;
    vehicle_type?: string;
    vehicle_model?: string;
    vehicle_plate?: string;
    rating?: number;
    photo_url?: string;
  } | null;
  conversationId?: string | null;
  phone?: string | null;
}

export function RideDriverCard({ driver, conversationId, phone }: Props) {
  const navigate = useNavigate();
  if (!driver) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="rounded-2xl border border-border bg-card p-4"
    >
      <div className="flex items-center gap-3">
        {/* Avatar */}
        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center text-lg font-bold text-foreground shrink-0">
          {driver.photo_url ? (
            <img src={driver.photo_url} alt="" className="w-full h-full rounded-full object-cover" />
          ) : (
            driver.display_name?.[0]?.toUpperCase() ?? "D"
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">
            {driver.display_name ?? tc("ride.your_driver")}
          </p>
          <p className="text-xs text-muted-foreground">
            {driver.vehicle_model ?? driver.vehicle_type ?? tc("ride.vehicle")}
            {driver.vehicle_plate ? ` · ${driver.vehicle_plate}` : ""}
          </p>
          {driver.rating != null && (
            <div className="flex items-center gap-1 mt-0.5">
              <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
              <span className="text-xs font-medium text-foreground">
                {Number(driver.rating).toFixed(1)}
              </span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            size="icon"
            variant="outline"
            className="h-10 w-10 rounded-xl"
            aria-label={tc("orbit.call")}
            onClick={() => {
              if (conversationId) navigate(`/messages/${conversationId}`);
              else navigate("/messages");
            }}
          >
            <MessageSquare className="w-4 h-4" />
          </Button>
          <Button
            size="icon"
            variant="outline"
            className="h-10 w-10 rounded-xl"
            aria-label={tc("orbit.voice_call")}
            onClick={() => {
              if (phone) window.open(`tel:${phone}`, "_self");
            }}
          >
            <Phone className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
