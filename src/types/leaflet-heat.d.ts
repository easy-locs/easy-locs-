// Type declaration for leaflet.heat plugin
import "leaflet";

declare module "leaflet" {
  function heatLayer(
    latlngs: Array<[number, number, number]>,
    options?: {
      radius?: number;
      blur?: number;
      maxZoom?: number;
      gradient?: Record<number, string>;
      minOpacity?: number;
      max?: number;
    }
  ): Layer;
}
