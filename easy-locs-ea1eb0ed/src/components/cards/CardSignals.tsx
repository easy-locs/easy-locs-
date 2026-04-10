/**
 * CardSignals — Rating, ETA, distance indicators.
 */
import { Star, Clock, MapPin } from "lucide-react";

interface CardSignalsProps {
  rating?: number;
  eta?: string;
  distance?: string;
}

export function CardSignals({ rating, eta, distance }: CardSignalsProps) {
  if (rating == null && !eta && !distance) return null;

  return (
    <div className="flex items-center gap-3 mt-0.5 flex-wrap">
      {rating != null && (
        <span className="flex items-center gap-0.5 text-2xs font-semibold text-accent">
          <Star className="h-2.5 w-2.5 fill-current" /> {rating.toFixed(1)}
        </span>
      )}
      {eta && (
        <span className="flex items-center gap-0.5 text-2xs text-muted-foreground">
          <Clock className="h-2.5 w-2.5" /> {eta}
        </span>
      )}
      {distance && (
        <span className="flex items-center gap-0.5 text-2xs text-muted-foreground">
          <MapPin className="h-2.5 w-2.5" /> {distance}
        </span>
      )}
    </div>
  );
}
