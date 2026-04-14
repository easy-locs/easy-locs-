import { MapPin, Navigation, ExternalLink } from "lucide-react";
import MapPreview from "@/components/ui/MapPreview";
import { useInAppNavigation } from "@/stores/useInAppNavigation";
import { openExternalMaps } from "@/lib/location/geocode";

interface Props {
  lat?: number | null;
  lng?: number | null;
  address?: string;
  city?: string;
  country?: string;
  className?: string;
}

const ListingMapSection = ({ lat, lng, address, city, country, className = "" }: Props) => {
  const openNavigation = useInAppNavigation((s) => s.openNavigation);

  if (lat == null || lng == null) return null;

  const locationLabel = [address, city, country].filter(Boolean).join(", ");

  const handleDirections = () => {
    openNavigation({ lat, lng, label: locationLabel || undefined });
  };

  const handleOpenExternal = () => {
    openExternalMaps(lat, lng, locationLabel || undefined);
  };

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
      <div className="flex items-center gap-2">
        <button
          onClick={handleDirections}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-accent text-accent-foreground font-semibold text-sm hover:opacity-90 transition-opacity"
        >
          <Navigation className="h-4 w-4" /> Get Directions
        </button>
        <button
          onClick={handleOpenExternal}
          className="inline-flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm text-muted-foreground hover:opacity-80 transition-opacity"
          style={{ background: "hsl(var(--muted) / 0.15)", border: "1px solid hsl(var(--border) / 0.15)" }}
        >
          <ExternalLink className="h-3.5 w-3.5" /> Open in Maps
        </button>
      </div>
    </div>
  );
};

export default ListingMapSection;
