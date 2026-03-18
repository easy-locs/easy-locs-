import { useEffect, useRef, useState, useCallback } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { supabase } from "@/integrations/supabase/client";
import { createMarkerElement, getMarkerStyle } from "@/lib/map/presence-styles";

const MAPBOX_TOKEN = "pk.eyJ1IjoiZWFzeWxvY3MyMDI2IiwiYSI6ImNtbXZiZ3h0cTF6ZHMycnIyOWw4NnJzZTIifQ.ElIj6bFQK_BpVm6suigHUQ";
const DUBAI_CENTER: [number, number] = [55.2708, 25.2048];

interface MapListing {
  id: string;
  title: string;
  lat: number;
  lng: number;
  presence_mode: string;
  entity_type: string;
  coverage_mode: string;
  coverage_radius_m: number | null;
  category: string;
  price: number;
  currency: string;
}

/** Create a GeoJSON circle polygon from center + radius in meters */
function createCircleGeoJSON(center: [number, number], radiusM: number, points = 64): GeoJSON.Feature {
  const coords: [number, number][] = [];
  const km = radiusM / 1000;
  for (let i = 0; i <= points; i++) {
    const angle = (i / points) * 2 * Math.PI;
    const dx = km * Math.cos(angle);
    const dy = km * Math.sin(angle);
    const lat = center[1] + (dy / 110.574);
    const lng = center[0] + (dx / (111.32 * Math.cos((center[1] * Math.PI) / 180)));
    coords.push([lng, lat]);
  }
  return { type: "Feature", properties: {}, geometry: { type: "Polygon", coordinates: [coords] } };
}

