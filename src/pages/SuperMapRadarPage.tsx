import { useEffect, useRef, useState } from "react";
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
  mobility_type: string;
  category: string;
  price: number;
  currency: string;
}

export default function SuperMapRadarPage() {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const [listings, setListings] = useState<MapListing[]>([]);

  // Fetch listings with coordinates
  useEffect(() => {
    (async () => {
      const { data } = await (supabase as any)
        .from("marketplace_services")
        .select("id, title, lat, lng, presence_mode, mobility_type, category, price, currency")
        .eq("active", true)
        .not("lat", "is", null)
        .not("lng", "is", null)
        .limit(500);
      if (data) setListings(data);
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

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Render markers when listings change
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Clear old markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    listings.forEach((listing) => {
      const el = createMarkerElement(listing.presence_mode, listing.mobility_type);
      const style = getMarkerStyle(listing.presence_mode, listing.mobility_type);

      const marker = new mapboxgl.Marker({ element: el })
        .setLngLat([listing.lng, listing.lat])
        .setPopup(
          new mapboxgl.Popup({ offset: 20, closeButton: false }).setHTML(`
            <div style="padding:8px;max-width:200px;font-family:system-ui;">
              <div style="font-size:11px;color:${style.color};font-weight:700;margin-bottom:2px;">
                ${style.emoji} ${style.label}
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
    });
  }, [listings]);

  return (
    <div style={{ width: "100%", height: "100vh", background: "hsl(var(--background))" }}>
      <div ref={mapContainerRef} style={{ width: "100%", height: "100%" }} />
      {/* Legend */}
      <div
        style={{
          position: "absolute",
          bottom: 80,
          left: 12,
          background: "rgba(9,16,32,0.9)",
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
          ["🏪", "#38bdf8", "Fixed Store (Pin)"],
          ["🛒", "#fbbf24", "Mobile Seller (Orbit)"],
          ["🔧", "#a78bfa", "Mobile Service (Orbit)"],
          ["🚗", "#34d399", "Driver (Orbit)"],
        ] as [string, string, string][]).map(([emoji, color, label]) => (
          <div key={label} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 14 }}>{emoji}</span>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: color, display: "inline-block" }} />
            <span style={{ fontSize: 11, color: "#e2e8f0" }}>{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
