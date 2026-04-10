import { MapPin, Navigation } from "lucide-react";
import MapPreview from "@/components/ui/MapPreview";

interface Props {
  lat?: number | null;
  lng?: number | null;
  address?: string;
  city?: string;
  country?: string;
  className?: string;
}

/** Opens external navigation app with the listing's coordinates */
function openDirections(lat: number, lng: number, label: string = "") {
  const encodedLabel = encodeURIComponent(label);
  // iOS detection
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  if (isIOS) {
    window.open(`maps://maps.apple.com/?daddr=${lat},${lng}&q=${encodedLabel}`, "_blank");
  } else {
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&destination_place_id=${encodedLabel}`, "_blank");
  }
}

/**
 * Map section for public listing pages with a "Get Directions" button.
 * Lightweight — opens native maps apps for actual navigation.
 */
const ListingMapSection = ({ lat, lng, address, city, country, className = "" }: Props) => {
  if (!lat || !lng) return null;

  const locationLabel = [address, city, country].filter(Boolean).join(", ");

  return (
    <div className={`space-y-3 ${className}`}>
      <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
        <MapPin className="h-5 w-5 text-accent" /> Location
      </h2>
      <MapPreview lat={lat} lng={lng} className="h-48 sm:h-56" />
      {locationLabel && (
        <p className="text-sm text-muted-foreground flex items-center gap-1.5">
          <MapPin className="h-3.5 w-3.5 shrink-0" /> {locationLabel}
        </p>
      )}
      <button
        onClick={() => openDirections(lat, lng, locationLabel)}
        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-accent text-accent-foreground font-semibold text-sm hover:opacity-90 transition-opacity"
      >
        <Navigation className="h-4 w-4" /> Get Directions
      </button>
    </div>
  );
};

export default ListingMapSection;