export default function SuperMapRadarPage() {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const [listings, setListings] = useState<MapListing[]>([]);

  // Fetch listings
  useEffect(() => {
    (async () => {
      const { data } = await (supabase as any)
        .from("marketplace_services")
        .select("id, title, lat, lng, anchor_lat, anchor_lng, live_lat, live_lng, presence_mode, entity_type, coverage_mode, coverage_radius_m, category, price, currency")
        .eq("active", true)
        .neq("presence_mode", "off")
        .limit(500);
      if (data) {
        setListings(
          data.map((d: any) => ({
            ...d,
            lat: d.anchor_lat ?? d.live_lat ?? d.lat,
            lng: d.anchor_lng ?? d.live_lng ?? d.lng,
          })).filter((d: any) => d.lat && d.lng)
        );
      }
    })();
  }, []);

  // Init map
  useEffect(() => {
    const container = mapContainerRef.current;
    if (!container || !MAPBOX_TOKEN.startsWith("pk.")) return;
    mapboxgl.accessToken = MAPBOX_TOKEN;
    const map = new mapboxgl.Map({
      container,
      style: "mapbox://styles/mapbox/dark-v11",
      center: DUBAI_CENTER,
      zoom: 12,
    });
    map.on("load", () => map.resize());
    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; };
  }, []);

  // Render markers + coverage circles
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) {
      // Wait for style to load
      const handler = () => renderMarkers();
      map?.on("style.load", handler);
      return () => { map?.off("style.load", handler); };
    }
    renderMarkers();

    function renderMarkers() {
      const map = mapRef.current;
      if (!map) return;

      // Clear old markers
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];

      // Clear old circle layers/sources
      listings.forEach((_, i) => {
        const srcId = `coverage-src-${i}`;
        if (map.getLayer(`coverage-fill-${i}`)) map.removeLayer(`coverage-fill-${i}`);
        if (map.getLayer(`coverage-border-${i}`)) map.removeLayer(`coverage-border-${i}`);
        if (map.getSource(srcId)) map.removeSource(srcId);
      });

      listings.forEach((listing, i) => {
        const el = createMarkerElement(listing.presence_mode, listing.entity_type);
        const style = getMarkerStyle(listing.presence_mode, listing.entity_type);

        const marker = new mapboxgl.Marker({ element: el })
          .setLngLat([listing.lng, listing.lat])
          .setPopup(
            new mapboxgl.Popup({ offset: 20, closeButton: false }).setHTML(`
              <div style="padding:8px;max-width:220px;font-family:system-ui;">
                <div style="font-size:11px;color:${style.color};font-weight:700;margin-bottom:2px;">
                  ${style.label}
                  ${listing.coverage_mode !== "point" && listing.coverage_radius_m
                    ? `<span style="opacity:0.7;font-weight:400;"> · ${listing.coverage_radius_m >= 1000 ? `${listing.coverage_radius_m / 1000}km` : `${listing.coverage_radius_m}m`} radius</span>`
                    : ""}
                </div>
                <div style="font-size:13px;font-weight:600;color:#fff;">${listing.title}</div>
                <div style="font-size:12px;color:#94a3b8;margin-top:2px;">
                  ${listing.price} ${listing.currency} · ${listing.category}
                </div>
              </div>
            `)
          )
          .addTo(map);
        markersRef.current.push(marker);

        // Draw coverage circle if radius mode
        if (listing.coverage_mode !== "point" && listing.coverage_radius_m && listing.coverage_radius_m > 0) {
          const srcId = `coverage-src-${i}`;
          const circle = createCircleGeoJSON([listing.lng, listing.lat], listing.coverage_radius_m);

          map.addSource(srcId, { type: "geojson", data: circle as any });

          map.addLayer({
            id: `coverage-fill-${i}`,
            type: "fill",
            source: srcId,
            paint: {
              "fill-color": style.color,
              "fill-opacity": listing.coverage_mode === "live_radius" ? 0.12 : 0.08,
            },
          });

          map.addLayer({
            id: `coverage-border-${i}`,
            type: "line",
            source: srcId,
            paint: {
              "line-color": style.color,
              "line-width": listing.coverage_mode === "live_radius" ? 2 : 1.5,
              "line-opacity": 0.5,
              "line-dasharray": listing.coverage_mode === "live_radius" ? [2, 2] : [1, 0],
            },
          });
        }
      });
    }
  }, [listings]);

  return (
    <div style={{ width: "100%", height: "100vh", background: "hsl(var(--background))", position: "relative" }}>
      <div ref={mapContainerRef} style={{ width: "100%", height: "100%" }} />

      {/* Legend */}
      <div
        style={{
          position: "absolute",
          bottom: 80,
          left: 12,
          background: "rgba(9,16,32,0.92)",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 12,
          padding: "10px 14px",
          display: "flex",
          flexDirection: "column",
          gap: 6,
          zIndex: 10,
        }}
      >
        <span style={{ fontSize: 10, color: "#94a3b8", fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>
          Legend
        </span>
        {([
          ["#D4A853", "Fixed Store"],
          ["#fbbf24", "Mobile Seller"],
          ["#a78bfa", "Mobile Service"],
          ["#34d399", "Driver"],
        ] as [string, string][]).map(([color, label]) => (
          <div key={label} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ width: 10, height: 10, borderRadius: "50%", background: color, border: `1.5px solid ${color}`, display: "inline-block" }} />
            <span style={{ fontSize: 11, color: "#e2e8f0" }}>{label}</span>
          </div>
        ))}
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: 4, marginTop: 2 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ width: 14, height: 14, borderRadius: "50%", border: "1.5px solid #38bdf844", background: "#38bdf811", display: "inline-block" }} />
            <span style={{ fontSize: 10, color: "#94a3b8" }}>Coverage radius</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 3 }}>
            <span style={{ width: 14, height: 14, borderRadius: "50%", border: "1.5px dashed #a78bfa66", background: "#a78bfa11", display: "inline-block" }} />
            <span style={{ fontSize: 10, color: "#94a3b8" }}>Live radius</span>
          </div>
        </div>
      </div>
    </div>
  );
}
