/**
 * GeoDebugPanel — Floating debug overlay showing geo state.
 * Only visible when ?geo_debug=1 is in URL or __GEO_DEBUG is set.
 */
import { useEffect, useState } from "react";
import { useGeoStore } from "@/lib/geo/geo-store";
import { useLocationStore } from "@/stores/locationStore";

export function GeoDebugPanel() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const show =
      new URLSearchParams(window.location.search).get("geo_debug") === "1" ||
      (window as any).__GEO_DEBUG === true;
    setVisible(show);
  }, []);

  const point = useGeoStore((s) => s.point);
  const source = useGeoStore((s) => s.source);
  const permission = useGeoStore((s) => s.permission);
  const tracking = useGeoStore((s) => s.tracking);
  const loading = useGeoStore((s) => s.loading);
  const error = useGeoStore((s) => s.error);
  const city = useGeoStore((s) => s.city);
  const country = useGeoStore((s) => s.country);
  const lastUpdated = useGeoStore((s) => s.lastUpdated);
  const locCurrent = useLocationStore((s) => s.currentLocation);
  const locPermission = useLocationStore((s) => s.permissionState);

  if (!visible) return null;

  const ts = lastUpdated ? new Date(lastUpdated).toLocaleTimeString() : "—";
  const gpsTs = point?.timestamp ? new Date(point.timestamp).toLocaleTimeString() : "—";

  return (
    <div
      style={{
        position: "fixed",
        bottom: 80,
        right: 12,
        zIndex: 99999,
        background: "rgba(0,0,0,0.88)",
        color: "#0f0",
        fontFamily: "monospace",
        fontSize: 11,
        padding: "8px 10px",
        borderRadius: 8,
        maxWidth: 280,
        pointerEvents: "none",
        lineHeight: 1.5,
      }}
    >
      <div style={{ fontWeight: "bold", marginBottom: 4, color: "#0ff" }}>🛰 GEO DEBUG</div>
      <div>lat: {point?.lat?.toFixed(6) ?? "null"}</div>
      <div>lng: {point?.lng?.toFixed(6) ?? "null"}</div>
      <div>accuracy: {point?.accuracy?.toFixed(0) ?? "null"}m</div>
      <div>source: <span style={{ color: source === "gps" ? "#0f0" : source === "ip" ? "#ff0" : "#f66" }}>{source}</span></div>
      <div>permission: {permission}</div>
      <div>tracking: {tracking ? "✅" : "❌"} | loading: {loading ? "⏳" : "—"}</div>
      <div>city: {city ?? "?"} | country: {country ?? "?"}</div>
      <div>gps ts: {gpsTs}</div>
      <div>store ts: {ts}</div>
      {error && <div style={{ color: "#f66" }}>err: {error}</div>}
      <div style={{ borderTop: "1px solid #333", marginTop: 4, paddingTop: 4, color: "#aaa" }}>
        locStore: {locCurrent ? `${locCurrent.lat.toFixed(4)},${locCurrent.lng.toFixed(4)}` : "null"} | perm: {locPermission}
      </div>
    </div>
  );
}
