/**
 * MapTabPage — Map tab entry point. Uses ExplorerMap as single source of truth.
 */
import ExplorerMap from "@/components/map/ExplorerMap";

export default function MapTabPage() {
  return (
    <div className="relative w-full h-full">
      <ExplorerMap />
    </div>
  );
}
