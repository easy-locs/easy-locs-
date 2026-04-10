/**
 * Easy-Locs premium radius/coverage paint styles for Mapbox layers.
 */
import { getMarkerVisual } from "./easy-locs-markers";

export function getEasyLocsRadiusPaint(
  presence: string,
  entityType: string,
  coverageMode: string
) {
  const { color } = getMarkerVisual(presence, entityType);
  const isLive = coverageMode === "live_radius";

  return {
    fill: {
      "fill-color": color,
      "fill-opacity": isLive ? 0.12 : 0.06,
    },
    border: {
      "line-color": color,
      "line-width": isLive ? 2 : 1.2,
      "line-opacity": isLive ? 0.4 : 0.25,
      "line-dasharray": isLive ? [3, 3] : [1, 0],
    },
  };
}
