import React, { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || "pk.eyJ1IjoiZWFzeWxvY3MyMDI2IiwiYSI6ImNtbXY0em5lYTJpaHQycHF0c3hrMGh4eHkifQ.y2GKHz1tZ_ZA6sFrEAvz7w";
const DUBAI_CENTER: [number, number] = [55.2708, 25.2048];

export default function SuperMapRadarPage() {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);

  console.log("[super-map] token", import.meta.env.VITE_MAPBOX_TOKEN);

  useEffect(() => {
    console.log("[super-map] page mounted");

    const container = mapContainerRef.current;
    console.log("[super-map] initMap called");
    console.log("[super-map] container", container);
    console.log("[super-map] size", container?.offsetWidth, container?.offsetHeight);

    if (!container) {
      console.error("[super-map] missing container");
      return;
    }

    if (!MAPBOX_TOKEN) {
      console.error("[super-map] missing token");
      return;
    }

    mapboxgl.accessToken = MAPBOX_TOKEN;
    console.log("[super-map] accessToken", mapboxgl.accessToken);

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

    const resizeTimer = window.setTimeout(() => {
      console.log("[super-map] delayed size", container.offsetWidth, container.offsetHeight);
      map.resize();
    }, 250);

    return () => {
      window.clearTimeout(resizeTimer);
      map.remove();
      mapRef.current = null;
    };
  }, []);

  return (
    <div className="relative h-screen w-full bg-background">
      <div
        ref={mapContainerRef}
        className="h-full w-full"
        aria-label="Super map container"
      />
    </div>
  );
}
