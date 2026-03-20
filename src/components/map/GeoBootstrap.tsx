import { useEffect } from "react";
import { useGeoStore } from "@/stores/geoStore";

export function GeoBootstrap() {
  const refreshCurrentPosition = useGeoStore((s) => s.refreshCurrentPosition);

  useEffect(() => {
    void refreshCurrentPosition();
  }, [refreshCurrentPosition]);

  return null;
}
