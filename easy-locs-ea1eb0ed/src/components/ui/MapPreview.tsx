import { MapPin } from "lucide-react";

interface MapPreviewProps {
  lat: number;
  lng: number;
  className?: string;
  zoom?: number;
}

/**
 * Lightweight map preview using OpenStreetMap static tiles.
 * No API key needed.
 */
const MapPreview = ({ lat, lng, className = "", zoom = 15 }: MapPreviewProps) => {
  const tileUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${lng - 0.005},${lat - 0.003},${lng + 0.005},${lat + 0.003}&layer=mapnik&marker=${lat},${lng}`;

  return (
    <div className={`relative rounded-xl overflow-hidden border border-border bg-muted ${className}`}>
      <iframe
        src={tileUrl}
        className="w-full h-full border-0"
        title="Map preview"
        loading="lazy"
        style={{ minHeight: 180 }}
      />
      <div className="absolute bottom-2 right-2 bg-card/90 backdrop-blur-sm text-[10px] text-muted-foreground px-2 py-1 rounded-md flex items-center gap-1">
        <MapPin className="h-3 w-3" />
        {lat.toFixed(5)}, {lng.toFixed(5)}
      </div>
    </div>
  );
};

export default MapPreview;
