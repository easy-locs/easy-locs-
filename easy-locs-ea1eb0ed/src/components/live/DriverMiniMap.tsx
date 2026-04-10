type DriverMiniMapProps = {
  lat?: number;
  lng?: number;
};

export function DriverMiniMap({ lat, lng }: DriverMiniMapProps) {
  return (
    <div className="rounded-2xl border border-border/20 bg-muted/30 h-40 flex items-center justify-center text-xs text-muted-foreground">
      {lat && lng
        ? `Driver at ${lat.toFixed(4)}, ${lng.toFixed(4)}`
        : "Waiting GPS..."}
    </div>
  );
}
