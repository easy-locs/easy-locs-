import { useEffect } from "react";
import { useRadarGeo } from "@/hooks/useRadarGeo";
import { useRadarStore } from "@/stores/radarStore";
import { RadarLocateButton } from "@/components/radar/RadarLocateButton";
import { RadarFilterMenu } from "@/components/radar/RadarFilterMenu";
import { RadarResultsList } from "@/components/radar/RadarResultsList";
import { RadarUserPulse } from "@/components/radar/RadarUserPulse";
import type { RadarPoint } from "@/lib/radar/types";
import "@/styles/radar-pro.css";

const MOCK_POINTS: RadarPoint[] = [
  { id: "1", title: "Pizza Times Marina", category: "food", subcategory: "pizza", lat: 25.2048, lng: 55.2708, rating: 4.8, isSponsored: true },
  { id: "2", title: "Quick Repair JLT", category: "services", subcategory: "repair", lat: 25.2052, lng: 55.2713, rating: 4.5 },
  { id: "3", title: "Fresh Market", category: "grocery", subcategory: "market", lat: 25.206, lng: 55.272, rating: 4.6 },
];

export default function RadarPage() {
  useRadarGeo();

  const userLocation = useRadarStore((s) => s.userLocation);
  const setPoints = useRadarStore((s) => s.setPoints);
  const setSortMode = useRadarStore((s) => s.setSortMode);
  const sortMode = useRadarStore((s) => s.sortMode);
  const mapMode = useRadarStore((s) => s.mapMode);
  const setMapMode = useRadarStore((s) => s.setMapMode);

  useEffect(() => {
    setPoints(MOCK_POINTS);
  }, [setPoints]);

  const handleLocate = () => {
    if (!userLocation) return;
    console.log("[Radar] recenter on", userLocation);
  };

  const SORT_MODES = [
    { key: "nearest" as const, label: "Nearest" },
    { key: "best" as const, label: "Best rated" },
    { key: "trending" as const, label: "Trending" },
  ];

  return (
    <div className="min-h-[100dvh] bg-background pb-24">
      <RadarFilterMenu />

      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-6 pb-3">
        <div>
          <h1 className="text-lg font-bold text-foreground">Radar</h1>
          <p className="text-xs text-muted-foreground">Discover everything nearby</p>
        </div>
        <RadarLocateButton onLocate={handleLocate} />
      </div>

      {/* Sort pills */}
      <div className="flex gap-2 px-4 pb-3 overflow-x-auto no-scrollbar">
        {SORT_MODES.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setSortMode(key)}
            className={`rounded-2xl px-4 py-2 text-sm whitespace-nowrap transition-colors ${
              sortMode === key
                ? "bg-primary/20 text-primary font-medium"
                : "bg-muted/40 text-muted-foreground"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* View toggle */}
      <div className="flex items-center justify-between px-4 pb-3">
        <div className="flex rounded-xl bg-muted/30 p-1">
          <button
            onClick={() => setMapMode("list")}
            className={`rounded-lg px-4 py-2 text-sm transition-colors ${mapMode === "list" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}
          >
            ☰
          </button>
          <button
            onClick={() => setMapMode("map")}
            className={`rounded-lg px-4 py-2 text-sm transition-colors ${mapMode === "map" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}
          >
            📍
          </button>
        </div>
      </div>

      {/* Content */}
      {mapMode === "map" ? (
        <div className="relative mx-4 h-[320px] rounded-2xl bg-muted/20 border border-border/20 overflow-hidden flex items-center justify-center">
          <div className="relative w-[200px] h-[200px] rounded-full border border-primary/10">
            <RadarUserPulse />
          </div>
          {userLocation ? (
            <p className="absolute bottom-3 left-1/2 -translate-x-1/2 text-[10px] text-muted-foreground">
              {userLocation.lat.toFixed(5)}, {userLocation.lng.toFixed(5)}
            </p>
          ) : (
            <p className="absolute bottom-3 left-1/2 -translate-x-1/2 text-[10px] text-muted-foreground animate-pulse">
              Locating…
            </p>
          )}
        </div>
      ) : (
        <div className="px-4">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Results nearby
          </p>
          <RadarResultsList />
        </div>
      )}
    </div>
  );
}
