/**
 * RadarViewPage — Route wrapper for the premium RadarView component.
 * Mounts the full clustering + rich pins + radius + heatmap + ranking radar.
 */
import RadarView from "@/components/radar/RadarView";

export default function RadarViewPage() {
  return (
    <div className="h-[calc(100dvh-72px)] flex flex-col bg-background">
      <RadarView showMap />
    </div>
  );
}
