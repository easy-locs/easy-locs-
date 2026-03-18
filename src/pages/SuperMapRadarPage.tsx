import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

const MAPBOX_TOKEN = "pk.eyJ1IjoiZWFzeWxvY3MyMDI2IiwiYSI6ImNtbXY3bHNoejI1dm8ycHIwcXphMDdldzUifQ.UjnKONHwh2Tc-MrmHQGk2Q";

const DUBAI_CENTER: [number, number] = [55.2708, 25.2048];

export default function SuperMapRadarPage() {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);

  useEffect(() => {
    console.log("[super-map] page mounted");
    const container = mapContainerRef.current;
    if (!container) {
      console.error("[super-map] missing container");
      return;
    }
    if (!MAPBOX_TOKEN) {
      console.error("[super-map] missing Mapbox token");
      return;
    }

    mapboxgl.accessToken = MAPBOX_TOKEN;

    const map = new mapboxgl.Map({
      container,
      style: "mapbox://styles/mapbox/streets-v11",
      center: DUBAI_CENTER,
      zoom: 12,
    });

    map.on("load", () => {
      console.log("[super-map] map load fired");
      map.resize();
    });

    map.on("error", (e) => {
      console.error("[super-map] map error", e);
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  return (
    <div style={{ width: "100%", height: "100vh", background: "#0b1220" }}>
      <div
        ref={mapContainerRef}
        style={{ width: "100%", height: "100%" }}
      />
    </div>
  );
}
