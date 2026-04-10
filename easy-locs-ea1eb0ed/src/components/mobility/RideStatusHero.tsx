/**
 * RideStatusHero — Big status + ETA hero block at top of TrackRidePage.
 */
import { tc } from "@/lib/i18n-canonical";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { isPrePickupStatus, isInTripStatus, isFinalStatus } from "@/lib/mobility/status-machine";
import {
  Loader2, Car, Navigation, MapPin, CheckCircle2, XCircle, AlertTriangle, Clock,
} from "lucide-react";
import type { LiveETA } from "@/lib/mobility/live-eta-computer";

const STATUS_ICON: Record<string, React.ReactNode> = {
  searching: <Loader2 className="w-5 h-5 animate-spin" />,
  offered: <Loader2 className="w-5 h-5 animate-spin" />,
  accepted: <Car className="w-5 h-5" />,
  rider_arriving_pickup: <Navigation className="w-5 h-5" />,
  rider_arrived_pickup: <MapPin className="w-5 h-5" />,
  picked_up: <CheckCircle2 className="w-5 h-5" />,
  in_progress: <Navigation className="w-5 h-5" />,
  rider_arriving_dropoff: <Navigation className="w-5 h-5" />,
  completed: <CheckCircle2 className="w-5 h-5" />,
  cancelled: <XCircle className="w-5 h-5" />,
  failed_no_rider: <AlertTriangle className="w-5 h-5" />,
};

const STATUS_COLOR: Record<string, string> = {
  searching: "text-amber-500",
  offered: "text-amber-500",
  accepted: "text-primary",
  rider_arriving_pickup: "text-primary",
  rider_arrived_pickup: "text-emerald-500",
  picked_up: "text-emerald-500",
  in_progress: "text-sky-500",
  rider_arriving_dropoff: "text-sky-500",
  completed: "text-emerald-500",
  cancelled: "text-destructive",
  failed_no_rider: "text-destructive",
};

interface Props {
  status: string;
  eta: LiveETA | null;
  jobType?: string;
}

export function RideStatusHero({ status, eta, jobType }: Props) {
  const icon = STATUS_ICON[status] ?? null;
  const color = STATUS_COLOR[status] ?? "text-muted-foreground";
  const label = tc(`ride.status_${status}`);

  let etaText = "";
  if (eta) {
    if (isPrePickupStatus(status) && eta.etaPickupMinutes != null) {
      etaText = tc("ride.eta_pickup", { minutes: String(eta.etaPickupMinutes), km: String(eta.distancePickupKm ?? "—") });
    } else if (isInTripStatus(status) && eta.etaDestinationMinutes != null) {
      etaText = tc("ride.eta_destination", { minutes: String(eta.etaDestinationMinutes) });
    }
  }

  return (
    <motion.div
      key={status}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-3"
    >
      <div className={cn("w-11 h-11 rounded-xl flex items-center justify-center bg-muted/50", color)}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <h1 className="text-lg font-bold text-foreground">{label}</h1>
        <p className="text-xs text-muted-foreground truncate">
          {etaText || (jobType ? jobType.replace(/_/g, " ") : "")}
        </p>
      </div>
      {eta && !isFinalStatus(status) && (
        <div className="flex items-center gap-1 bg-card border border-border rounded-lg px-2 py-1">
          <Clock className="w-3 h-3 text-primary" />
          <span className="text-xs font-bold text-foreground">
            {eta.etaPickupMinutes ?? eta.etaDestinationMinutes ?? "—"} min
          </span>
        </div>
      )}
    </motion.div>
  );
}
